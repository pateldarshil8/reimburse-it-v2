# ReimburseIt Authentication Hardening — Security Case Study

This document is a portfolio case study for an authentication-hardening
pass performed on ReimburseIt, an expense-reimbursement tracker originally
built for the CDF SDE Hackathon (see `README.md`, `planning/planning.md`,
and `docs/architecture.md` for the base application). It is intentionally
kept separate from `docs/`, which is reserved for the four CDF submission
documents (`walkthrough.md`, `architecture.md`, `testing.md`,
`reflection.md`) and shouldn't contain anything else.

Work was done on the `security-hardening` branch, not `main`, and nothing
here was deployed to the production Vercel project or its environment
variables as part of this work -- see "What still needs a decision" at the
end.

---

## Before / after

**Before.** ReimburseIt authenticated users with a single factor
(email + bcrypt-hashed password) via Auth.js Credentials, with correct
backend-enforced role checks and a generic invalid-credentials message that
didn't leak account existence. But there was no upper bound on login
attempts -- `authorize()` would bcrypt-compare against the same account or
IP indefinitely -- no record of authentication events beyond admin-initiated
role/status changes, no second factor, no security response headers at
all, and no way to recover a forgotten password other than an admin
manually intervening. A stolen or guessed password was the entire barrier
between an attacker and an account, and a successful or failed login left
no trace to investigate after the fact.

**After.** Authentication now has five layers instead of one:

1. **A second factor.** TOTP-based MFA, optional per user, enrollable from
   `/account` with a QR code and manual-entry fallback, backed by
   AES-256-GCM–encrypted secrets (not hashed -- TOTP verification needs the
   raw secret back) and one-time bcrypt-hashed backup codes for
   device-loss recovery.
2. **Attempt limits.** Per-account lockout after 5 failed password-or-MFA
   checks (15-minute cooldown), plus an independent per-IP throttle (20
   failures across any accounts in 15 minutes) that catches credential
   stuffing and enumeration against emails that don't even exist -- a
   per-account counter can't do that, since there's no account to attach
   it to.
3. **A durable record.** Every login success, failure, lockout, and MFA
   event is written to a new `AuthAudit` table with timestamp, matched user
   (if any), attempted email, IP, and user agent -- visible to admins under
   Admin → Security. Previously, "was this account's login history ever
   reconstructable" was a hard no.
4. **Self-service recovery.** A password-reset flow using single-use,
   30-minute, SHA-256-hashed tokens delivered by email (or logged to the
   server console if no email provider is configured -- disclosed, not
   hidden, in `README.md`).
5. **Baseline security headers.** CSP, `X-Frame-Options`, HSTS,
   `X-Content-Type-Options`, `Referrer-Policy`, and a restrictive
   `Permissions-Policy`, where previously there were none.

None of this touches the core reimbursement workflow -- it's additive
hardening around the existing, already-correct role-based authorization
model.

---

## NIST SP 800-53 Rev. 5 control mapping

The starting set (IA-2, IA-5, AC-7, AU-2) mostly fits; a few controls are
more precise for specific pieces, added below.

| Control | Name | What maps to it |
|---|---|---|
| **IA-2** | Identification and Authentication (Organizational Users) | Credentials-based login is the baseline identification/authentication mechanism. |
| **IA-2(1)** | ... MFA to Privileged Accounts | Admin and reviewer accounts can enroll MFA; not yet *required* for those roles specifically (see Known limitations) -- currently opt-in for every role equally. |
| **IA-5** | Authenticator Management | Password complexity rules (`src/lib/password.ts`), bcrypt hashing, TOTP secret issuance/encryption, and backup-code issuance are all authenticator lifecycle management. |
| **IA-5(1)** | ... Password-Based Authentication | Specifically the password composition/hashing rules. |
| **IA-6** | Authentication Feedback | Obscuring authentication feedback -- the generic "Invalid email or password" message, and password reset's generic "if an account exists" response, both exist specifically so failed attempts don't reveal which part was wrong. |
| **AC-7** | Unsuccessful Logon Attempts | Per-account lockout after 5 failed factor checks, 15-minute cooldown (`src/lib/login-security.ts`). |
| **AC-7 (extension, not a named sub-control)** | -- | The per-IP throttle is a defense AC-7 doesn't fully cover on its own (AC-7 is scoped to a single account); it's included here as a practical complement. |
| **AU-2** | Event Logging | `AuthAudit` defines the auditable event types (login success/failure/lockout, MFA success/failure/enrollment/disablement, password reset requested/completed). |
| **AU-3** | Content of Audit Records | Each `AuthAudit` row records what happened, when, to which account (if known), and from where (IP/user agent) -- the minimum content AU-3 asks for. |
| **AU-9** | Protection of Audit Information | Partial: `AuthAudit` rows are never exposed to non-admins and are never deleted by any code path in this app, but there's no dedicated append-only/immutable storage or separate audit-log access control beyond "is an admin" -- see Known limitations. |
| **SC-13** | Cryptographic Protection | AES-256-GCM for TOTP secrets at rest, bcrypt for passwords and backup codes, SHA-256 for reset-token verifiers -- three different primitives, each chosen for what it actually needs to do (encrypt-and-recover vs. one-way-verify vs. hash-a-high-entropy-random-value), explained inline in `src/lib/crypto.ts` and `src/lib/password-reset-tokens.ts`. |
| **SC-8** | Transmission Confidentiality and Integrity | HSTS header now sent; TLS itself is provided by Vercel's platform, not application code. |
| **SI-10** | Information Input Validation | Zod schemas validate all authentication-adjacent inputs (password composition, email format, TOTP code presence) server-side, not just in the browser. |

