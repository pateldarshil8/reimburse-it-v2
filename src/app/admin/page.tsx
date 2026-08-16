import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listUsers } from "@/lib/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserRow } from "./UserRow";
import { formatDateTime } from "@/lib/format";

type SearchParams = { q?: string; role?: string; page?: string };

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const currentUserId = session?.user?.id;

  const [{ data: users, page, totalPages, total }, recentAudits] = await Promise.all([
    listUsers({
      q: sp.q,
      role: sp.role,
      page: sp.page ? Number(sp.page) : 1,
      pageSize: 20,
    }),
    prisma.userAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        target: { select: { name: true, email: true } },
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-neutral-500">
          Manage user accounts, roles, and account status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-3" method="get">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" placeholder="Name or email" defaultValue={sp.q} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <select id="role" name="role" defaultValue={sp.role ?? ""} className={SELECT_CLASS}>
                <option value="">All roles</option>
                <option value="employee">employee</option>
                <option value="reviewer">reviewer</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <Button type="submit" size="sm">
                Apply
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
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

          <Pagination
            basePath="/admin"
            currentPage={page}
            totalPages={totalPages}
            extraParams={{ q: sp.q, role: sp.role }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent account activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAudits.length === 0 ? (
            <p className="text-sm text-neutral-500">No role or account-status changes yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recentAudits.map((a) => (
                <li key={a.id} className="border-b border-neutral-100 pb-2 last:border-0">
                  <span className="text-neutral-500">{formatDateTime(a.createdAt)}</span>{" "}
                  <span className="font-medium">{a.actor.name}</span>{" "}
                  {a.action.replace("_", " ")}{" "}
                  <span className="font-medium">{a.target.name}</span>
                  {a.detail ? <span className="text-neutral-500"> ({a.detail})</span> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
