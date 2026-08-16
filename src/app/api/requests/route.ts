import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listRequests, type ListRequestsParams } from "@/lib/requests";

// GET /api/requests -- paginated, filterable, sortable list of
// reimbursement requests. Backs both the employee's own request list and
// the reviewer queue (problem_statement.md sections 7, 13, 14).
//
// Query params: status, category, requesterId, dateFrom, dateTo, minAmount,
// maxAmount, q, page, pageSize, sort (newest | oldest | amount_desc |
// amount_asc).
//
// Response: { data, page, pageSize, total, totalPages }
// Errors:    { error: { message } } with 401/500 as appropriate.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { role, id: userId } = session.user;
  const searchParams = request.nextUrl.searchParams;

  const params: ListRequestsParams = {
    status: searchParams.get("status") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    requesterId: searchParams.get("requesterId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    minAmount: searchParams.get("minAmount") ?? undefined,
    maxAmount: searchParams.get("maxAmount") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    sort: (searchParams.get("sort") as ListRequestsParams["sort"]) ?? undefined,
  };

  // Employees can only ever see their own requests -- a client-supplied
  // requesterId must never be able to widen that, so we force the scope
  // rather than merely defaulting it.
  const scopeUserId = role === "employee" ? userId : undefined;

  try {
    const result = await listRequests(params, scopeUserId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/requests failed:", err);
    return NextResponse.json(
      { error: { message: "Something went wrong loading requests." } },
      { status: 500 }
    );
  }
}
