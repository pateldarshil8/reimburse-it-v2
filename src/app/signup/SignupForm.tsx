"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitAccountRequest, type SignupState } from "./actions";
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

const initialState: SignupState = {};

const STRENGTH_BAR_COLORS = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400"];

export function SignupForm() {
  const [state, formAction, pending] = useActionState(submitAccountRequest, initialState);
  const [password, setPassword] = useState("");
  const strength = getPasswordStrength(password);

  if (state.success) {
    return (
      <Card
        className="w-full max-w-sm animate-fade-in"
        style={{ boxShadow: "0 0 40px -12px rgba(167,139,250,0.15)" }}
      >
        <CardHeader>
          <CardTitle>Request sent</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
            Account creation request has been sent to the admin. Your account
            will be activated once it&apos;s accepted.
          </div>
          <Link
            href="/login"
            className="text-center text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
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
          Create account
        </CardTitle>
        <CardDescription>
          Request access to ReimburseIt. An admin reviews new accounts before
          they&apos;re activated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">Name</Label>
              <Input id="firstName" name="firstName" placeholder="Jane" required maxLength={100} />
              {state.fieldErrors?.firstName && (
                <p className="text-xs text-red-400">{state.fieldErrors.firstName}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Surname</Label>
              <Input id="lastName" name="lastName" placeholder="Doe" required maxLength={100} />
              {state.fieldErrors?.lastName && (
                <p className="text-xs text-red-400">{state.fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            {state.fieldErrors?.email && (
              <p className="text-xs text-red-400">{state.fieldErrors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
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
                        i < strength.score
                          ? STRENGTH_BAR_COLORS[strength.score - 1]
                          : "bg-neutral-800"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-neutral-400">
                  Strength: <span className="font-medium text-neutral-200">{strength.label}</span>
                </p>
                <ul className="mt-1 grid grid-cols-1 gap-0.5 text-xs sm:grid-cols-2">
                  <li className={`transition-colors duration-200 ${strength.checks.length ? "text-green-400" : "text-neutral-600"}`}>
                    {strength.checks.length ? "✓" : "•"} At least 8 characters
                  </li>
                  <li className={`transition-colors duration-200 ${strength.checks.case ? "text-green-400" : "text-neutral-600"}`}>
                    {strength.checks.case ? "✓" : "•"} Upper &amp; lowercase letters
                  </li>
                  <li className={`transition-colors duration-200 ${strength.checks.number ? "text-green-400" : "text-neutral-600"}`}>
                    {strength.checks.number ? "✓" : "•"} At least one number
                  </li>
                  <li className={`transition-colors duration-200 ${strength.checks.special ? "text-green-400" : "text-neutral-600"}`}>
                    {strength.checks.special ? "✓" : "•"} A special character
                  </li>
                </ul>
              </div>
            )}
            {state.fieldErrors?.password && (
              <p className="text-xs text-red-400">{state.fieldErrors.password}</p>
            )}
          </div>

          {state.error && (
            <p className="text-sm text-red-400" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending && <Spinner className="size-4" />}
            {pending ? "Submitting..." : "Request account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
