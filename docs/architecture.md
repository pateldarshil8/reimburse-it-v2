# Architecture

A brief explanation of how ReimburseIt is put together: the stack, the folder
layout, the data model, where each piece of business logic actually runs, and
how the built application diverged from `planning/planning.md`.

---

## Final Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router), TypeScript | 16.3.0 |
| UI runtime | React | 19.2.8 |
| Styling | Tailwind CSS v4 + a hand-built shadcn/ui-style component library (`src/components/ui`) | ^4 |
| ORM | Prisma, `prisma-client` generator + `@prisma/adapter-pg` driver adapter | ^7.9.1 |
| Database | PostgreSQL, hosted on Supabase | — |
| File storage | Supabase Storage, private `receipts` bucket | @supabase/supabase-js ^2.112.3 |
| Auth | Auth.js (NextAuth) v5-beta, Credentials provider, JWT sessions | ^5.0.0-beta.32 |
| Validation | Zod, shared between client forms and Server Actions | ^4.4.3 |
| Password hashing | bcryptjs | ^3.0.3 |
| Select/Dialog primitives | Radix UI | ^1.x / ^2.x |
| Deployment | Vercel (auto-deploy on push to `main`) | — |

One repo serves both frontend and backend: Server Components render pages,
Server Actions handle mutations, and a small set of Route Handlers under
`src/app/api` expose filterable/paginated JSON endpoints. This avoided
standing up and deploying a second backend service for a five-day solo
project, while still giving every mutation a real server-side enforcement
point (Server Actions never ship to the browser bundle).

`shadcn/ui`'s own CLI needs network access the development sandbox this was
built in didn't have, so the small set of components it would have generated
(`Button`, `Card`, `Input`, `Label`, `Select`, `Badge`, `Textarea`, `Spinner`,
`Skeleton`) were written by hand in `src/components/ui`, styled to match the
same visual language, and wired to Radix primitives directly for the
`Select` component's keyboard/focus behavior.

---

## Folder Structure

```
src/
  app/
    admin/            # admin-only: user list, role/status changes, delete,
                       # account-request approval, audit-activity feed
    api/
      auth/[...nextauth]/route.ts
      requests/        # GET /api/requests, GET /api/requests/:id
      users/            # GET /api/users
      notifications/    # GET /api/notifications
    employee/          # requester screens: request list, new/edit form,
                        # request detail + history
    reviewer/          # reviewer screens: review queue (filters + totals),
                        # request detail + approve/reject/mark-paid
    notifications/      # in-app notification list, mark read
    login/, signup/      # Credentials sign-in, public self-signup request
    layout.tsx, page.tsx  # root layout, public landing page
  components/
    ui/                # hand-built shadcn/ui-style primitives
    site-nav.tsx, status-badge.tsx, pagination.tsx, review-history.tsx
  lib/
    prisma.ts          # Prisma client singleton (adapter-pg over Supabase Postgres)
    requests.ts         # listRequests (filter/sort/paginate), computeDashboardTotals,
                         # getVisibleRequest (ownership + draft-visibility rules)
    receipts.ts, supabase-storage.ts   # signed-URL resolution, upload, service-role client
    validation.ts        # Zod schemas shared by forms and Server Actions
    notifications.ts, users.ts, format.ts, password.ts, utils.ts
  auth.ts, auth.config.ts   # Auth.js config: Credentials provider, JWT/session callbacks
  proxy.ts               # edge middleware: route-level auth gate
prisma/
  schema.prisma, seed.ts
openapi/
  openapi.yaml            # OpenAPI 3.0 spec for the Route Handlers above
planning/
  planning.md
docs/
  architecture.md, reflection.md, testing.md, walkthrough.md
```

Each role's screens live under their own route segment (`employee/`,
`reviewer/`, `admin/`) with their own `layout.tsx` that re-checks
`session.user.role` server-side — not just middleware — because middleware
runs at the edge and can't hit the database to catch a role that changed
since the user's JWT was issued (see Auth below).

---

## Data Model & Workflow Design

Six Prisma models (`prisma/schema.prisma`), each mapped to a `snake_case`
Postgres table:

- **User** — id, name, email (unique), passwordHash, role
  (`employee`/`reviewer`/`admin`), accountStatus (`active`/`inactive`),
  createdAt.
- **ExpenseRequest** — id, submitterId, title, description, category,
  expenseDate, totalAmount (`Decimal(10,2)`, never a float, to avoid
  cent-rounding bugs on money), currency, receiptUrl/receiptName/receiptType,
  status, createdAt, updatedAt.
- **ReviewAction** — id, requestId, reviewerId (nullable), action, comment,
  previousStatus, newStatus, createdAt. Doubles as the per-request audit
  trail: the initial `draft -> submitted` transition is logged here too
  (with `reviewerId` null), not only approve/reject/paid, so
  `ReviewHistory` can render one continuous timeline per request.
- **Notification** — id, userId, requestId (nullable), message, readAt,
  createdAt. One row is created on every status-changing reviewer action.
- **UserAudit** — id, targetId, actorId, action, detail, createdAt. Records
  admin role changes, activate/deactivate, and account deletion.
- **AccountRequest** — id, firstName, lastName, email (unique), passwordHash,
  status (`pending`/`approved`/`rejected`), reviewedAt, reviewedById. Public
  self-signup lands here, not directly in `User` — an unapproved signup is
  never a row that could accidentally authenticate.

### Status machine

```
draft -> submitted -> approved -> paid
                    -> rejected   (terminal)
```

`submitted` and the brief's optional `under review` state are deliberately
combined into one `submitted` status (explicitly permitted by
`problem_statement.md` section 2) — with a single reviewer role and no
per-request assignment, a separate "claimed for review" state wouldn't carry
information. Every Server Action that changes status re-checks the current
status before writing (e.g. `approveRequest` and `rejectRequest` only act on
`submitted` requests; `markRequestPaid` only acts on `approved` ones), so a
rejected request can never reach `paid` and a request can't skip `approved`
en route to `paid`, regardless of what request the client sends.

### Foreign-key deletion behavior

Because the admin can now permanently delete a user (not just deactivate
one), every relation to `User` has an explicit `onDelete` rule chosen for
what should survive:

- `ExpenseRequest.submitter -> onDelete: Cascade` — a deleted user's own
  requests go with them.
- `ReviewAction.reviewer -> onDelete: SetNull` — a request another person
  submitted keeps its full history even if the reviewer who acted on it is
  later deleted; the history entry just shows no reviewer name.
- `UserAudit.target`/`UserAudit.actor -> onDelete: SetNull` — the audit
  trail is the one thing that should outlive every account it references,
  including the account being deleted in that very row, so both foreign keys
  were made nullable rather than required.

---

## Where Business Logic Runs

**Server Actions** (`"use server"` functions in each route's `actions.ts`)
handle every mutation: create/save/submit a request, approve/reject/mark
paid, and every admin action (role change, activate/deactivate, delete,
approve/reject a signup). Each one independently re-derives the caller's
session and role via `auth()` and re-checks business rules against the
current database state — it does not trust anything the client claims about
its own permissions. This is what satisfies "authorization must be enforced
by the backend, not just by hiding buttons" (`problem_statement.md` section
10): even a request sent by hand-crafted `fetch` from dev tools with an
employee session hits the same `requireReviewer()` / `requireAdmin()` checks.

**Route Handlers** (`src/app/api/*/route.ts`) exist specifically for
list/filter/paginate reads — the reviewer queue, the admin user list, and
notifications — because these are the endpoints that benefit from real URLs,
query-string filters, and an OpenAPI spec judges can open independently of
the UI. `src/lib/requests.ts#listRequests` is the shared query builder behind
both the reviewer queue page and `GET /api/requests`: it takes an optional
`scopeUserId` that's set server-side for employees (never trusted from a
client-supplied parameter) so an employee can never widen a query to see
another user's requests, and it always excludes `draft` rows from any
caller who isn't the owner.