---

## Task 6 — Static findings from reading the code

Findings from re-reading both the original codebase (Task 1) and the new
hardening code added here, before any live scanning:

- **Fixed as part of this work:** no security response headers at all
  (now: CSP/HSTS/X-Frame-Options/etc. in `next.config.ts`); 30-day default
  JWT session with no explicit expiry policy (now: 8-hour `maxAge`, 1-hour
  `updateAge`).
- **Pre-existing, not fixed here, disclosed instead:** the signup flow
  (`src/app/signup/actions.ts`) returns "An account with this email already
  exists" when the email is taken -- a minor account-enumeration vector,
  inconsistent with login and password-reset's deliberately generic
  responses. Left as-is because fixing it changes signup UX (silently
  accepting duplicate signups, or requiring an email-verification step
  before revealing anything) in a way that wasn't part of the requested
  scope; flagged here rather than silently left unmentioned.
- **Rate limiting is Postgres-backed, not in-memory/Redis-backed.** Every
  login attempt runs a `COUNT` query against `AuthAudit` for the IP
  throttle. This is correct and simple, but it means a sustained flood of
  login attempts costs a database round-trip each, before the throttle
  threshold is even reached -- a production deployment expecting real
  attack traffic would want a fast in-memory or Redis-backed limiter (e.g.
  Upstash Ratelimit) in front of this, not instead of it (the audit trail
  should stay in Postgres regardless).
- **IP address is trusted from `x-forwarded-for`** (`src/lib/request-context.ts`).
  This is safe specifically because Vercel's edge network sets/overwrites
  this header itself -- it would NOT be safe on a deployment reachable
  directly by attackers who could forge it themselves. Documented inline;
  flagging again here since it's a common misconfiguration when code like
  this gets copied to a different hosting setup.
- **No CAPTCHA/bot-detection anywhere** (login, signup, forgot-password).
  The rate limiting here slows down scripted abuse but doesn't distinguish
  a human from a low-and-slow bot staying under the thresholds.
- **`npm audit` reports 3 high-severity advisories**, all in `@prisma/config`'s
  transitive dependency `deepmerge-ts` (a stack-exhaustion DoS). This is a
  build/CLI-time dependency, not code that runs in the deployed application
  -- low real-world impact, but worth a version bump when Prisma ships a fix
  upstream.
- **Confirmed fine, not a gap:** no explicit CORS configuration exists,
  which is the *correct* default for a same-origin app with no public API
  consumers (nothing to misconfigure). Auth.js's cookie security defaults
  (Secure/HttpOnly/SameSite, `__Secure-` prefix) are framework-managed and
  auto-detect HTTPS in production; not overridden, and there's no code-level
  way to verify the actual `Set-Cookie` header short of a live request (see
  checklist below).

## Task 6 — Baseline scan checklist (OWASP ZAP / Burp Suite)

**Not run** — per instruction, no live scan against the deployed app
happens without explicit confirmation first. This is what such a scan
should specifically check once authorized, organized by what it's actually
testing for:

**Session & cookies**
- [ ] Session cookie has `Secure`, `HttpOnly`, and `SameSite=Lax` (or
      `Strict`) flags set on the actual production response (can't be
      confirmed by reading code alone -- Auth.js's behavior here depends on
      runtime HTTPS detection).
- [ ] Session token is invalidated/rotated on logout, not just cleared
      client-side.
- [ ] No session fixation: a session established before login isn't reused
      as the authenticated session after login.

