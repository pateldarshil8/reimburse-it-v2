import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const ISSUER = "ReimburseIt";
const BACKUP_CODE_COUNT = 8;

// Defaults (30s step, 6 digits, SHA-1, Base32 secret) match what every
// mainstream authenticator app (Google Authenticator, Authy, 1Password,
// etc.) expects -- deliberately not customized, since a nonstandard
// step/digit count would make the QR code incompatible with most apps.

export function generateMfaSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: email, secret });
}

export async function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

// epochTolerance: 30 accepts the previous and next 30s step too, to absorb
// clock drift between the server and the user's phone -- the same
// tolerance window every mainstream TOTP implementation uses by default.
export async function verifyTotpCode(code: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token: code.trim(), epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}

export function encryptMfaSecret(secret: string): string {
  return encryptSecret(secret);
}

export function decryptMfaSecret(encrypted: string): string {
  return decryptSecret(encrypted);
}

// Backup codes: human-typeable (XXXXX-XXXXX, uppercase hex), generated once
// at enrollment and shown exactly once. Returns the plaintext codes (to
// display) -- callers must hash each with hashBackupCode() before
// persisting and must never log or store the plaintext return value.
export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export async function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(normalizeBackupCode(code), 10);
}

export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalizeBackupCode(code), hash);
}

function normalizeBackupCode(code: string): string {
  return code.trim().toUpperCase();
}
