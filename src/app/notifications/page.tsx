import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listNotifications } from "@/lib/notifications";
import { markNotificationRead, markAllNotificationsRead } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

const REQUEST_DETAIL_PREFIX: Record<string, string> = {
  employee: "/employee",
  reviewer: "/reviewer",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const notifications = await listNotifications(session.user.id);
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const detailPrefix = REQUEST_DETAIL_PREFIX[session.user.role];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">Notifications</h1>
          <p className="text-sm text-neutral-400">
            Updates on your requests and account.
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            All notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-neutral-400">No notifications yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {notifications.map((n) => {
                const canLink = Boolean(n.requestId && detailPrefix);
                const message = (
                  <div>
                    <p className={n.readAt ? "text-sm text-neutral-500" : "text-sm font-medium text-neutral-100"}>
                      {n.message}
                    </p>
                    <p className="text-xs text-neutral-400">{formatDateTime(n.createdAt)}</p>
                  </div>
                );

                return (
                  <li
                    key={n.id}
                    className={`flex items-start justify-between gap-4 rounded-lg border p-3 transition-colors duration-150 ${
                      n.readAt ? "border-neutral-800" : "border-violet-500/30 bg-violet-500/10"
                    }`}
                  >
                    {canLink ? (
                      <Link
                        href={`${detailPrefix}/${n.requestId}`}
                        className="flex-1 hover:opacity-80"
                      >
                        {message}
                      </Link>
                    ) : (
                      <div className="flex-1">{message}</div>
                    )}
                    {!n.readAt && (
                      <form action={markNotificationRead.bind(null, n.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Mark read
                        </Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
