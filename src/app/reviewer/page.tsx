import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReviewerQueuePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <p className="text-sm text-neutral-500">
          Approve, reject, and manage submitted requests.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Day 3</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-500">
          The submitted-request queue, search/filters, and approve / reject /
          mark-paid actions land here.
        </CardContent>
      </Card>
    </div>
  );
}
