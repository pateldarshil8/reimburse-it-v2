import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications -- the current user's own notifications, newest
// first, paginated. Always scoped to the authenticated caller; there is no
// way to request another user's notifications through this endpoint.
//
// Query params: unreadOnly ("true" to filter), page, pageSize.
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

  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  const where = {
    userId: session.user.id,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  try {
    const [total, data] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    console.error("GET /api/notifications failed:", err);
    return NextResponse.json(
      { error: { message: "Something went wrong loading notifications." } },
      { status: 500 }
    );
  }
}
