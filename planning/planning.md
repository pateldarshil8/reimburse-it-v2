# Planning Document

> Completed before writing any code, per the submission guide. Compared against
> what was actually built in `docs/architecture.md`.
>
> Note: the `planning.md` template originally included in this repository
> (model selection, detection categories, precision/recall evaluation) appears
> to be from a different CDF hackathon track (a PII-detection challenge) and
> doesn't apply to the Expense & Reimbursement Tracker brief. This document
> replaces it with planning content scoped to the actual assignment.

---

## Tech Stack

**Framework / Language:** Next.js (App Router) with TypeScript, one repo for
both frontend and backend -- Server Components/Actions and Route Handlers
serve as the API layer.

Why: the whole workflow (create -> submit -> review -> approve/reject -> paid)
is CRUD-plus-state-machine over one core entity. A single full-stack framework
avoids the overhead of standing up and deploying a separate backend service
for a 5-day individual project, while Server Actions give the same "backend
enforces authorization" guarantee the brief requires -- they run only on the
server, never in the browser bundle.

**Key libraries:**

- **Prisma 7** (`prisma-client` generator + `@prisma/adapter-pg`) -- typed
  data access over Postgres, migrations, and a single schema file that
  documents the whole data model.
- **Auth.js (NextAuth) v5**, Credentials provider -- session-based auth with
  role claims (`employee` / `reviewer` / `admin`) issued at login and checked
  both in middleware (route gating) and inside Server Actions (mutation
  authorization), satisfying the "backend must enforce this, not just hide
  buttons" requirement.
- **Tailwind CSS + hand-built shadcn/ui-style components** -- shadcn's own CLI
  needs network access this environment didn't have, so the same output was
  recreated by hand (see `docs/architecture.md`).
- **Supabase** -- Postgres (via Prisma) and Storage (private `receipts`
  bucket, service-role key, signed URLs) so file uploads don't require a
  separate object-storage provider.
- **Zod** -- shared validation schemas for request forms, used both
  client-side (fast feedback) and inside Server Actions (the copy that
  actually matters).
- **bcryptjs** -- password hashing for the seeded demo accounts.

---

## User Roles

- **Requester (`employee`)** -- create/edit drafts, submit, view own requests
  and their status/history, see reviewer comments and rejection reasons.
- **Reviewer (`reviewer`)** -- view the submitted queue, open request detail
  + receipt, approve/reject with a comment (reason required on reject), mark
  an approved request as **Paid**, search/filter, see pending-amount totals.
- **Administrator (`admin`)** -- view all users (email, role, account status,
  created date), change a user's role, activate/deactivate accounts, view the
  resulting audit history. Scoped deliberately small: user management only,
  not a general-purpose back office.

A requester can never review or pay their own request -- enforced in the
Server Action, not just hidden in the UI (see `docs/architecture.md`).

---

## Data Model

- **User** -- id, name, email, passwordHash, role, accountStatus, createdAt
- **ExpenseRequest** -- id, submitterId, title, description, category,
  expenseDate, totalAmount, currency, receipt (url/name/type), status,
  createdAt, updatedAt
