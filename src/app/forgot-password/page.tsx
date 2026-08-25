"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-800 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-neutral-50">
            <span
              className="inline-block size-2 rounded-full bg-violet-400"
              style={{ boxShadow: "0 0 8px 1px rgba(167,139,250,0.7)" }}
              aria-hidden="true"
            />
            ReimburseIt
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6 animate-fade-in">
        <Card className="w-full max-w-sm" style={{ boxShadow: "0 0 40px -12px rgba(167,139,250,0.15)" }}>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              Enter your account email and, if it matches an account, we&apos;ll send a
              reset link that expires in 30 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state?.submitted ? (
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
                If an account exists for that email, a reset link has been sent.
                Check your inbox.
              </div>
            ) : (
              <form action={formAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                </div>
                <Button type="submit" disabled={pending} className="w-full">
                  {pending && <Spinner className="size-4" />}
                  {pending ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            )}
            <p className="mt-4 text-center text-sm text-neutral-400">
              <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300 hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
