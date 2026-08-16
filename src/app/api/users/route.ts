import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUsers } from "@/lib/users";

// GET /api/users -- paginated, filterable list of user accounts.
// Admin-only: user management is restricted to administrators
// (problem_statement.md section 10), enforced here independent of the
// admin screen's own guard.
//
// Query params: role, q, page, pageSize.
// Response: { data, page, pageSize, total, totalPages }
// Errors:    { error: { message } } with 401/403/500 as appropriate.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
    );
  }
  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: { message: "Forbidden." } },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;

  try {
    const result = await listUsers({
      role: searchParams.get("role") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/users failed:", err);
    return NextResponse.json(
      { error: { message: "Something went wrong loading users." } },
      { status: 500 }
    );
  }
}
