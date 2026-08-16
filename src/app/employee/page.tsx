import Link from "next/link";
import { auth } from "@/auth";
import { listMyRequests, computeDashboardTotals } from "@/lib/requests";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function EmployeeDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const [requests, totals] = await Promise.all([
    listMyRequests(session.user.id),
    computeDashboardTotals(session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My requests</h1>
          <p className="text-sm text-neutral-500">
            Create and track your reimbursement requests.
          </p>
        </div>
        <Button asChild>
          <Link href="/employee/new">New request</Link>
        </Button>
      </div>

      {requests.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Total requested" value={formatCurrency(totals.totalRequested)} />
          <SummaryStat label="Pending review" value={formatCurrency(totals.totalPending)} />
          <SummaryStat label="Approved" value={formatCurrency(totals.totalApproved)} />
          <SummaryStat label="Paid" value={formatCurrency(totals.totalPaid)} />
        </div>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            You haven&apos;t created any requests yet.{" "}
            <Link href="/employee/new" className="underline">
              Create your first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <Link key={request.id} href={`/employee/${request.id}`}>
              <Card className="transition-colors hover:border-neutral-400">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-sm text-neutral-500">
                      {request.category} &middot; {formatDate(request.expenseDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-medium">
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
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
