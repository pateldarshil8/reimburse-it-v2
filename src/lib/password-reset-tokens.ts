import { randomBytes, createHash } from "crypto";

export const RESET_TOKEN_TTL_MINUTES = 30;

// The raw token is what goes in the emailed URL; only its SHA-256 hash is
// ever persisted (same rationale as PasswordResetToken's schema comment --
// a DB dump alone must not be enough to reset anyone's password).
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
