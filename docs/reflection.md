# Reflection

## What I Built

ReimburseIt is a full-stack expense & reimbursement tracker covering the
complete brief workflow — **Create → Submit → Review → Approve / Reject →
Paid** — for three roles, deployed live at
[reimburse-it-v2.vercel.app](https://reimburse-it-v2.vercel.app) on Vercel,
backed by Supabase Postgres and Supabase Storage.

**Requester (employee):** create, edit, and delete draft requests; attach a
receipt (JPEG/PNG/PDF, up to 10MB, validated server-side against both MIME
type and size); submit for review (blocked server-side without a receipt
attached); view the full list of their own requests with status badges;
view a per-request detail page with the complete review history (submitted →
approved/rejected → paid, with reviewer name, comment, and timestamp on
each step).

**Reviewer:** a review queue showing every non-draft request org-wide, with
search (title/description/requester name), and filters for status, category,
requester, and expense-date range, plus sort by newest/oldest/amount; a
live financial summary (pending count, total requested/pending/approved/paid)
computed from persisted data, not cached client state; approve or reject
(rejection requires a non-empty reason, enforced by both the form and the
Server Action) with a receipt visible via a short-lived signed URL; mark an
approved request Paid. A reviewer can never act on their own submitted
request — enforced in the Server Action itself, independent of what the UI
shows, since a reviewer could in principle also have submitted requests of
their own.

**Administrator:** a user list (name, email, role, account status, created
date) with role changes and activate/deactivate, both written to an audit
trail; a newly added **permanent account deletion** feature, distinct from
deactivation — deleting a user cascades their own requests, nulls out (never
deletes) their name on other users' review/audit history, and records the
deletion itself in the audit trail before the row disappears; approval/
rejection of public self-signup requests; a "Recent account activity" feed
rendering that audit trail. An admin cannot change their own role, deactivate
themselves, or delete their own account.

**Cross-cutting:** in-app notifications on every status change (mark
single/all as read, unread badge); server-side pagination and filtering
shared between the reviewer queue, the admin user list, and four documented
`GET` Route Handlers (`/api/requests`, `/api/requests/:id`, `/api/users`,
`/api/notifications`); role-based routing enforced at both edge middleware
and page-render time; a public self-signup flow gated by admin approval; a
dark violet visual theme applied consistently across every screen with
loading skeletons on each route.

I also reseeded the four demo accounts under fictional names distinct from
the original CDF-branded seed data (James Turner, Emma Washington, Liza
White, Adam Brown), keeping the same underlying user IDs so their existing
linked requests, review history, and notifications stayed attached to the
renamed accounts rather than needing to be recreated.

## What I'd Do Differently

Two gaps surfaced during a live testing pass against the deployed
application (documented with evidence in `docs/testing.md`), and I'm
recording them here honestly rather than presenting the app as more complete
than it is:

- **No duplicate-submission prevention.** `planning/planning.md`'s own
  Evaluation/Testing Plan named this as something to cover, and
  `problem_statement.md` section 4 lists it as an expected validation case,
  but `saveExpenseRequest` (`src/app/employee/actions.ts`) has no guard
  against a user double-clicking "Submit for review" or resubmitting an
  already-submitted request through a second tab. The realistic fix is a
  short-lived idempotency check — either disabling the submit button
  immediately on click (fast, client-side, doesn't stop a replayed request)
  or a server-side check that the same title/amount/category wasn't already
  submitted by that user in the last few minutes (slower to build, actually
  closes the gap). I'd build the second.
- **The request form doesn't preserve field values after a server-side
  validation failure.** If `saveExpenseRequest` rejects a submission — for
  example, missing-receipt or an invalid receipt file type — the redirect
  back to the form clears every field, not just the one that failed,
  forcing full re-entry. I saw this directly while testing the unsupported-
  file-type case: title, category, amount, and description were all blank
  again after the rejection. The fix is to thread the submitted (non-file)
  field values back through `SaveRequestState` and use them as the form's
  default values on re-render, the same way `fieldErrors` already flows
  back today.

Beyond those two, given more time I'd add a resubmission path for rejected
requests (currently `rejected` is a terminal state — a requester has to
create an entirely new request rather than editing and resubmitting the same
one), and I'd move from manual live-UI testing toward an automated
integration-test suite exercising the Server Actions directly against a test
database, which `planning.md` also flagged as a stretch goal if time
allowed.

## AI Tools Used

I built this with Claude (Anthropic) as an AI pair-programmer throughout the
five-day window, used through an agentic coding workflow with direct
filesystem and shell access to iterate, run typechecks/lint, and drive live
browser-based testing against the deployed app.

How I used it, concretely:

- **Scaffolding and boilerplate** — the initial Next.js/Prisma/Auth.js
  project structure, the hand-built `shadcn/ui`-style component set (since
  the `shadcn` CLI itself needs network access the build sandbox didn't
  have), and repetitive patterns like each role's `layout.tsx` role-check.
- **Implementation of features I specified** — I drove what to build and in
  what order (the phase plan in `planning/planning.md` is mine, written
  before any code), and used AI assistance to write the Server Actions,
  Route Handlers, and Prisma schema implementing each one against the
  validation/authorization rules I specified from `problem_statement.md`.
- **The two schema/migration changes for account deletion** — designing
  which foreign keys needed `Cascade` vs. `SetNull` (and why) was something
  I reasoned through with the AI's help, but I reviewed and understood the
  resulting `ON DELETE` behavior for each relation before applying the
  Supabase migration; this is documented in `docs/architecture.md`'s
  "Foreign-key deletion behavior" section in my own words.
- **Live testing** — I used AI-driven browser automation to exercise the
  deployed app scenario-by-scenario (the list in `problem_statement.md`'s
  Testing Expectations section), which is how the two gaps above were
  actually found, rather than being caught by re-reading the code.

What I did not outsource: every technical decision recorded in
`planning/planning.md` and `docs/architecture.md` — the Server-Actions-vs-
Route-Handlers split, combining `submitted`/`under review`, the receipt
storage/signed-URL design, and which gaps to leave unfixed and disclose
rather than paper over — is a decision I made and can explain independently
of the tool that helped implement it. I reviewed every generated diff before
it was committed and tested the deployed result myself rather than trusting
generated code as correct by default.
