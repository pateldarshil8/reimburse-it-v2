import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requestDetailInclude } from "@/lib/requests";
import { resolveReceiptUrl } from "@/lib/receipts";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ReviewHistory } from "@/components/review-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewActions } from "../ReviewActions";

export default async function ReviewerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  // Reviewers and admins can see any request -- unlike the employee detail
  // page, there's no submitter-scoped restriction here.
  const request = await prisma.expenseRequest.findUnique({
    where: { id },
    include: requestDetailInclude(),
  });
  if (!request) notFound();

  const receiptSignedUrl = await resolveReceiptUrl(request.receiptUrl);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">{request.title}</h1>
          <p className="text-sm text-neutral-400">
            {request.submitter.name} &middot; {request.submitter.email}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-neutral-500">Amount</p>
              <p className="font-medium text-neutral-100">
                {formatCurrency(request.totalAmount.toString(), request.currency)}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Expense date</p>
              <p className="font-medium text-neutral-100">{formatDate(request.expenseDate)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Category</p>
              <p className="font-medium text-neutral-100">{request.category}</p>
            </div>
            <div>
              <p className="text-neutral-500">Receipt</p>
              {receiptSignedUrl ? (
                <a
                  href={receiptSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-violet-400 hover:text-violet-300 hover:underline"
                >
                  View receipt
                </a>
              ) : (
                <p className="font-medium text-neutral-600">Not available</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-neutral-500">Description</p>
            <p>{request.description}</p>
          </div>
        </CardContent>
      </Card>

      <ReviewActions id={request.id} status={request.status} />

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewHistory actions={request.reviewActions} />
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href="/reviewer">Back to review queue</Link>
        </Button>
      </div>
    </div>
  );
}
