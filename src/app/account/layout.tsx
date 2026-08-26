import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";

// Defense in depth, same pattern as employee/reviewer/admin layouts:
// middleware (src/proxy.ts + src/auth.config.ts) already blocks
// unauthenticated requests to /account, but this re-checks server-side
// rather than relying solely on middleware.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
