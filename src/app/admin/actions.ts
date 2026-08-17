"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/auth.config";

export type AdminActionState = { error?: string };

const VALID_ROLES: AppRole[] = ["employee", "reviewer", "admin"];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required.");
  }
  if (session.user.role !== "admin") {
    throw new Error("Only administrators can perform this action.");
  }
  return session.user;
}

// Changes a user's role and records the change in the audit trail
// (problem_statement.md section 17: administrator role/account-status
// changes should also be recorded). Backend-enforced admin-only,
// independent of whether the UI exposes this to anyone else.
export async function updateUserRole(
  targetUserId: string,
  _prevState: AdminActionState | undefined,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const rawRole = formData.get("role");
  if (typeof rawRole !== "string" || !VALID_ROLES.includes(rawRole as AppRole)) {
    return { error: "Select a valid role." };
  }
  const role = rawRole as AppRole;

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return { error: "User not found." };

  // An admin can't demote themselves via this screen -- avoids a
  // no-admins-left state with no recovery path in a hackathon-scale app.
  if (target.id === admin.id) {
    return { error: "You cannot change your own role." };
  }

  if (target.role === role) {
    return {};
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: targetUserId }, data: { role } }),
    prisma.userAudit.create({
      data: {
        targetId: targetUserId,
        actorId: admin.id,
        action: "role_changed",
        detail: `${target.role} -> ${role}`,
      },
    }),
  ]);

  revalidatePath("/admin");
  return {};
}

// Activates or deactivates a user's account. Deactivated accounts are
// blocked at login (src/auth.ts), even with a correct password.
export async function setAccountStatus(
  targetUserId: string,
  status: "active" | "inactive",
  _prevState: AdminActionState | undefined,
  _formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return { error: "User not found." };

  if (target.id === admin.id) {
    return { error: "You cannot deactivate your own account." };
  }

  if (target.accountStatus === status) {
    return {};
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: targetUserId }, data: { accountStatus: status } }),
    prisma.userAudit.create({
      data: {
        targetId: targetUserId,
        actorId: admin.id,
        action: status === "active" ? "activated" : "deactivated",
      },
    }),
  ]);

  revalidatePath("/admin");
  return {};
}

// Approves a pending signup request: creates a real `employee`-role,
// active User from the stored name/email/password hash, and marks the
// request approved. New accounts always start as `employee` -- an admin
// changes the role afterward from the Users tab, same as any other user.
export async function approveAccountRequest(
  requestId: string,
  _prevState: AdminActionState | undefined,
  _formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const request = await prisma.accountRequest.findUnique({ where: { id: requestId } });
  if (!request) return { error: "Request not found." };
  if (request.status !== "pending") return { error: "This request was already reviewed." };

  // A request can outlive a User being created for that email through some
  // other path in between -- re-check right before creating.
  const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
  if (existingUser) {
    await prisma.accountRequest.update({
      where: { id: requestId },
      data: { status: "approved", reviewedAt: new Date(), reviewedById: admin.id },
    });
    return { error: "An account with this email already exists; request marked resolved." };
  }

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name: `${request.firstName} ${request.lastName}`.trim(),
        email: request.email,
        passwordHash: request.passwordHash,
        role: "employee",
        accountStatus: "active",
      },
    }),
    prisma.accountRequest.update({
      where: { id: requestId },
      data: { status: "approved", reviewedAt: new Date(), reviewedById: admin.id },
    }),
  ]);

  revalidatePath("/admin");
  return {};
}

// Rejects a pending signup request. The request row is kept (status =
// rejected) as a record, not deleted -- the requester can submit a fresh
// request with the same email later (see src/app/signup/actions.ts).
export async function rejectAccountRequest(
  requestId: string,
  _prevState: AdminActionState | undefined,
  _formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const request = await prisma.accountRequest.findUnique({ where: { id: requestId } });
  if (!request) return { error: "Request not found." };
  if (request.status !== "pending") return { error: "This request was already reviewed." };

  await prisma.accountRequest.update({
    where: { id: requestId },
    data: { status: "rejected", reviewedAt: new Date(), reviewedById: admin.id },
  });

  revalidatePath("/admin");
  return {};
}

// Permanently deletes a user's account -- distinct from setAccountStatus's
// deactivate, which just blocks login and keeps the row. A deleted user who
// tries to log in gets the same generic "Invalid email or password" as a
// wrong password, since auth.ts's authorize() treats "no matching user" and
// "wrong password" identically (never reveals which one it was).
//
// Related rows are handled by the FK ON DELETE rules set up in the
// "support_admin_user_deletion" migration rather than by manual cleanup
// here: the user's own expense requests cascade-delete with them, their
// name is nulled out (not deleted) on review actions/audit rows tied to
// OTHER users' history, and this deletion itself is recorded in the audit
// trail before the row disappears -- targetId/actorId are nullable
// specifically so that record survives the delete instead of being
// cascade-removed with it.
export async function deleteUser(
  targetUserId: string,
  _prevState: AdminActionState | undefined,
  _formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return { error: "User not found." };

  if (target.id === admin.id) {
    return { error: "You cannot delete your own account." };
  }

  await prisma.$transaction([
    prisma.userAudit.create({
      data: {
        targetId: target.id,
        actorId: admin.id,
        action: "deleted",
        detail: `${target.name} <${target.email}>`,
      },
    }),
    prisma.user.delete({ where: { id: targetUserId } }),
  ]);

  revalidatePath("/admin");
  return {};
}
