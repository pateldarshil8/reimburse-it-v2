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
