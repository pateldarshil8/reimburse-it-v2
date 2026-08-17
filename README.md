# ReimburseIt

Expense reimbursement tracker built for the CDF SDE Hackathon. Employees
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

## Features implemented

- [x] Role-based accounts and routing: `employee`, `reviewer`, `admin`
- [x] Credentials-based auth (Auth.js), backend-enforced role checks
- [x] Full data model covering requests, review actions/history,
      notifications, and admin/account audit history
- [x] Private Supabase Storage bucket for receipt files
- [x] Requester: create/edit/submit a reimbursement request, with a "receipt
      required to submit" rule enforced server-side and real file upload to
      Supabase Storage
- [x] Requester: own request list with status badges, per-user financial
      summary, and a detail/history view (signed-URL receipt access)
- [x] Reviewer: submitted-request queue with search/filter (status,
      category, requester, date range, amount range, keyword) and sort,
      approve / reject (required reason) / mark-paid, backend RBAC (a
      reviewer can never act on their own request; drafts are never visible
      to reviewers)
- [x] Dashboard financial totals (pending count, total requested/pending/
      approved/paid), shown on both the employee and reviewer dashboards
- [x] Server-side pagination on the reviewer queue, admin user list, and all
      list API endpoints
- [x] Admin: user list with search/role filter, role changes, activate/
      deactivate, every change recorded in an audit trail and shown in a
      "Recent account activity" panel; an admin can't change their own role
      or deactivate themselves
- [x] Notifications: written on every status transition, in-app list with
      unread-count badge, mark single / mark all as read
- [x] `GET /api/requests`, `GET /api/requests/:id`, `GET /api/users`,
      `GET /api/notifications` — paginated/filterable/sortable Route
      Handlers with a consistent response envelope and 401/403/404/500
      error handling; documented in `docs/openapi.yaml`
- [x] "Waiting N days" indicator on submitted requests in the reviewer queue
      and detail view

## Tech stack

- **Frontend + backend:** Next.js 16 (App Router, TypeScript) — Server
  Components, Server Actions, and Route Handlers under `src/app` act as the
  backend
- **Styling:** Tailwind CSS + a hand-built shadcn/ui-style component library
  (`src/components/ui`)
- **ORM:** Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg` driver
  adapter — Prisma 7 no longer reads `DATABASE_URL` from the schema file;
  see `prisma.config.ts` and `src/lib/prisma.ts`)
- **Database:** PostgreSQL via Supabase
- **File storage:** Supabase Storage, private bucket, signed URLs for
  receipt access
- **Auth:** Auth.js (Credentials provider), JWT sessions, roles: `employee` /
  `reviewer` / `admin`
- **Deployment:** Vercel (auto-deploys on push to `main`)

## Setup

1. Install dependencies (this also runs `prisma generate` via `postinstall`):
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — pooled Supabase connection string (port 6543,
     `?pgbouncer=true`), used by the app at runtime
   - `DIRECT_URL` — direct Supabase connection string (port 5432), used by
     the CLI for `db push` (falls back to `DATABASE_URL` if unset)
   - `AUTH_SECRET` — generate with `npx auth secret`
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Project
     Settings → API; the service role key is server-only, never expose it
     to the client
3. Push the schema:
   ```bash
   npm run db:push
   ```
4. Seed demonstration data:
   ```bash
   npm run db:seed
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```

## Demo credentials

All seeded accounts use the password `password123`.

| Role     | Name            | Email                     |
| -------- | --------------- | -------------------------- |
| employee | James Turner    | james.turner@gmail.com     |
| employee | Emma Washington | emma.washington@gmail.com  |
| reviewer | Liza White      | liza.white@gmail.com       |
| admin    | Adam Brown      | adam.brown@gmail.com       |

New users can also request an account from the login page ("Create account").
Requests land in the admin's "Account Requests" tab for approval; an approved
request becomes an active `employee`-role account.

## API documentation

Read endpoints are documented as OpenAPI 3.0 in `docs/openapi.yaml` (view it
with any Swagger/OpenAPI viewer, or paste it into https://editor.swagger.io).
Mutations (create/submit/approve/reject/mark-paid, admin role/status
changes) are Next.js Server Actions rather than REST endpoints -- see
`planning/planning.md` for why.

## Data model

- **User** — id, name, email, passwordHash, role (`employee`/`reviewer`/
  `admin`), accountStatus (`active`/`inactive`), createdAt
- **ExpenseRequest** — id, submitterId, title, category, expenseDate,
  description, totalAmount, currency, receipt file reference
  (name/type/storage path), status, createdAt, updatedAt
  - Status flow: `draft → submitted → approved | rejected → paid`
- **ReviewAction** (audit trail) — id, requestId, reviewerId, action,
  comment, previousStatus, newStatus, createdAt
- **Notification** — id, userId, requestId, message, readAt, createdAt
- **UserAudit** — id, targetId, actorId, action, detail, createdAt (admin
  role/account status changes)

Full schema: `prisma/schema.prisma`.

## Known limitations (Day 4)

- No automated test suite yet — `prisma generate` can't run in the sandboxed
  environment this was developed in, so local test-and-iterate wasn't
  practical; verification has relied on manual checks against the live
  deployment. A documented manual testing pass is still outstanding (Day 5).
- No resubmission-after-rejection flow — a rejected request is currently
  terminal.
- No line-item breakdown — single `totalAmount` field per request.
- Minimal auth — Credentials provider, no password reset/email verification
  (matches the brief's own "preconfigured demonstration accounts" guidance).
- No self-service signup — accounts are created via `db:seed` or directly in
  the database; only role/status management is exposed to admins.

## Future improvements

Tracked in `planning/planning.md` under "What I'll Cut If Time Is Short".
