import { cn } from "@/lib/utils";

// Loading placeholder used by each route segment's loading.tsx (App Router
// Suspense boundary) so navigating into a data-fetching page shows a shaped
// skeleton instead of a blank panel or a full-page spinner.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-800", className)}
      {...props}
    />
  );
}
