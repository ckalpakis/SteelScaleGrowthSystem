import { Skeleton, RowSkeleton } from "@/components/dashboard/reputation/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-full max-w-xs rounded-md" />
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#ededec] bg-white">
        <RowSkeleton rows={8} />
      </div>
    </div>
  );
}
