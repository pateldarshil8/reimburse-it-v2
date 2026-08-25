import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig, type AppRole } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import {
  checkAccountLockout,
  isIpThrottled,
  recordFailedAttempt,
  resetFailedAttempts,
} from "@/lib/login-security";
import { logAuthEvent } from "@/lib/auth-audit";
import { decryptMfaSecret, verifyTotpCode, verifyBackupCode } from "@/lib/mfa";

// Distinct CredentialsSignin subclasses so loginAction (src/app/login/actions.ts)
// can show a specific, safe message for each case via the `code` field --
// never the framework's generic error, which would either be too vague
// ("account_deactivated" needs its own copy) or risk being too specific.
export class AccountDeactivatedError extends CredentialsSignin {
  code = "account_deactivated";
}
export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}
export class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
}
// Thrown when the password is correct but the account has MFA enabled and
// no code was submitted yet -- NOT a failure, this is the expected
// mid-flow signal that tells loginAction to render the code step. It must
// never be counted against the lockout threshold or logged as a failure.
export class MfaRequiredError extends CredentialsSignin {
  code = "mfa_required";
}
export class InvalidMfaCodeError extends CredentialsSignin {
  code = "invalid_mfa_code";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Tightened from Auth.js's 30-day default: this app has an admin role
  // that can deactivate or delete accounts, and while the session callback
  // below re-checks role/status on every request (so a stale JWT degrades
  // safely rather than granting stale access), a long-lived token is still
  // more window for a stolen token to be replayed. 8 hours balances that
  // against not forcing re-logins mid-workday; updateAge refreshes the
  // token's expiry on activity rather than forcing a hard cutoff.
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Authentication code", type: "text" },
        // Populated by loginAction from next/headers, not user input --
        // see src/lib/request-context.ts for why this goes through the
        // credentials payload rather than the second `authorize(_, request)`
        // argument (unreliable when signIn() is invoked from a Server
        // Action rather than a direct HTTP round-trip).
        ip: { label: "ip", type: "text" },
        userAgent: { label: "userAgent", type: "text" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        const code = (credentials?.code as string | undefined)?.trim() || undefined;
        const ip = (credentials?.ip as string | undefined) || "unknown";
        const userAgent = (credentials?.userAgent as string | undefined) || "unknown";

        if (!email || !password) return null;

        // 1. Coarse IP throttle, checked before any per-account work --
        // see src/lib/login-security.ts for why this has to be independent
        // of the per-account lockout below.
        if (await isIpThrottled(ip)) {
          await logAuthEvent({
            event: "login_failure",
            email,
            ip,
            userAgent,
            detail: "ip_throttled",
          });
          throw new TooManyAttemptsError();
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // No account -- log for IP-throttle purposes, but never create a
          // per-account counter for an email that doesn't exist.
          await logAuthEvent({
            event: "login_failure",
            email,
            ip,
            userAgent,
            detail: "unknown_email",
          });
          return null;
        }

        // 2. Per-account lockout, checked before the password comparison
        // so a locked account can't be distinguished from a live one by
        // response timing/behavior.
        const lockout = checkAccountLockout(user.lockedUntil);
        if (lockout.locked) {
          await logAuthEvent({
            event: "login_locked_out",
            userId: user.id,
            email,
            ip,
            userAgent,
          });
          throw new AccountLockedError();
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          const { lockedNow } = await recordFailedAttempt(user.id);
          await logAuthEvent({
            event: lockedNow ? "account_locked" : "login_failure",
            userId: user.id,
            email,
            ip,
            userAgent,
          });
          return null;
        }

        // Deactivated accounts (admin-managed, see /admin) can't sign in,
        // even with a correct password -- checked only after the password
        // is confirmed correct, so a wrong-password guess never reveals
        // whether a given account exists/is deactivated. Not counted
        // against the lockout threshold: the password was right, this is a
        // different, non-attacker-controllable failure mode.
        if (user.accountStatus !== "active") {
          await logAuthEvent({
            event: "login_failure",
            userId: user.id,
            email,
            ip,
            userAgent,
            detail: "deactivated",
          });
          throw new AccountDeactivatedError();
        }

        // 3. MFA, if enrolled.
        if (user.mfaEnabled) {
          if (!code) {
            // Password confirmed correct; stop here and let loginAction
            // render the code step. Not a failure -- no counters touched,
            // nothing logged as failed.
            throw new MfaRequiredError();
          }

          let mfaOk = false;
          let usedBackupCode = false;

          if (user.mfaSecretEncrypted) {
            const secret = decryptMfaSecret(user.mfaSecretEncrypted);
            mfaOk = await verifyTotpCode(code, secret);
          }

          if (!mfaOk) {
            const unusedBackupCodes = await prisma.mfaBackupCode.findMany({
              where: { userId: user.id, usedAt: null },
            });
            for (const backupCode of unusedBackupCodes) {
              if (await verifyBackupCode(code, backupCode.codeHash)) {
                mfaOk = true;
                usedBackupCode = true;
                await prisma.mfaBackupCode.update({
                  where: { id: backupCode.id },
                  data: { usedAt: new Date() },
                });
                break;
              }
            }
          }

          if (!mfaOk) {
            const { lockedNow } = await recordFailedAttempt(user.id);
            await logAuthEvent({
              event: lockedNow ? "account_locked" : "mfa_failure",
              userId: user.id,
              email,
              ip,
              userAgent,
            });
            throw new InvalidMfaCodeError();
          }

          await logAuthEvent({
            event: "mfa_success",
            userId: user.id,
            email,
            ip,
            userAgent,
            detail: usedBackupCode ? "backup_code" : "totp",
          });
        }

        await resetFailedAttempts(user.id);
        await logAuthEvent({
          event: "login_success",
          userId: user.id,
          email,
          ip,
          userAgent,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Overrides authConfig's edge-compatible session callback with a
    // Node-side version that re-reads the user's current role from the
    // database on every request. Without this, a role change made by an
    // admin wouldn't show up for an already-signed-in user until their next
    // login, because the JWT caches the role from the moment they signed
    // in. The edge middleware (src/proxy.ts) can't do this DB lookup itself
    // (no Prisma/pg at the edge), so role-scoped layouts additionally
    // re-check session.user.role at render time -- see
    // src/app/{employee,reviewer,admin}/layout.tsx.
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as AppRole;
        session.user.id = token.id as string;
        if (token.id) {
          const current = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (current) session.user.role = current.role;
        }
      }
      return session;
    },
  },
});
