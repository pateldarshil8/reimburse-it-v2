"use client";

import { useActionState } from "react";
import {
  approveRequest,
  rejectRequest,
  markRequestPaid,
  type ReviewActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ReviewActionState = {};

export function ReviewActions({ id, status }: { id: string; status: string }) {
  if (status === "submitted") {
    return <SubmittedActions id={id} />;
  }
  if (status === "approved") {
    return <ApprovedActions id={id} />;
  }
  return null;
}

function SubmittedActions({ id }: { id: string }) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveRequest.bind(null, id),
    initialState
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectRequest.bind(null, id),
    initialState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review this request</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form action={approveAction} className="flex flex-col gap-2">
          <Label htmlFor="approve-comment">Approve (comment optional)</Label>
          <Textarea
            id="approve-comment"
            name="comment"
            rows={2}
            placeholder="Optional note for the requester"
          />
          {approveState.error && (
            <p className="text-sm text-red-600" role="alert">
              {approveState.error}
            </p>
          )}
          <Button type="submit" disabled={approvePending} className="self-start">
            {approvePending ? "Approving..." : "Approve"}
          </Button>
        </form>

        <form action={rejectAction} className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <Label htmlFor="reject-comment">Reject (reason required)</Label>
          <Textarea
            id="reject-comment"
            name="comment"
            rows={2}
            placeholder="Explain why this request is being rejected"
            required
          />
          {rejectState.error && (
            <p className="text-sm text-red-600" role="alert">
              {rejectState.error}
            </p>
          )}
          <Button
            type="submit"
            variant="destructive"
            disabled={rejectPending}
            className="self-start"
          >
            {rejectPending ? "Rejecting..." : "Reject"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ApprovedActions({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(
    markRequestPaid.bind(null, id),
    initialState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark as paid</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-2">
          <Label htmlFor="paid-comment">Payment note (optional)</Label>
          <Textarea
            id="paid-comment"
            name="comment"
            rows={2}
            placeholder="e.g. Reimbursed via bank transfer"
          />
          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Marking as paid..." : "Mark as paid"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
