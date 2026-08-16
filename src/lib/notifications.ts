import { prisma } from "@/lib/prisma";

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}
