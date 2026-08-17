import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-4 border-b border-neutral-200 pb-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
