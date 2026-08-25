import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "crypto";

// Symmetric encryption for values that must be *recovered*, not just
// verified -- currently only the TOTP MFA secret (src/lib/mfa.ts). This is
// deliberately separate from bcrypt (src/lib/password.ts, used for
// passwords and backup codes), which is one-way by design and wrong for
// this use case: verifying a TOTP code requires the raw secret to
// recompute the current code, so it has to be decryptable, not hashed.
//
// AES-256-GCM: authenticated encryption (a tampered ciphertext fails to
// decrypt rather than silently returning garbage), random IV per value
// (stored alongside the ciphertext, never reused), and the auth tag is
// stored alongside both so tampering with any part is detected on decrypt.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const secret = process.env.MFA_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "MFA_ENCRYPTION_KEY must be set to use MFA (used to encrypt TOTP secrets at rest). " +
        "Generate one with: openssl rand -base64 32"
    );
  }
  // Derive a fixed-length 32-byte key from whatever-length secret is
  // configured, rather than requiring the operator to produce exactly 32
  // raw bytes themselves.
  return scryptSync(secret, "reimburseit-mfa-secret-salt", 32);
}

// Output format: "<iv>:<authTag>:<ciphertext>", each hex-encoded, so it's a
// single opaque string safe to store in one text column.
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted payload.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
