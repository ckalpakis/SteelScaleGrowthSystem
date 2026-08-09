import { Skeleton, StatCardSkeleton, RowSkeleton } from "@/components/dashboard/reputation/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-52 rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-[#ededec] bg-white">
        <RowSkeleton rows={6} />
      </div>
    </div>
  );
}
