"use client";

import { useActionState, useState, useTransition } from "react";
import { generateMfaSetupInit, confirmMfaSetup, type MfaSetupInit } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function MfaEnroll() {
  const [setupInit, setSetupInit] = useState<MfaSetupInit | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmMfaSetup, undefined);

  if (confirmState?.backupCodes) {
    return <BackupCodesDisplay codes={confirmState.backupCodes} />;
  }

  if (!setupInit) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-400">
          Two-factor authentication adds a 6-digit code from an authenticator
          app (Google Authenticator, Authy, 1Password, etc.) as a second
          factor at login, on top of your password.
        </p>
        <Button
          className="w-fit"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const init = await generateMfaSetupInit();
              setSetupInit(init);
            });
          }}
        >
          {isPending && <Spinner className="size-4" />}
          {isPending ? "Generating..." : "Enable two-factor authentication"}
        </Button>
      </div>
    );
  }

  return (
    <form action={confirmAction} className="flex flex-col gap-4">
      <input type="hidden" name="secret" value={setupInit.secret} />
      <p className="text-sm text-neutral-400">
        Scan this QR code with your authenticator app, then enter the
        6-digit code it shows to confirm setup.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, not a remote image */}
      <img
        src={setupInit.qrDataUrl}
        alt="QR code for two-factor authentication setup"
        className="h-48 w-48 self-center rounded-lg border border-neutral-800 bg-white p-2"
      />
      <details className="text-sm text-neutral-400">
        <summary className="cursor-pointer text-violet-400 hover:text-violet-300">
          Can&apos;t scan? Enter this key manually
        </summary>
        <code className="mt-2 block break-all rounded bg-neutral-900 p-2 text-xs text-neutral-300">
          {setupInit.secret}
        </code>
      </details>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">6-digit code</Label>
        <Input id="code" name="code" type="text" inputMode="numeric" autoFocus required />
      </div>
      {confirmState?.error && (
        <p className="text-sm text-red-400" role="alert">
          {confirmState.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={confirmPending}>
          {confirmPending && <Spinner className="size-4" />}
          {confirmPending ? "Verifying..." : "Confirm and enable"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setSetupInit(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function BackupCodesDisplay({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
        Two-factor authentication is now enabled.
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-100">Save your backup codes</p>
        <p className="mt-1 text-sm text-neutral-400">
          Each code can be used once to sign in if you lose access to your
          authenticator app. They won&apos;t be shown again -- store them
          somewhere safe.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 font-mono text-sm text-neutral-200">
          {codes.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
      </div>
      <Button className="w-fit" onClick={() => window.location.reload()}>
        Done
      </Button>
    </div>
  );
}
