import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-neutral-500">
          Manage user accounts and roles.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Day 4</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-500">
          User list with role assignment and account activation/deactivation
          here.
        </CardContent>
      </Card>
    </div>
  );
}
