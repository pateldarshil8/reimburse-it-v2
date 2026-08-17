"use client";

import { useActionState } from "react";
import {
  approveAccountRequest,
  rejectAccountRequest,
  type AdminActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/format";

const initialState: AdminActionState = {};

type Props = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
};

export function AccountRequestRow({ id, firstName, lastName, email, createdAt }: Props) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveAccountRequest.bind(null, id),
    initialState
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectAccountRequest.bind(null, id),
    initialState
  );

  return (
    <tr className="border-b border-neutral-800 last:border-0">
      <td className="py-3 pr-4 align-top">
        <p className="font-medium text-neutral-100">
          {firstName} {lastName}
        </p>
        <p className="text-xs text-neutral-500">{email}</p>
        <p className="text-xs text-neutral-400">Requested {formatDateTime(createdAt)}</p>
      </td>
      <td className="py-3 align-top">
        <div className="flex flex-wrap gap-2">
          <form action={approveAction}>
            <Button type="submit" size="sm" disabled={approvePending || rejectPending}>
              {approvePending && <Spinner className="size-3.5" />}
              {approvePending ? "Accepting..." : "Accept"}
            </Button>
          </form>
          <form action={rejectAction}>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={approvePending || rejectPending}
            >
              {rejectPending && <Spinner className="size-3.5" />}
              {rejectPending ? "Rejecting..." : "Reject"}
            </Button>
          </form>
        </div>
        {approveState.error && <p className="mt-1 text-xs text-red-400">{approveState.error}</p>}
        {rejectState.error && <p className="mt-1 text-xs text-red-400">{rejectState.error}</p>}
      </td>
    </tr>
  );
}
