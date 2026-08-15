import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestForm } from "../RequestForm";

export default function NewRequestPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">New reimbursement request</h1>
        <p className="text-sm text-neutral-500">
          Fill in the details below, then save as a draft or submit for review.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestForm />
        </CardContent>
      </Card>
    </div>
  );
}
