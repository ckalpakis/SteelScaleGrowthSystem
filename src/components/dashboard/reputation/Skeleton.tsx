import { cn } from "@/components/ui";

// Shimmering placeholder block used while data loads.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#ececea]", className)} aria-hidden />;
}

// A card-shaped skeleton matching the StatCard footprint.
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#ededec] bg-white p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

// Rows of skeletons for tables/lists.
export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[#f0f0ef]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
