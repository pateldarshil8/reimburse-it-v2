"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApproveRequestSchema, RejectRequestSchema } from "@/lib/validation";

export type ReviewActionState = { error?: string };

async function requireReviewer() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required.");
  }
  if (session.user.role !== "reviewer" && session.user.role !== "admin") {
    throw new Error("Only reviewers can perform this action.");
  }
  return session.user;
}

export async function approveRequest(
  id: string,
  _prevState: ReviewActionState | undefined,
  formData: FormData
): Promise<ReviewActionState> {
  const user = await requireReviewer();

  const parsed = ApproveRequestSchema.safeParse({ comment: formData.get("comment") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.expenseRequest.findUnique({ where: { id } });
  if (!existing) return { error: "Request not found." };
  // Backend-enforced per problem_statement.md section 10: a reviewer can
  // never act on their own request, regardless of what the UI shows.
  if (existing.submitterId === user.id) {
    return { error: "You cannot review your own request." };
  }
  if (existing.status !== "submitted") {
    return { error: "Only submitted requests can be approved." };
  }

  await prisma.$transaction([
    prisma.expenseRequest.update({ where: { id }, data: { status: "approved" } }),
    prisma.reviewAction.create({
      data: {
        requestId: id,
        reviewerId: user.id,
        action: "approved",
        comment: parsed.data.comment || null,
        previousStatus: "submitted",
        newStatus: "approved",
      },
    }),
    prisma.notification.create({
      data: {
        userId: existing.submitterId,
        requestId: id,
        message: `Your request "${existing.title}" was approved.`,
      },
    }),
  ]);

  revalidatePath("/reviewer");
  revalidatePath(`/reviewer/${id}`);
  redirect(`/reviewer/${id}`);
}

export async function rejectRequest(
  id: string,
  _prevState: ReviewActionState | undefined,
  formData: FormData
): Promise<ReviewActionState> {
  const user = await requireReviewer();

  const parsed = RejectRequestSchema.safeParse({ comment: formData.get("comment") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "A reason is required." };
  }

  const existing = await prisma.expenseRequest.findUnique({ where: { id } });
  if (!existing) return { error: "Request not found." };
  if (existing.submitterId === user.id) {
    return { error: "You cannot review your own request." };
  }
  if (existing.status !== "submitted") {
    return { error: "Only submitted requests can be rejected." };
  }

  await prisma.$transaction([
    prisma.expenseRequest.update({ where: { id }, data: { status: "rejected" } }),
    prisma.reviewAction.create({
      data: {
        requestId: id,
        reviewerId: user.id,
        action: "rejected",
        comment: parsed.data.comment,
        previousStatus: "submitted",
        newStatus: "rejected",
      },
    }),
    prisma.notification.create({
      data: {
        userId: existing.submitterId,
        requestId: id,
        message: `Your request "${existing.title}" was rejected.`,
      },
    }),
  ]);

  revalidatePath("/reviewer");
  revalidatePath(`/reviewer/${id}`);
  redirect(`/reviewer/${id}`);
}

export async function markRequestPaid(
  id: string,
  _prevState: ReviewActionState | undefined,
  formData: FormData
): Promise<ReviewActionState> {
  const user = await requireReviewer();

  const parsed = ApproveRequestSchema.safeParse({ comment: formData.get("comment") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.expenseRequest.findUnique({ where: { id } });
  if (!existing) return { error: "Request not found." };
  if (existing.submitterId === user.id) {
    return { error: "You cannot review your own request." };
  }
  // A rejected request must never become Paid -- only an approved one can.
  if (existing.status !== "approved") {
    return { error: "Only approved requests can be marked as paid." };
  }

  await prisma.$transaction([
    prisma.expenseRequest.update({ where: { id }, data: { status: "paid" } }),
    prisma.reviewAction.create({
      data: {
        requestId: id,
        reviewerId: user.id,
        action: "paid",
        comment: parsed.data.comment || null,
        previousStatus: "approved",
        newStatus: "paid",
      },
    }),
    prisma.notification.create({
      data: {
        userId: existing.submitterId,
        requestId: id,
        message: `Your request "${existing.title}" was marked as paid.`,
      },
    }),
  ]);

  revalidatePath("/reviewer");
  revalidatePath(`/reviewer/${id}`);
  redirect(`/reviewer/${id}`);
}
