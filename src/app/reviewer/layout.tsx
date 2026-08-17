import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/auth.config";
import { SiteNav } from "@/components/site-nav";

// See src/app/employee/layout.tsx for why this re-checks the role here
// too, instead of relying solely on the edge middleware's route match.
export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user && session.user.role !== "reviewer") {
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
