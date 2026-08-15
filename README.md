# ReimburseIt

Expense reimbursement tracker built for the CDF SDE Hackathon. Employees will
submit reimbursement requests; reviewers will approve, reject, or mark them
paid; admins will manage user roles and account status.

Built against the official 5-day brief. See `planning/planning.md` for the
plan as written before coding began, and `problem_statement.md` for the full
CDF submission guide this implements.

## Problem overview

Small organizations often track reimbursements through email, chat, paper
receipts, and spreadsheets, which makes it hard to answer three questions:
what's been submitted, what state is it in, and who needs to act next.
ReimburseIt replaces that with one workflow:

**Create → Submit → Review → Approve / Reject → Paid**

## Day 1 status: Foundation

- [x] Next.js 16 (App Router, TypeScript) + Tailwind CSS scaffold
- [x] Full data model: users/roles, expense requests, review actions
      (audit trail), notifications, admin/account audit history
      (`prisma/schema.prisma`)
- [x] Credentials-based auth (Auth.js), sessions carry a role claim
- [x] Role-gated routing for all three roles (`/employee`, `/reviewer`,
      `/admin`), enforced server-side in `src/proxy.ts` +
      `src/auth.config.ts`, not just hidden in the UI
- [x] Supabase Postgres schema pushed; private `receipts` Storage bucket
      provisioned
- [x] Empty role shells deployed to Vercel

Requester, reviewer, and admin areas currently show a placeholder card --
the actual workflows land over the next few days (see `planning/planning.md`
for the day-by-day breakdown).

## Tech stack

- **Frontend + backend:** Next.js 16 (App Router, TypeScript) -- Server
  Components, Server Actions, and Route Handlers under `src/app` act as the
  backend
- **Styling:** Tailwind CSS + a hand-built shadcn/ui-style component library
  (`src/components/ui`)
- **ORM:** Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg` driver
  adapter -- Prisma 7 no longer reads `DATABASE_URL` from the schema file;
  see `prisma.config.ts` and `src/lib/prisma.ts`)
- **Database:** PostgreSQL via Supabase
- **File storage:** Supabase Storage, private bucket, signed URLs (wiring
  lands Day 2)
- **Auth:** Auth.js (Credentials provider), JWT sessions, roles: `employee` /
  `reviewer` / `admin`
- **Deployment:** Vercel (auto-deploys on push to `main`)

## Setup

1. Install dependencies (this also runs `prisma generate` via `postinstall`):
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` -- pooled Supabase connection string (port 6543,
     `?pgbouncer=true`), used by the app at runtime
   - `DIRECT_URL` -- direct Supabase connection string (port 5432), used by
     the CLI for `db push` (falls back to `DATABASE_URL` if unset)
   - `AUTH_SECRET` -- generate with `npx auth secret`
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` -- from Supabase Project
     Settings -> API; the service role key is server-only, never expose it
     to the client
3. Push the schema:
   ```bash
   npm run db:push
   ```
4. Seed demonstration accounts:
   ```bash
   npm run db:seed
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```

## Demo credentials

All seeded accounts use the password `password123`.

| Role     | Email             |
| -------- | ----------------- |
| employee | employee@cdf.org  |
| employee | employee2@cdf.org |
| reviewer | reviewer@cdf.org  |
| admin    | admin@cdf.org     |

## Data model

- **User** -- id, name, email, passwordHash, role (`employee`/`reviewer`/
  `admin`), accountStatus (`active`/`inactive`), createdAt
- **ExpenseRequest** -- id, submitterId, title, category, expenseDate,
  description, totalAmount, currency, receipt file reference
  (name/type/storage path), status, createdAt, updatedAt
  - Status flow: `draft -> submitted -> approved | rejected -> paid`
- **ReviewAction** (audit trail) -- id, requestId, reviewerId, action,
  comment, previousStatus, newStatus, createdAt
- **Notification** -- id, userId, requestId, message, readAt, createdAt
- **UserAudit** -- id, targetId, actorId, action, detail, createdAt (admin
  role/account status changes)

Full schema: `prisma/schema.prisma`.

## Known limitations (Day 1)

- No workflow functionality yet -- request creation, review, dashboard
  totals, filtering, pagination, and admin management land over the
  remaining days (see `planning/planning.md`).
- Real receipt upload is wired up starting Day 2.

## Future improvements

Tracked in `planning/planning.md` under "What I'll Cut If Time Is Short".
