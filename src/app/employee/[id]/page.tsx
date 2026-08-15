import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getVisibleRequest } from "@/lib/requests";
import { resolveReceiptUrl } from "@/lib/receipts";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ReviewHistory } from "@/components/review-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestForm } from "../RequestForm";

export default async function EmployeeRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const request = await getVisibleRequest(id, session.user);
  if (!request) notFound();

  if (request.status === "draft") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Edit draft request</h1>
          <p className="text-sm text-neutral-500">
            Update the details, then save as a draft or submit for review.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Request details</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestForm existing={request} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const receiptSignedUrl = await resolveReceiptUrl(request.receiptUrl);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{request.title}</h1>
          <p className="text-sm text-neutral-500">
            {request.category} &middot; submitted {formatDate(request.createdAt)}
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
              <p className="font-medium">
                {formatCurrency(request.totalAmount.toString(), request.currency)}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Expense date</p>
              <p className="font-medium">{formatDate(request.expenseDate)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Category</p>
              <p className="font-medium">{request.category}</p>
            </div>
            <div>
              <p className="text-neutral-500">Receipt</p>
              {receiptSignedUrl ? (
                <a
                  href={receiptSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-neutral-900 underline"
                >
                  View receipt
                </a>
              ) : (
                <p className="font-medium text-neutral-400">Not available</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-neutral-500">Description</p>
            <p>{request.description}</p>
          </div>
        </CardContent>
      </Card>

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
          <Link href="/employee">Back to my requests</Link>
        </Button>
      </div>
    </div>
  );
}
