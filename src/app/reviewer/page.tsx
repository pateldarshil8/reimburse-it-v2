import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listRequests, computeDashboardTotals } from "@/lib/requests";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORIES } from "@/lib/validation";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = ["submitted", "approved", "rejected", "paid"] as const;

const SELECT_CLASS =
  "flex h-9 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 shadow-sm transition-colors duration-150 hover:border-neutral-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30";

type SearchParams = {
  q?: string;
  status?: string;
  category?: string;
  requesterId?: string;
  dateFrom?: string;
  dateTo?: string;
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
    sort: sp.sort,
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Review queue</h1>
        <p className="text-sm text-neutral-400">
          Approve, reject, or mark submitted requests as paid.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryStat label="Pending" value={String(totals.pendingCount)} />
        <SummaryStat label="Total pending" value={formatCurrency(totals.totalPending)} />
        <SummaryStat label="Total requested" value={formatCurrency(totals.totalRequested)} />
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
          <CardContent className="py-10 text-center text-sm text-neutral-400">
            No requests match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((request) => (
            <Link key={request.id} href={`/reviewer/${request.id}`}>
              <Card className="hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-[0_0_20px_-6px_rgba(167,139,250,0.25)]">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium text-neutral-100">{request.title}</p>
                    <p className="text-sm text-neutral-400">
                      {request.submitter.name} &middot; {request.category} &middot;{" "}
                      {formatDate(request.expenseDate)}
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
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="text-lg font-semibold text-neutral-50">{value}</p>
      </CardContent>
    </Card>
  );
}
