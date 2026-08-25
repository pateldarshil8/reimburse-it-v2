"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction } from "./actions";
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

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const showMfaStep = Boolean(state?.mfaRequired);

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
        <Card
          className="w-full max-w-sm"
          style={{ boxShadow: "0 0 40px -12px rgba(167,139,250,0.15)" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full bg-violet-400"
                style={{ boxShadow: "0 0 8px 1px rgba(167,139,250,0.7)" }}
                aria-hidden="true"
              />
              {showMfaStep ? "Two-factor authentication" : "Sign in"}
            </CardTitle>
            <CardDescription>
              {showMfaStep
                ? "Enter the 6-digit code from your authenticator app, or a backup code."
                : "Community Dreams Foundation expense tracker. Sign in to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-4">
              {!showMfaStep && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-medium text-violet-400 hover:text-violet-300 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {showMfaStep && (
                <>
                  {/* Carried over from the credentials step so the Server
                      Action can re-verify the password alongside the code --
                      Server Actions are stateless between submits. */}
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="password" value={password} />
                  <p className="text-sm text-neutral-400">
                    Signing in as <span className="text-neutral-200">{email}</span>
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="code">Authentication code</Label>
                    <Input
                      id="code"
                      name="code"
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      placeholder="123456 or XXXXX-XXXXX"
                      autoFocus
                      required
                    />
                  </div>
                </>
              )}

              {state?.error && (
                <p className="text-sm text-red-400" role="alert">
                  {state.error}
                </p>
              )}

              <Button type="submit" disabled={pending} className="w-full">
                {pending && <Spinner className="size-4" />}
                {pending ? "Signing in..." : showMfaStep ? "Verify" : "Sign in"}
              </Button>
            </form>
            {!showMfaStep && (
              <p className="mt-4 text-center text-sm text-neutral-400">
                New here?{" "}
                <Link href="/signup" className="font-medium text-violet-400 hover:text-violet-300 hover:underline">
                  Create account
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
