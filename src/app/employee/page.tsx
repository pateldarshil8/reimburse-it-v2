import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmployeeDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My requests</h1>
        <p className="text-sm text-neutral-500">
          Create and track your reimbursement requests.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Day 2</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-500">
          Request creation, editing, submission, receipt upload, and status
          tracking land here.
        </CardContent>
      </Card>
    </div>
  );
}
