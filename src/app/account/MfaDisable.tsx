"use client";

import { useActionState } from "react";
import { disableMfa } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function MfaDisable({ enabledAt }: { enabledAt: string }) {
  const [state, formAction, pending] = useActionState(disableMfa, undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
        Two-factor authentication is enabled (since {enabledAt}).
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-red-400 hover:text-red-300">
          Disable two-factor authentication
        </summary>
        <form action={formAction} className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-neutral-400">
            Enter your password to confirm. This removes your backup codes too.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disable-password">Password</Label>
            <Input id="disable-password" name="password" type="password" required />
          </div>
          {state?.error && (
            <p className="text-sm text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" variant="outline" disabled={pending} className="w-fit">
            {pending && <Spinner className="size-4" />}
            {pending ? "Disabling..." : "Disable two-factor authentication"}
          </Button>
        </form>
      </details>
    </div>
  );
}
