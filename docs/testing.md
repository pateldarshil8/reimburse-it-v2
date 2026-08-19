# Testing

Manual, scenario-based testing against the live deployment at
[reimburse-it-v2.vercel.app](https://reimburse-it-v2.vercel.app), covering
every case listed in `problem_statement.md`'s Testing Expectations section.
Each scenario below states how it was verified — live through the UI against
real persisted Supabase data, or by reading the enforcing code directly —
and what was observed. Two scenarios surfaced real gaps; those are reported
here honestly rather than as passing.

No automated test suite exists yet (see `docs/reflection.md`, "What I'd Do
Differently") — `prisma generate` could not run in the development sandbox
used to build this, which made local integration testing impractical within
the five-day window, so all verification below is either a live exercise of
the deployed app or a direct code review of the enforcing logic.

---

### 1. Valid reimbursement submission

**Method:** Live UI, as employee (James Turner).
**Result: Pass.** Filled in title, category, expense date, amount, and
description, attached a valid JPEG/PDF receipt, and submitted. The request
was created with status `submitted`, immediately visible on the "My
requests" list and in the reviewer queue, with a `ReviewAction` row logging
the `draft -> submitted` transition.

### 2. Missing required information

**Method:** Live UI.
**Result: Pass.** Attempting to save/submit with Title, Category, or
Description left blank is blocked before it reaches the server — the
Category `<select>` and other required inputs use native HTML5 `required`
validation, and `ExpenseRequestFormSchema` (`src/lib/validation.ts`)
independently rejects the same cases server-side (`.min(1, "... is
required.")` on title/description, `z.enum(CATEGORIES)` on category) if the
client check were ever bypassed.

### 3. Missing receipt

**Method:** Live UI.
**Result: Pass.** Submitting (not saving as draft) a fully-filled form with
no receipt attached returns `"Attach a receipt before submitting for
review."` from `saveExpenseRequest` (`src/app/employee/actions.ts`) —
enforced server-side regardless of client state, since "Save as draft"
without a receipt is explicitly allowed (only "Submit for review" requires
one).

### 4. Invalid amount

**Method:** Live UI.
**Result: Pass.** A negative or zero amount is rejected by
`totalAmount: z.coerce.number().positive("Amount must be greater than
zero.")`. Also verified the related rules in the same schema: amounts over
1,000,000 are flagged as unrealistic, and amounts with more than two decimal
places are rejected (`Math.round(val * 100) === val * 100`).

### 5. Invalid category

**Method:** Code review.
**Result: Pass (structurally enforced, not independently live-reproducible
via the UI).** The category field is a Radix `Select` populated only from
the fixed `CATEGORIES` tuple in `src/lib/validation.ts` — there is no free-
text path in the UI to submit an invalid category. Server-side,
`category: z.enum(CATEGORIES, { message: "Select a valid category." })`
would reject any other value regardless of how it arrived (e.g. a
hand-crafted request), which is what actually matters for backend
enforcement per section 4's "validation should not exist only in the
frontend."

### 6. Unsupported receipt format

**Method:** Live UI, as employee.
**Result: Pass.** Filled a valid request (title, category, amount,
description), then attached a `.txt` file (`text/plain`) as the receipt
using a constructed `File`/`DataTransfer` on the native file input, and
clicked "Submit for review." The submission was rejected with
`"Receipt must be a JPEG, PNG, or PDF file."`, shown twice on the re-rendered
form (once from the top-level `error`, once from the field-level
`fieldErrors.receipt` — both currently render the same message; a minor,
harmless duplication worth cleaning up). This confirms
`validateReceiptFile()` (`src/lib/validation.ts`) checks the file's actual
declared MIME type against an allow-list rather than trusting the filename
extension.

**Gap observed alongside this test:** the form did not preserve any of the
other field values (title, category, amount, description) after this
server-side rejection — every field was blank on the re-rendered form,
requiring full re-entry. Recorded in `docs/reflection.md`.

### 7. Duplicate submission prevention

**Method:** Code review.
**Result: Known gap — not implemented.** `saveExpenseRequest`
(`src/app/employee/actions.ts`) has no check preventing the same request
from being submitted twice (e.g. a double-click on "Submit for review," or
resubmission from a second tab). This is disclosed rather than
misrepresented as working; see `docs/reflection.md`, "What I'd Do
Differently," for the fix I'd build.

### 8. Reviewer approval

**Method:** Live UI, as reviewer (Liza White).
**Result: Pass.** Opened a `submitted` request, reviewed its details and
receipt (via signed URL), and approved it. Status changed to `approved`, a
`ReviewAction` row was written with the reviewer's name and timestamp, and a
notification was created for the requester ("Your request ... was
approved.").

### 9. Reviewer rejection

**Method:** Live UI, as reviewer.
**Result: Pass.** Rejected a submitted request with a written reason.
Status changed to `rejected`, visible immediately to the requester (James
Turner) with the rejection reason shown on the request's history timeline.

### 10. Required rejection reason

**Method:** Live UI.
**Result: Pass.** Attempting to reject with an empty comment is blocked by
`RejectRequestSchema`'s `.min(1, "A reason is required when rejecting a
request.")` (`src/lib/validation.ts`) — unlike approval and mark-paid, whose
comment field is optional (`ApproveRequestSchema`), rejection's is required
in both the form and the Server Action.

### 11. Approved request marked as Paid

**Method:** Live UI, as reviewer.
**Result: Pass.** Marked a previously-approved request as Paid. Status
became `paid`, a `ReviewAction` (`approved -> paid`) was recorded, and a
"marked as paid" notification was created for the requester. Verified
separately that `markRequestPaid` refuses to act on anything but an
`approved` request — a `rejected` request has no Paid action available and
would be rejected server-side (`"Only approved requests can be marked as
paid."`) if attempted directly.

### 12. Unauthorized reviewer action

**Method:** Live UI, both directions.
**Result: Pass.** Signed in as employee (James Turner) and navigated
directly to `/reviewer` and `/admin` by URL — both redirected back to
`/employee` before any reviewer/admin content rendered. Signed in as
reviewer (Liza White) and navigated directly to `/admin` — redirected back
to `/reviewer`. This is enforced at two layers: edge middleware
(`src/proxy.ts`) gates the route before render, and each layout
(`src/app/{employee,reviewer,admin}/layout.tsx`) independently re-checks
`session.user.role` against a fresh database read, so a role change takes
effect immediately rather than only after the next login.

### 13. Requester attempting reviewer functionality

**Method:** Live UI (same test as #12, employee direction).
**Result: Pass.** Covered above — an employee session cannot reach
`/reviewer` or any of its Server Actions' effective UI regardless of typed
URL.

### 14. Requester attempting to approve their own request

**Method:** Code review (structurally unreachable via the live UI).
**Result: Pass, enforced server-side.** Because role-based routing already
blocks any `employee`-role session from reaching `/reviewer` at all (see
#12/#13), there is no live UI path for a requester to even attempt this —
they can never see the approve/reject controls for their own or anyone
else's request. The rule still exists as defense in depth for the case
where a submitter also holds reviewer/admin privileges: every reviewer
Server Action (`approveRequest`, `rejectRequest`, `markRequestPaid` in
`src/app/reviewer/actions.ts`) independently checks
`existing.submitterId === user.id` and returns `"You cannot review your own
request."` before making any change, regardless of what the UI shows that
user.

### 15. Search and filtering

**Method:** Live UI, as reviewer.
**Result: Pass.** On the review queue, searched `"training"` in the Search
field and applied filters — the URL updated to
`?q=training&status=&category=&requesterId=&sort=newest&dateFrom=&dateTo=`
and the list correctly narrowed from 6 requests to the single matching
"Volunteer coordination training course" request (title match). The same
query builder (`src/lib/requests.ts#listRequests`) also supports filtering
by status, category, requester, and expense-date range, and sorting by
newest/oldest/amount — all as URL query parameters, so filters survive a
page reload or being shared as a link.

### 16. Pagination

**Method:** Code review; live UI limited by seed data volume.
**Result: Implemented, partially demonstrated live.** `listRequests`
returns `{ data, page, pageSize, total, totalPages }` and is capped at a
maximum page size of 50 (`MAX_PAGE_SIZE`), with the reviewer queue, the
admin user list, and all corresponding `GET` Route Handlers sharing the same
`src/components/pagination.tsx` component (previous/next navigation, current
filters preserved in the URL when changing pages). Live-tested only to the
extent that the seeded/demo dataset (6 non-draft requests, well under the
default page size of 10) doesn't produce a second page to click through —
the pagination controls and the underlying `skip`/`take` query logic were
verified by direct code review rather than by clicking "Next" against real
data.

### 17. Dashboard calculations

**Method:** Live UI, as reviewer.
**Result: Pass.** The review queue's summary cards showed Pending: 0, Total
pending: $0.00, Total requested: $753.99, Total approved: $381.49, Total
paid: $182.49 — computed live by `computeDashboardTotals`
(`src/lib/requests.ts`) via `Prisma` aggregate queries over the actual
persisted `ExpenseRequest` rows (summing non-draft requests for "requested,"
`approved`+`paid` for "approved," `submitted` for "pending," and `paid` for
"paid"), not a client-side or cached calculation. The same function powers
the requester's own per-user summary on the employee dashboard, scoped to
`submitterId`.

### 18. Receipt access permissions

**Method:** Live UI + code review.
**Result: Pass.** Receipt files live in a private Supabase Storage bucket
(never publicly listable or fetchable by URL); viewing one always goes
through `resolveReceiptUrl` (`src/lib/receipts.ts`), which only runs after
`getVisibleRequest` (`src/lib/requests.ts`) has already confirmed the
current session is allowed to see that request (owner, or any
reviewer/admin for a non-draft request — never a draft to anyone but its
owner). A real signed URL was generated and used to view a receipt during
live testing, confirming the end-to-end path works against production
Storage, and it carries a 300-second expiry (`getReceiptSignedUrl`'s
default), not a permanent public link.

### 19. Data persistence

**Method:** Live UI, observed throughout testing.
**Result: Pass.** All scenarios above ran against the real production
Supabase database, not local/mock state — requests created, approved,
rejected, and paid in earlier test passes remained correctly present, with
correct statuses and history, across multiple separate login sessions
(different roles, different points in time) during this testing pass. The
review queue's dashboard totals ($753.99 requested / $381.49 approved /
$182.49 paid) reflect the accumulated effect of every prior test action
still being persisted, not reset between sessions.

---

## Summary

| # | Scenario | Result |
|---|---|---|
| 1 | Valid submission | Pass |
| 2 | Missing required information | Pass |
| 3 | Missing receipt | Pass |
| 4 | Invalid amount | Pass |
| 5 | Invalid category | Pass (structural) |
| 6 | Unsupported receipt format | Pass |
| 7 | Duplicate submission prevention | **Gap — not implemented** |
| 8 | Reviewer approval | Pass |
| 9 | Reviewer rejection | Pass |
| 10 | Required rejection reason | Pass |
| 11 | Approved marked Paid | Pass |
| 12 | Unauthorized reviewer action | Pass |
| 13 | Requester attempting reviewer functionality | Pass |
| 14 | Requester approving own request | Pass (backend-enforced) |
| 15 | Search and filtering | Pass |
| 16 | Pagination | Implemented (code-reviewed) |
| 17 | Dashboard calculations | Pass |
| 18 | Receipt access permissions | Pass |
| 19 | Data persistence | Pass |

Additional gap found during testing, not on the brief's scenario list: the
request form does not preserve field values after a server-side validation
failure (see scenario 6 and `docs/reflection.md`).

---

## Day 5 polish verification

A final pass against the live deployment after the last round of UI polish
(browser-tab favicon, "ReimburseIt"-only page title, and a home link on the
sign-in/create-account pages), performed live via browser automation against
`reimburse-it-v2.vercel.app`:

- **Page title.** The browser tab reads `ReimburseIt` (previously
  `ReimburseIt | Community Dreams Foundation`) on `/login`, confirmed via the
  tab's title after navigation.
- **Favicon.** `GET /icon.svg` returns the icon (a violet circle on a dark
  rounded square) and renders correctly in the browser tab; Next.js's
  metadata file convention picks it up automatically from `src/app/icon.svg`
  with no additional wiring.
- **Home link on `/login`.** The top-left "ReimburseIt" link navigated to
  `/` when clicked.
- **Home link on `/signup`.** Same header present and styled consistently
  with `/login` and the public landing page.
- **No regressions.** Re-ran a full sign-in as James Turner (employee)
  immediately after these changes deployed — dashboard, request list, and
  notification badge all rendered correctly, and the browser console showed
  no errors on either the login or signup page.
- **Dependency fix caught by this pass.** A fresh `npm install` during this
  round of work resolved `lucide-react` to `1.33.0`, a published version
  with no type declarations, which failed the local typecheck (13 baseline
  errors became 14). Traced to a missing lockfile rather than anything in
  the new UI code; fixed by pinning `lucide-react` to the last known-good
  version (`1.32.0`) and committing `package-lock.json`. Confirmed back to
  the 13-error sandbox baseline (all four remaining categories are
  sandbox-only artifacts of not being able to run `prisma generate` or a
  full `next build` locally — see the top of this document) and a clean
  `next build` up to that same expected point before pushing.