- **ReviewAction** -- id, requestId, reviewerId (nullable -- null for the
  requester's own submit event), action, comment, previousStatus, newStatus,
  createdAt. Doubles as both the reviewer-decision record and the per-request
  audit trail (requirement 17), so every transition -- not only approve/reject
  -- is logged.
- **Notification** -- id, userId, requestId, message, readAt, createdAt.
  Created on status-change events; requester can view and mark as read.
- **UserAudit** -- id, targetId, actorId, action, detail, createdAt. Records
  admin role changes and activate/deactivate actions.

## Request Statuses

`draft -> submitted -> approved | rejected -> paid`

`Submitted` and `Under Review` are combined into a single `submitted` state
(explicitly allowed by the brief) -- with only one reviewer role and no
per-request assignment, a separate "claimed for review" state doesn't add
information. Enforced transitions: a request can't go directly from
`submitted` to `paid` (must pass through `approved`), and `rejected` requests
are terminal (no accidental payment).

---

## API Design

Core mutations (create/submit/approve/reject/mark-paid, admin role/status
changes) are Server Actions -- they run server-side only and are the actual
enforcement point for authorization, so they satisfy the "backend, not
frontend" requirement without a separate REST layer.

List/read endpoints that need filtering, sorting, and pagination (the
reviewer queue, the requester's own request list, the admin user list) are
implemented as real Route Handlers (`/api/requests`, `/api/users`) so they
have URLs that can be documented with OpenAPI and queried with standard query
params (`status`, `category`, `q`, `page`, `pageSize`). This also means
pagination state lives in the URL, which keeps filters intact across page
changes for free.

---

## Evaluation / Testing Plan

Manual scenario-based testing against the list in `docs/testing.md`, covering
the required cases: valid submission, missing required fields, invalid
amount, unsupported receipt type, duplicate-submit prevention, reviewer
approve/reject, required rejection reason, mark-as-paid, unauthorized
reviewer action, a requester attempting to approve their own request, search
and filtering, pagination, dashboard totals, receipt access permissions, and
data persistence across a refresh. If time allows past the core workflow,
these get automated as integration tests rather than staying manual-only.

---

## Phases & Priorities

Real hackathon window: **Aug 13, 11:00 AM -- Aug 18, 5:00 PM EST (5 days)**.

| Phase | Target dates | Goals |
|-------|--------------|-------|
| 1 | Aug 13 | Foundation: Next.js/Tailwind scaffold, full data model (incl. admin role, notifications, audit trail), auth + role-gated routing for all three roles, Supabase schema pushed, private receipt bucket provisioned, empty shell deployed to Vercel. |
| 2 | Aug 14 | Core requester workflow: create/edit/submit a request with real receipt upload, view own requests with status and reviewer comments, backend validation (amount, required fields, duplicate-submit). |
| 3 | Aug 15 | Core reviewer workflow: submitted-request queue with filters (status/category/date/requester), approve/reject with required comment, mark approved as Paid, receipt viewing via short-lived signed URL, in-app notifications on status change. |
| 4 | Aug 16 | Dashboard totals (requested/approved/pending/paid, counts by status), pagination on list endpoints, minimal admin screen (user list, role change, activate/deactivate), API documentation (OpenAPI). |
| 5 | Aug 17-18 | Testing pass against `docs/testing.md`, responsive/accessibility pass, `docs/architecture.md` + `docs/reflection.md` + `docs/walkthrough.md` (record video), README finalization, final deploy verification. |

---

## What I'll Cut If Time Is Short

First to go: in-app notifications (nice for UX, but the same information is
already visible on the request detail page, so it's the least load-bearing
Tier 1 item) and OpenAPI docs polish (the endpoints still exist and work
without a generated spec, so this becomes "document by hand in
architecture.md" instead of a formal OpenAPI file).

Next: the admin screen shrinks to the minimum literal requirement (list +
role dropdown + active/inactive toggle) with no separate audit-history view
in the UI, even though the `UserAudit` writes still happen.

Last thing I'd cut: the core workflow itself (create -> submit -> review ->
approve/reject -> paid), real receipt upload with private storage, and
backend-enforced role permissions -- these are both the highest-weighted
rubric item (core functionality, 30%) and the parts most likely to be
directly exercised in the live demo.

---

## Open Questions / Risks

- **Receipt storage cost/complexity vs. time.** Real file upload + private
  bucket + signed URLs is more work than a text/URL field, but it's an
  explicit Tier 1 requirement (section 15) and Supabase Storage is already
  available on the same project as the database, which keeps the added
  complexity to "one more env var and one small server helper" rather than
  standing up a new provider.
- **Architecture choice (Server Actions vs. pure REST) under a rubric that
  explicitly asks for API design/OpenAPI docs.** Mitigated by exposing real
  Route Handlers specifically for the list/filter/paginate endpoints, so
  there's something concrete to document, while keeping mutations as Server
  Actions where that's the more idiomatic and equally backend-enforced
  choice for this framework.
- **Compressed personal timeline.** The plan above maps to the real 5-day
  event window; day-to-day execution pace is a personal risk to manage, not
  a change to what's being built.