**Receipts** are the one place a raw file crosses the network. `RequestForm`
uploads to a private Supabase Storage bucket (`receipts`) via a server-only
service-role client (`src/lib/supabase-storage.ts`) — the service role key
bypasses Storage RLS, which is safe only because every call site has already
verified the caller's session-based authorization before invoking it, the
same trust model already used for direct Postgres access via Prisma. Objects
are stored at `{submitterId}/{requestId}/{timestamp}-{filename}`, so listing
or guessing a path still requires knowing (or already having access to) the
owning request. Viewing a receipt never returns the object directly —
`resolveReceiptUrl` (`src/lib/receipts.ts`) generates a signed URL that
expires after 300 seconds, and it's only ever called from a page that has
already run `getVisibleRequest`, which returns `null` for a request the
current user isn't allowed to see. Both the file's declared MIME type and
its size are validated against an allow-list (`image/jpeg`, `image/png`,
`application/pdf`, 10MB max) in `src/lib/validation.ts#validateReceiptFile`
before any upload happens.

**Auth** uses Auth.js Credentials with JWT sessions. `authorize()`
(`src/auth.ts`) looks up the user by (trimmed, lowercased) email, verifies
the bcrypt hash, and only after the password is confirmed correct does it
check `accountStatus` — a deactivated account throws a distinct
`AccountDeactivatedError` so the login form can say "Account Deactivated,
Contact System Admin," while a wrong password or an unknown/deleted email
both fall through to the same generic "Invalid email or password," so a
failed login attempt never reveals whether a given account exists. Route
gating happens twice: `src/proxy.ts` (edge middleware) blocks unauthenticated
requests to `/employee`, `/reviewer`, and `/admin` before they render, and
each role's `layout.tsx` independently re-checks `session.user.role` against
the database on every request (the edge runtime can't run Prisma/`pg`, so it
gates on the JWT's cached role; the layout's session callback does a real DB
lookup) — this is what makes a role change by an admin take effect
immediately for an already-signed-in user, rather than waiting for their
next login.

---

## Deployment Architecture

Vercel builds and deploys on every push to `main` (`prisma generate` runs
during the build via `postinstall`, which the local development sandbox
couldn't do because it had no network access to `binaries.prisma.sh`, but
Vercel's build environment can). The Next.js app is the only deployed
service; Postgres and file storage are both Supabase-hosted, reached over
`DATABASE_URL`/`DIRECT_URL` (pooled vs. direct connection, per Supabase's
Prisma guidance) and the Supabase JS client respectively. All secrets
(`AUTH_SECRET`, database URLs, `SUPABASE_SERVICE_ROLE_KEY`) are Vercel
environment variables, never committed — `.env.example` documents the shape
without real values.

---

## What Changed From the Plan

Comparing against `planning/planning.md`, written before any code:

- **Nothing on the "first to cut" list was actually cut.** Notifications and
  OpenAPI documentation were both flagged in the plan as the first things to
  drop if time ran short; both shipped in full (in-app notifications with
  read/unread state, and a complete `openapi/openapi.yaml` covering all four
  Route Handlers).
- **Self-signup was added beyond the original plan.** `planning.md`
  describes admin-managed accounts only; the built application adds a public
  "Create account" flow that lands in an `AccountRequest` table pending
  admin approval, rather than accounts existing only via `db:seed` or direct
  database inserts.
  - **Permanent user deletion was added after the initial plan**, alongside
    the originally-planned activate/deactivate toggle. This required
    revisiting every foreign key that pointed at `User` (see "Foreign-key
    deletion behavior" above) and a live Supabase migration
    (`support_admin_user_deletion`) to change `ON DELETE` behavior on
    existing constraints without losing data.
- **The API design landed exactly as planned**: Server Actions for
  mutations, Route Handlers for filterable/paginated reads — the plan's
  "Open Questions" section flagged this split as a risk under a rubric that
  explicitly asks for API design/OpenAPI docs, and it held up without
  needing to convert any mutation into a REST endpoint later.
- **Two gaps the plan's own testing section called for were not built**,
  and are documented honestly rather than silently dropped: duplicate-submit
  prevention, and preserving form field values after a server-side
  validation failure. Both are covered in `docs/reflection.md` and
  `docs/testing.md`.
