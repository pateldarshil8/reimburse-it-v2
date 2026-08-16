"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required.");
  }
  return session.user;
}

// Marks a single notification read. Scoped to the current user's own
// notifications -- updateMany with a userId filter means a crafted request
// for someone else's notification id simply matches zero rows.
export async function markNotificationRead(notificationId: string) {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}
