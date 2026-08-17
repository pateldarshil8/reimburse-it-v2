import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRow } from "./UserRow";
import { AccountRequestRow } from "./AccountRequestRow";
import { formatDateTime } from "@/lib/format";

const TABS = [
  { key: "users", label: "Users" },
  { key: "requests", label: "Account Requests" },
] as const;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "requests" ? "requests" : "users";

  const session = await auth();
  const currentUserId = session?.user?.id;

  const [users, recentAudits, pendingRequests, reviewedRequestsCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.userAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        target: { select: { name: true, email: true } },
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.accountRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.accountRequest.count({ where: { status: { not: "pending" } } }),
  ]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Admin</h1>
        <p className="text-sm text-neutral-400">
          Manage user accounts, roles, and new account requests.
        </p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800">
        {TABS.map((t) => {
          const active = t.key === tab;
          const count = t.key === "requests" ? pendingRequests.length : users.length;
          return (
            <Link
              key={t.key}
              href={t.key === "users" ? "/admin" : "/admin?tab=requests"}
              className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "border-violet-400 text-violet-400"
                  : "border-transparent text-neutral-500 hover:text-violet-300"
              }`}
            >
              {t.label}
              <Badge variant={active ? "default" : "secondary"}>{count}</Badge>
            </Link>
          );
        })}
      </div>

      {tab === "users" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-xs uppercase text-neutral-500">
                      <th className="py-2 pr-4 font-medium">User</th>
                      <th className="py-2 pr-4 font-medium">Role</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <UserRow
                        key={u.id}
                        id={u.id}
                        name={u.name}
                        email={u.email}
                        role={u.role}
                        accountStatus={u.accountStatus}
                        createdAt={u.createdAt}
                        isSelf={u.id === currentUserId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent account activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAudits.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  No role or account-status changes yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {recentAudits.map((a) => (
                    <li key={a.id} className="border-b border-neutral-800 pb-2 last:border-0">
                      <span className="text-neutral-500">{formatDateTime(a.createdAt)}</span>{" "}
                      <span className="font-medium text-neutral-100">{a.actor?.name ?? "Unknown"}</span>{" "}
                      {a.action.replace("_", " ")}{" "}
                      <span className="font-medium text-neutral-100">{a.target?.name ?? "a deleted account"}</span>
                      {a.detail ? <span className="text-neutral-500"> ({a.detail})</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending account requests ({pendingRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No pending signup requests.
                {reviewedRequestsCount > 0 &&
                  ` ${reviewedRequestsCount} request${reviewedRequestsCount === 1 ? "" : "s"} reviewed previously.`}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-xs uppercase text-neutral-500">
                      <th className="py-2 pr-4 font-medium">Requester</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((r) => (
                      <AccountRequestRow
                        key={r.id}
                        id={r.id}
                        firstName={r.firstName}
                        lastName={r.lastName}
                        email={r.email}
                        createdAt={r.createdAt}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
