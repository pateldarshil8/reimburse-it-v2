import { formatDateTime } from "@/lib/format";

type ReviewActionEntry = {
  id: string;
  action: string;
  comment: string | null;
  previousStatus: string | null;
  newStatus: string;
  createdAt: Date;
  reviewer: { id: string; name: string } | null;
};

const ACTION_LABEL: Record<string, string> = {
  submitted: "Submitted for review",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Marked as paid",
};

export function ReviewHistory({ actions }: { actions: ReviewActionEntry[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-neutral-500">No history yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {actions.map((entry) => (
        <li key={entry.id} className="border-l-2 border-violet-500/20 pl-4">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium text-neutral-100">
              {ACTION_LABEL[entry.action] ?? entry.action}
            </span>
            <span className="text-neutral-500">
              by {entry.reviewer?.name ?? "the requester"}
            </span>
            <span className="text-neutral-500">
              &middot; {formatDateTime(entry.createdAt)}
            </span>
          </div>
          {entry.comment && (
            <p className="mt-1 text-sm text-neutral-400">&ldquo;{entry.comment}&rdquo;</p>
          )}
        </li>
      ))}
    </ol>
  );
}
