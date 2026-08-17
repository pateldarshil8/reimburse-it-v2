"use client";

import { useActionState } from "react";
import { updateUserRole, setAccountStatus, deleteUser, type AdminActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/format";

const initialState: AdminActionState = {};

type Props = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: string;
  createdAt: Date;
  isSelf: boolean;
};

export function UserRow({ id, name, email, role, accountStatus, createdAt, isSelf }: Props) {
  const [roleState, roleAction, rolePending] = useActionState(
    updateUserRole.bind(null, id),
    initialState
  );
  const nextStatus = accountStatus === "active" ? "inactive" : "active";
  const [statusState, statusAction, statusPending] = useActionState(
    setAccountStatus.bind(null, id, nextStatus),
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUser.bind(null, id),
    initialState
  );

  return (
    <tr className="border-b border-neutral-800 last:border-0">
      <td className="py-3 pr-4 align-top">
        <p className="font-medium text-neutral-100">{name}</p>
        <p className="text-xs text-neutral-500">{email}</p>
        <p className="text-xs text-neutral-400">Joined {formatDate(createdAt)}</p>
      </td>
      <td className="py-3 pr-4 align-top">
        {isSelf ? (
          <Badge variant="secondary">{role}</Badge>
        ) : (
          <form action={roleAction} className="flex flex-col gap-1">
            {/* key={role} forces React to remount this uncontrolled <select>
                (and drop its stale defaultValue) whenever the server-fetched
                role changes after a successful update -- otherwise the
                dropdown keeps showing whatever the admin last picked in the
                UI even after the save round-trip completes. */}
            <select
              key={role}
              name="role"
              defaultValue={role}
              className="flex h-8 w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-sm text-neutral-100 shadow-sm transition-colors duration-150 hover:border-neutral-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            >
              <option value="employee">employee</option>
              <option value="reviewer">reviewer</option>
              <option value="admin">admin</option>
            </select>
            <Button type="submit" size="sm" variant="outline" disabled={rolePending}>
              {rolePending && <Spinner className="size-3.5" />}
              {rolePending ? "Saving..." : "Update role"}
            </Button>
            {roleState.error && <p className="text-xs text-red-400">{roleState.error}</p>}
          </form>
        )}
      </td>
      <td className="py-3 pr-4 align-top">
        <Badge variant={accountStatus === "active" ? "success" : "destructive"}>
          {accountStatus}
        </Badge>
      </td>
      <td className="py-3 align-top">
        {isSelf ? (
          <span className="text-xs text-neutral-400">-</span>
        ) : (
          <div className="flex flex-col gap-2">
            <form action={statusAction}>
              <Button
                type="submit"
                size="sm"
                variant={accountStatus === "active" ? "destructive" : "outline"}
                disabled={statusPending || deletePending}
              >
                {statusPending && <Spinner className="size-3.5" />}
                {statusPending
                  ? "Saving..."
                  : accountStatus === "active"
                    ? "Deactivate"
                    : "Activate"}
              </Button>
              {statusState.error && <p className="text-xs text-red-400">{statusState.error}</p>}
            </form>

            <form action={deleteAction}>
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                disabled={statusPending || deletePending}
                onClick={(e) => {
                  if (
                    !confirm(
                      `Permanently delete ${name}'s account? This removes their login and all of their own requests, and cannot be undone.`
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                {deletePending && <Spinner className="size-3.5" />}
                {deletePending ? "Deleting..." : "Delete"}
              </Button>
              {deleteState.error && <p className="text-xs text-red-400">{deleteState.error}</p>}
            </form>
          </div>
        )}
      </td>
    </tr>
  );
}
