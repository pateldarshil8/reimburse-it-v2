import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listRequests, computeDashboardTotals } from "@/lib/requests";
import { formatCurrency, formatDate, formatWaitingTime } from "@/lib/format";
import { CATEGORIES } from "@/lib/validation";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = ["submitted", "approved", "rejected", "paid"] as const;

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400";

type SearchParams = {
  q?: string;
  status?: string;
  category?: string;
  requesterId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
  sort?: string;
  page?: string;
};

export default async function ReviewerQueuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const [{ data, page, totalPages }, totals, employees] = await Promise.all([
    listRequests({
      q: sp.q,
      status: sp.status,
      category: sp.category,
      requesterId: sp.requesterId,
      dateFrom: sp.dateFrom,
      dateTo: sp.dateTo,
      minAmount: sp.minAmount,
      maxAmount: sp.maxAmount,
      sort: sp.sort as "newest" | "oldest" | "amount_desc" | "amount_asc" | undefined,
      page: sp.page ? Number(sp.page) : 1,
      pageSize: 10,
    }),
    computeDashboardTotals(),
    prisma.user.findMany({
      where: { role: "employee" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const extraParams: Record<string, string | undefined> = {
    q: sp.q,
    status: sp.status,
    category: sp.category,
    requesterId: sp.requesterId,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    minAmount: sp.minAmount,
    maxAmount: sp.maxAmount,
    sort: sp.sort,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <p className="text-sm text-neutral-500">
          Requests available for review, approval, and payout.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryStat label="Pending" value={String(totals.pendingCount)} />
        <SummaryStat label="Total requested" value={formatCurrency(totals.totalRequested)} />
        <SummaryStat label="Total pending" value={formatCurrency(totals.totalPending)} />
        <SummaryStat label="Total approved" value={formatCurrency(totals.totalApproved)} />
        <SummaryStat label="Total paid" value={formatCurrency(totals.totalPaid)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6" method="get">
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" placeholder="Title, description, requester" defaultValue={sp.q} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={sp.status ?? ""} className={SELECT_CLASS}>
                <option value="">All (except drafts)</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <select id="category" name="category" defaultValue={sp.category ?? ""} className={SELECT_CLASS}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requesterId">Requester</Label>
              <select id="requesterId" name="requesterId" defaultValue={sp.requesterId ?? ""} className={SELECT_CLASS}>
                <option value="">All requesters</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sort">Sort</Label>
              <select id="sort" name="sort" defaultValue={sp.sort ?? "newest"} className={SELECT_CLASS}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount_desc">Amount: high to low</option>
                <option value="amount_asc">Amount: low to high</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateFrom">Expense date from</Label>
              <Input id="dateFrom" name="dateFrom" type="date" defaultValue={sp.dateFrom} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateTo">Expense date to</Label>
              <Input id="dateTo" name="dateTo" type="date" defaultValue={sp.dateTo} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minAmount">Min amount</Label>
              <Input id="minAmount" name="minAmount" type="number" step="0.01" min="0" defaultValue={sp.minAmount} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxAmount">Max amount</Label>
              <Input id="maxAmount" name="maxAmount" type="number" step="0.01" min="0" defaultValue={sp.maxAmount} />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
              <Button type="submit">Apply filters</Button>
              <Button asChild variant="outline">
                <Link href="/reviewer">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            No requests match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((request) => (
            <Link key={request.id} href={`/reviewer/${request.id}`}>
              <Card className="transition-colors hover:border-neutral-400">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-sm text-neutral-500">
                      {request.submitter.name} &middot; {request.category} &middot;{" "}
                      {formatDate(request.expenseDate)}
                    </p>
                    {request.status === "submitted" && (
                      <p className="text-xs text-neutral-400">
                        {formatWaitingTime(request.createdAt)}
                      </p>
                    )}
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

      <Pagination
        basePath="/reviewer"
        currentPage={page}
        totalPages={totalPages}
        extraParams={extraParams}
      />
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
