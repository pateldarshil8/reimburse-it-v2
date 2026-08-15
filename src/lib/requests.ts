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
// own requests. (Reviewer/admin visibility rules land alongside the
// reviewer queue.) Returns null if the request doesn't exist OR the caller
// isn't allowed to see it -- callers should treat both cases as "not found"
// rather than leaking existence.
export async function getVisibleRequest(id: string, user: SessionUser) {
  const request = await prisma.expenseRequest.findUnique({
    where: { id },
    include: requestDetailInclude(),
  });
  if (!request) return null;
  if (user.role === "employee" && request.submitterId !== user.id) return null;
  return request;
}

// The requester's own request list, newest first. Filtering, sorting, and
// pagination on this (and the equivalent reviewer-facing query) land with
// the reviewer queue and dashboard work later in the plan.
export async function listMyRequests(userId: string) {
  return prisma.expenseRequest.findMany({
    where: { submitterId: userId },
    orderBy: { createdAt: "desc" },
  });
}
