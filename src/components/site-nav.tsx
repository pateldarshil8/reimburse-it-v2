import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { unreadNotificationCount } from "@/lib/notifications";

const NAV_LINKS: Record<string, { href: string; label: string }> = {
  employee: { href: "/employee", label: "My requests" },
  reviewer: { href: "/reviewer", label: "Review queue" },
  admin: { href: "/admin", label: "Admin" },
};

export async function SiteNav() {
  const session = await auth();
  const role = session?.user?.role;
  const link = role ? NAV_LINKS[role] : undefined;
  const unreadCount = session?.user
    ? await unreadNotificationCount(session.user.id)
    : 0;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold">
            ReimburseIt
          </Link>
          {link && (
            <nav className="flex items-center gap-4 text-sm text-neutral-600">
              <Link href={link.href} className="hover:text-neutral-900">
                {link.label}
              </Link>
            </nav>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {session?.user && (
            <>
              <Link
                href="/notifications"
                className="relative text-sm text-neutral-600 hover:text-neutral-900"
              >
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1.5">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
              <Badge variant="secondary">{session.user.role}</Badge>
              <span className="hidden text-sm text-neutral-600 sm:inline">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