**Headers**
- [ ] Confirm the new CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
      Referrer-Policy, and Permissions-Policy headers are actually present
      on live responses (config is now in place; verify it survives the
      Vercel build/CDN layer unmodified).
- [ ] Confirm HSTS is honored (test with `http://` should redirect/upgrade,
      not serve content).

**Authentication & lockout**
- [ ] Automated brute-force attempt against a single test account confirms
      lockout actually triggers at 5 failures and clears after 15 minutes.
- [ ] Distributed attempts (many emails, one IP) confirm the IP throttle
      triggers at 20 failures/15 minutes.
- [ ] Confirm the generic "Invalid email or password" message is
      byte-for-byte identical for a wrong password vs. a nonexistent email
      (timing included -- bcrypt's inherent cost means a nonexistent-email
      path that skips bcrypt entirely could be measurably faster than a
      real-account wrong-password path; worth an explicit timing check).
- [ ] MFA: confirm a code can't be replayed (used twice), and that
      `epochTolerance` isn't wide enough to make old codes usable well
      past 30-60 seconds.
- [ ] Backup codes: confirm each is single-use (can't be redeemed twice).

**Password reset**
- [ ] Confirm a reset token can't be reused after success.
- [ ] Confirm a token expires at 30 minutes, not later.
- [ ] Confirm requesting a reset for a nonexistent email returns the exact
      same response (timing and body) as for a real one.
- [ ] Confirm the reset-request endpoint itself is rate-limited in
      practice (it is, via `isPasswordResetIpThrottled` -- verify live).

**Input handling / injection**
- [ ] SQL injection sweep against every form field (mitigated by Prisma's
      parameterized queries everywhere, but a scanner should confirm this
      rather than take the ORM's word for it).
- [ ] Reflected/stored XSS sweep, particularly on fields rendered back to
      other users (request titles/descriptions, admin audit `detail`
      strings, reviewer comments).
- [ ] CSRF: confirm state-changing requests (Server Actions) reject
      cross-origin submissions -- Next.js enforces an Origin check on
      Server Actions by default; a scanner should verify this holds against
      the actual deployment rather than trusting the framework default.

**Access control**
- [ ] Direct object reference checks: attempt to access another user's
      request detail page, another user's receipt signed-URL path, and
      `/admin`/`/reviewer` as a lower-privileged role, all by manipulated
      URL/ID rather than through the UI.
- [ ] Confirm `/account` MFA-management endpoints reject a request with no
      valid session outright (should already be covered by `requireUser()`
      in `src/app/account/actions.ts`, but a scanner hitting the Server
      Action's underlying endpoint directly is the real test).

---

## Known limitations of this hardening pass (honest, not exhaustive)

- **MFA is opt-in for every role, including admin.** A compromised admin
  account without MFA enrolled is still just a password away. Enforcing
  MFA for admin/reviewer roles specifically would map more directly to
  IA-2(1) but wasn't part of the requested scope.
- **Password reset email delivery has no provider configured in
  production yet.** Until `RESEND_API_KEY`/`EMAIL_FROM` are set (an
  operator decision, not made here -- see below), reset links are logged
  server-side rather than emailed, which is fine for development but is
  not a working reset flow for a real user.
- **Rate limiting is correctness-first, not scale-first** (Postgres-backed,
  not Redis-backed) -- see Task 6 findings above.
- **No CAPTCHA or bot-detection.**
- **The pre-existing signup email-enumeration behavior was not changed**
  (see Task 6 findings) -- flagged, not fixed, since it wasn't in scope.
- **This case study and the code changes it describes have not been
  verified against a live OWASP ZAP / Burp Suite scan** -- per instruction,
  that requires separate confirmation before running.

## What still needs a decision (not done automatically)

- **Database migration.** The new tables/columns (`AuthAudit`,
  `MfaBackupCode`, `PasswordResetToken`, and the new `User` fields) exist
  in `prisma/schema.prisma` on this branch but have **not** been applied to
  the production Supabase database. They're additive and backward-compatible
  (nullable/defaulted, nothing removed), but applying a schema change to the
  same database the live app uses is a production-adjacent action, so it
  wasn't done without asking first.
- **`MFA_ENCRYPTION_KEY`** must be generated and set (in Vercel's
  environment variables, for production) before MFA enrollment can work at
  all -- `src/lib/crypto.ts` throws clearly if it's missing rather than
  silently storing something insecure.
- **`RESEND_API_KEY` / `EMAIL_FROM`** are optional but required for real
  password-reset emails in production; without them the console-log
  fallback is what's active.
- **Merging `security-hardening` into `main`** and deploying it.
