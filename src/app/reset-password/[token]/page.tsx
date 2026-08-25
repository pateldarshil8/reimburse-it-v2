"use client";

import Link from "next/link";
import { use, useActionState, useState } from "react";
import { resetPassword } from "./actions";
import { getPasswordStrength } from "@/lib/password";
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

const STRENGTH_BAR_COLORS = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400"];

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, formAction, pending] = useActionState(resetPassword, undefined);
  const [password, setPassword] = useState("");
  const strength = getPasswordStrength(password);

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
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription>This link can only be used once.</CardDescription>
          </CardHeader>
          <CardContent>
            {state?.success ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
                  Your password has been updated.
                </div>
                <Link
                  href="/login"
                  className="text-center text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="token" value={token} />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {password.length > 0 && (
                    <div className="flex flex-col gap-1 pt-1">
                      <div className="flex h-1.5 gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-colors duration-300 ${
                              i < strength.score ? STRENGTH_BAR_COLORS[strength.score - 1] : "bg-neutral-800"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-neutral-400">
                        Strength: <span className="font-medium text-neutral-200">{strength.label}</span>
                      </p>
                    </div>
                  )}
                </div>
                {state?.error && (
                  <p className="text-sm text-red-400" role="alert">
                    {state.error}
                  </p>
                )}
                <Button type="submit" disabled={pending} className="w-full">
                  {pending && <Spinner className="size-4" />}
                  {pending ? "Updating..." : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
