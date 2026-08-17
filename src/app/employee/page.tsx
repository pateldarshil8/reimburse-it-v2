import Link from "next/link";
import { auth } from "@/auth";
import { listRequests } from "@/lib/requests";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function EmployeeDashboard({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const { data, totalPages, page: currentPage } = await listRequests(
    { page: page ? Number(page) : 1, pageSize: 10, sort: "newest" },
    session.user.id
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">My requests</h1>
          <p className="text-sm text-neutral-400">
            Create and track your reimbursement requests.
          </p>
        </div>
        <Button asChild>
          <Link href="/employee/new">New request</Link>
        </Button>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-400">
            You haven&apos;t created any requests yet.{" "}
            <Link href="/employee/new" className="font-medium text-violet-400 hover:text-violet-300 hover:underline">
              Create your first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((request) => (
            <Link key={request.id} href={`/employee/${request.id}`}>
              <Card className="hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-[0_0_20px_-6px_rgba(167,139,250,0.25)]">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium text-neutral-100">{request.title}</p>
                    <p className="text-sm text-neutral-400">
                      {request.category} &middot; {formatDate(request.expenseDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-medium text-neutral-100">
                      {formatCurrency(request.totalAmount.toString(), request.currency)}
                    </p>
                    <StatusBadge status={request.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Pagination basePath="/employee" currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}
