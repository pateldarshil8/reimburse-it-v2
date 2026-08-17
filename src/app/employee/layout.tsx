import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/auth.config";
import { SiteNav } from "@/components/site-nav";

// Re-checks the CURRENT role on every request (via auth(), which now reads
// the database fresh -- see src/auth.ts) rather than trusting only the
// edge middleware's route match. The edge (src/proxy.ts) still gates on
// the JWT's cached role, which can lag behind a role change made by an
// admin until the affected user's next login; this catches that gap so an
// already-signed-in session can't keep rendering a section's layout and
// data after an admin has moved that person out of that role.
export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user && session.user.role !== "employee") {
    redirect(ROLE_HOME[session.user.role] ?? "/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
