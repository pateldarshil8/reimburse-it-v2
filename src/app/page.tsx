import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const ROLE_HOME: Record<string, string> = {
  employee: "/employee",
  reviewer: "/reviewer",
  admin: "/admin",
};

const PIPELINE = ["Draft", "Submitted", "Approved", "Paid"] as const;

const FEATURES = [
  {
    title: "Submit in minutes",
    body:
      "Log an expense, attach the receipt, save it as a draft or send it straight for review. Required fields and receipt uploads are validated before anything reaches a reviewer.",
  },
  {
    title: "Role-based access, enforced server-side",
    body:
      "Employees, reviewers, and admins each land on their own workspace. Access checks run on the server for every route and action, not just hidden nav links.",
  },
  {
    title: "A queue built for reviewers",
    body:
      "Search by keyword, filter by status, category, requester, or date, and sort by amount or age. Approve, reject with a required reason, or mark a request paid.",
  },
  {
    title: "Every decision is logged",
    body:
      "Approvals, rejections, payments, and admin role or status changes all write to an audit trail, so there's a full history behind every request and every account.",
  },
  {
    title: "Receipts stored privately",
    body:
      "Files live in a private storage bucket, served through short-lived signed URLs. Uploads are checked against their actual bytes, not just the filename.",
  },
  {
    title: "Self-service accounts",
    body:
      "New teammates request access from the sign-in page. An admin reviews the request and approving it creates a real, active account — no shared logins.",
  },
];

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect(ROLE_HOME[session.user.role] ?? "/employee");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-800 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-neutral-50">
            <span
              className="inline-block size-2 rounded-full bg-violet-400"
              style={{ boxShadow: "0 0 8px 1px rgba(167,139,250,0.7)" }}
              aria-hidden="true"
            />
            ReimburseIt
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 animate-fade-in">
        {/* Hero: asymmetric two-column, copy left / pipeline card right */}
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[3fr_2fr] lg:items-center lg:py-24">
          <div className="flex flex-col gap-5">
            <Badge className="w-fit">Built for the CDF SDE Hackathon</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
              Expense reimbursements, from receipt to payout,
              <span className="text-violet-400"> without the spreadsheet.</span>
            </h1>
            <p className="max-w-md text-neutral-400">
              ReimburseIt gives small teams one place to submit, review, and
              track reimbursements — replacing email threads and shared
              spreadsheets with a workflow every role can see the state of.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/signup">Create an account</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <Card style={{ boxShadow: "0 0 40px -12px rgba(167,139,250,0.15)" }}>
            <CardContent className="flex flex-col gap-4 py-6">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Request lifecycle
              </p>
              <div className="flex flex-col gap-2">
                {PIPELINE.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        i === PIPELINE.length - 1
                          ? "bg-violet-500 text-neutral-950"
                          : "border border-neutral-700 text-neutral-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={
                        i === PIPELINE.length - 1
                          ? "text-sm font-medium text-neutral-50"
                          : "text-sm text-neutral-400"
                      }
                    >
                      {step}
                    </span>
                    {i < PIPELINE.length - 1 && (
                      <span className="ml-auto h-px flex-1 bg-neutral-800" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-500">
                Reviewers can reject at any point before payout — every step
                is recorded in the audit trail.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* How it works: three-step horizontal strip, distinct from the feature grid below */}
        <section className="border-y border-neutral-800 bg-neutral-950/40">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
            <div className="grid gap-8 sm:grid-cols-3">
              <Step n="01" title="Submit" body="Employees log an expense with a receipt and send it for review." />
              <Step n="02" title="Review" body="Reviewers approve, reject with a reason, or hold it in the queue." />
              <Step n="03" title="Get paid" body="Approved requests are marked paid, closing the loop for everyone." />
            </div>
          </div>
        </section>

        {/* Feature grid: uniform 3-up, not the reference's asymmetric sizing */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mb-10 max-w-lg">
            <h2 className="text-xl font-semibold text-neutral-50">
              Everything a small team needs to run reimbursements
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              No plugins, no spreadsheet macros — just the parts of the
              process that actually need software.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="hover:border-violet-500/40">
                <CardContent className="flex flex-col gap-2 py-5">
                  <h3 className="font-medium text-neutral-100">{f.title}</h3>
                  <p className="text-sm text-neutral-400">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-neutral-800">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-14 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-50">Ready to try it?</h2>
              <p className="text-sm text-neutral-400">
                Request an account, or sign in if you already have one.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/signup">Create an account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-800">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-neutral-600 sm:px-6">
          ReimburseIt — built for the Community Dreams Foundation SDE Hackathon.
        </div>
      </footer>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-violet-400">{n}</span>
      <h3 className="font-medium text-neutral-100">{title}</h3>
      <p className="text-sm text-neutral-400">{body}</p>
    </div>
  );
}
