"use client";

import Link from "next/link";
import { useActionState } from "react";
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

  return (
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
            Sign in
          </CardTitle>
          <CardDescription>
            Community Dreams Foundation expense tracker. Sign in to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state?.error && (
              <p className="text-sm text-red-400" role="alert">
                {state.error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Spinner className="size-4" />}
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-400">
            New here?{" "}
            <Link href="/signup" className="font-medium text-violet-400 hover:text-violet-300 hover:underline">
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
