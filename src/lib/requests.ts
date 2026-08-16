import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/auth.config";
import type { Prisma } from "@/generated/prisma/client/client";

export type SessionUser = { id: string; role: AppRole };

// A single request with everything a detail page needs: who submitted it,
// and its full review history in order.
export function requestDetailInclude() {
  return {
    submitter: { select: { id: true, name: true, email: true } },
    reviewActions: {
      orderBy: { createdAt: "asc" as const },
      include: { reviewer: { select: { id: true, name: true } } },
    },
  } satisfies Prisma.ExpenseRequestInclude;
}

// Fetches one request and enforces visibility: employees may only see their
// own requests. Drafts are never visible to anyone but their owner -- they
// aren't part of the workflow yet, so a reviewer/admin guessing an id
// shouldn't be able to see an unfinished draft. Returns null for both "does
// not exist" and "not allowed to see it" so callers can't distinguish the
// two (avoids leaking existence of another user's request).
export async function getVisibleRequest(id: string, user: SessionUser) {
  const request = await prisma.expenseRequest.findUnique({
    where: { id },
    include: requestDetailInclude(),
  });
  if (!request) return null;
  if (user.role === "employee" && request.submitterId !== user.id) return null;
  if (user.role !== "employee" && request.status === "draft") return null;
  return request;
}

// The requester's own request list, newest first (unfiltered -- used by the
// simple "My requests" dashboard; the filterable/paginated version below
// backs both the reviewer queue and GET /api/requests).
export async function listMyRequests(userId: string) {
  return prisma.expenseRequest.findMany({
    where: { submitterId: userId },
    orderBy: { createdAt: "desc" },
  });
}

export type ListRequestsParams = {
  status?: string;
  category?: string;
  requesterId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest" | "amount_desc" | "amount_asc";
};

const VALID_STATUSES = ["draft", "submitted", "approved", "rejected", "paid"] as const;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 10;

// Backend-enforced list query used by both the reviewer queue and
// GET /api/requests. `scopeUserId` is set by the caller for employees
// (never trust a client-supplied requesterId to widen access) and left
// undefined for reviewers/admins unless they're deliberately filtering by
// requester.
export async function listRequests(
  params: ListRequestsParams,
  scopeUserId?: string
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));

  const where: Prisma.ExpenseRequestWhereInput = {};

  if (scopeUserId) {
    where.submitterId = scopeUserId;
  } else if (params.requesterId) {
    where.submitterId = params.requesterId;
  }

  if (params.status && (VALID_STATUSES as readonly string[]).includes(params.status)) {
    where.status = params.status as (typeof VALID_STATUSES)[number];
  }

  // Drafts are private to their owner until submitted. A caller viewing
  // someone else's requests (i.e. not scoped to their own submitterId --
  // the reviewer/admin queue) must never see draft rows, even if "draft" is
  // passed as an explicit status filter.
  if (!scopeUserId && (!params.status || params.status === "draft")) {
    where.status = { not: "draft" };
  }

  if (params.category) {
    where.category = params.category;
  }

  if (params.dateFrom || params.dateTo) {
    where.expenseDate = {};
    if (params.dateFrom && !Number.isNaN(Date.parse(params.dateFrom))) {
      where.expenseDate.gte = new Date(params.dateFrom);
    }
    if (params.dateTo && !Number.isNaN(Date.parse(params.dateTo))) {
      where.expenseDate.lte = new Date(params.dateTo);
    }
  }

  if (params.minAmount || params.maxAmount) {
    where.totalAmount = {};
    if (params.minAmount && !Number.isNaN(Number(params.minAmount))) {
      where.totalAmount.gte = params.minAmount;
    }
    if (params.maxAmount && !Number.isNaN(Number(params.maxAmount))) {
      where.totalAmount.lte = params.maxAmount;
    }
  }

  if (params.q) {
    const q = params.q.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { submitter: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
  }

  const orderBy: Prisma.ExpenseRequestOrderByWithRelationInput =
    params.sort === "oldest"
      ? { createdAt: "asc" }
      : params.sort === "amount_desc"
        ? { totalAmount: "desc" }
        : params.sort === "amount_asc"
          ? { totalAmount: "asc" }
          : { createdAt: "desc" };

  const [total, data] = await Promise.all([
    prisma.expenseRequest.count({ where }),
    prisma.expenseRequest.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        submitter: { select: { id: true, name: true, email: true } },
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

export type DashboardTotals = {
  totalRequested: number;
  totalApproved: number;
  totalPending: number;
  totalPaid: number;
  pendingCount: number;
  countsByStatus: Record<string, number>;
};

// Financial summary per problem_statement.md section 8. Definitions:
// - totalRequested: sum of every request that has entered the workflow
//   (i.e. everything except drafts, which are not yet a "request" to
//   anyone but the submitter).
// - totalApproved: sum of requests currently approved OR already paid (paid
//   requests were approved first, so they still count as "approved" money).
// - totalPending: sum of requests awaiting review (status = submitted).
// - totalPaid: sum of requests actually paid out.
// `scopeUserId` restricts the summary to one submitter's own requests;
// omit it for the org-wide reviewer/admin summary.
export async function computeDashboardTotals(
  scopeUserId?: string
): Promise<DashboardTotals> {
  const where: Prisma.ExpenseRequestWhereInput = scopeUserId
    ? { submitterId: scopeUserId }
    : {};

  const [nonDraft, approvedOrPaid, pending, paid, statusGroups] = await Promise.all([
    prisma.expenseRequest.aggregate({
      where: { ...where, status: { not: "draft" } },
      _sum: { totalAmount: true },
    }),
    prisma.expenseRequest.aggregate({
      where: { ...where, status: { in: ["approved", "paid"] } },
      _sum: { totalAmount: true },
    }),
    prisma.expenseRequest.aggregate({
      where: { ...where, status: "submitted" },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.expenseRequest.aggregate({
      where: { ...where, status: "paid" },
      _sum: { totalAmount: true },
    }),
    prisma.expenseRequest.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
  ]);

  const countsByStatus: Record<string, number> = {};
  for (const group of statusGroups) {
    countsByStatus[group.status] = group._count;
  }

  return {
    totalRequested: Number(nonDraft._sum.totalAmount ?? 0),
    totalApproved: Number(approvedOrPaid._sum.totalAmount ?? 0),
    totalPending: Number(pending._sum.totalAmount ?? 0),
    totalPaid: Number(paid._sum.totalAmount ?? 0),
    pendingCount: pending._count,
    countsByStatus,
  };
}
