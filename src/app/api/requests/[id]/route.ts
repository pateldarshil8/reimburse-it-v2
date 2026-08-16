import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVisibleRequest } from "@/lib/requests";

// GET /api/requests/:id -- a single request, including its full review
// history (covers both the "Reviews" and "Request history" resources
// called out in problem_statement.md section 13, without a separate
// endpoint for what's really one aggregate view of the same rows).
//
// Visibility matches the UI: employees only see their own requests, and
// drafts are never visible to anyone else. A request that exists but isn't
// visible to the caller returns 404, not 403 -- so its existence isn't
// leaked to someone who isn't allowed to see it.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const found = await getVisibleRequest(id, session.user);
    if (!found) {
      return NextResponse.json(
        { error: { message: "Request not found." } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: found });
  } catch (err) {
    console.error("GET /api/requests/[id] failed:", err);
    return NextResponse.json(
      { error: { message: "Something went wrong loading this request." } },
      { status: 500 }
    );
  }
}
