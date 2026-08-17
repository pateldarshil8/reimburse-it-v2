import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestForm } from "../RequestForm";

export default function NewRequestPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">New reimbursement request</h1>
        <p className="text-sm text-neutral-400">
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
