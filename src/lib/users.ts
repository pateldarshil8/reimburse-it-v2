import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client/client";

export type ListUsersParams = {
  role?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

const VALID_ROLES = ["employee", "reviewer", "admin"] as const;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

// Paginated user list backing both the admin screen and GET /api/users
// (problem_statement.md section 14 calls out Users as a pagination target
// alongside requests, notifications, and history records).
export async function listUsers(params: ListUsersParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));

  const where: Prisma.UserWhereInput = {};
  if (params.role && (VALID_ROLES as readonly string[]).includes(params.role)) {
    where.role = params.role as (typeof VALID_ROLES)[number];
  }
  if (params.q) {
    const q = params.q.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
