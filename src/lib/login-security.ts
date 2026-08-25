import { prisma } from "@/lib/prisma";

// --- Lockout policy (see SECURITY_CASE_STUDY.md for the rationale) ---
// Per-account: 5 failed factor checks (wrong password OR wrong MFA code)
// within any window locks the account for 15 minutes. Counting MFA
// failures the same as password failures matters -- otherwise MFA becomes
// an unlimited-attempts PIN pad for an attacker who already has a stolen
// password.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

// Per-IP: a coarser, independent throttle. This exists because per-account
// lockout does nothing to stop credential stuffing spread across many
// different email addresses from one source, and does nothing for guesses
// against emails that don't exist (no User row to attach a counter to).
export const IP_WINDOW_MINUTES = 15;
export const IP_MAX_FAILURES = 20;

// Password-reset requests are cheap to spam (no password required to
// trigger one) and could be used to flood a victim's inbox or probe which
// emails exist by timing. Same soft-limit idea as login, but the caller
// (src/app/forgot-password/actions.ts) always returns the same generic
// response regardless of whether this trips -- the limit just silently
// stops sending more email, it never changes what the user sees.
export const RESET_REQUEST_IP_WINDOW_MINUTES = 15;
export const RESET_REQUEST_IP_MAX = 5;

export async function isPasswordResetIpThrottled(ip: string | null): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const since = new Date(Date.now() - RESET_REQUEST_IP_WINDOW_MINUTES * 60 * 1000);
  const count = await prisma.authAudit.count({
    where: { ip, createdAt: { gte: since }, event: "password_reset_requested" },
  });
  return count >= RESET_REQUEST_IP_MAX;
}

export type LockoutCheck =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number };

export function checkAccountLockout(lockedUntil: Date | null): LockoutCheck {
  if (!lockedUntil || lockedUntil.getTime() <= Date.now()) {
    return { locked: false };
  }
  return {
    locked: true,
    retryAfterSeconds: Math.ceil((lockedUntil.getTime() - Date.now()) / 1000),
  };
}

// Returns the User row's updated lockout state after recording one failure,
// without the caller needing to re-read-then-write (avoids a TOCTOU gap
// under concurrent login attempts against the same account).
export async function recordFailedAttempt(userId: string): Promise<{ lockedNow: boolean }> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
    select: { failedLoginAttempts: true },
  });

  if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
      },
    });
    return { lockedNow: true };
  }
  return { lockedNow: false };
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

// Coarse IP throttle, checked before doing any per-account work so an
// attacker can't burn through the account-level threshold across many
// accounts to map which emails exist. Deliberately generic ("too many
// attempts, try again later") -- it never confirms or denies anything
// about a specific account.
export async function isIpThrottled(ip: string | null): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const since = new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000);
  const count = await prisma.authAudit.count({
    where: {
      ip,
      createdAt: { gte: since },
      event: { in: ["login_failure", "mfa_failure"] },
    },
  });
  return count >= IP_MAX_FAILURES;
}
