import { Skeleton } from "@/components/dashboard/reputation/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex h-[calc(100vh-9rem)] min-h-[520px] overflow-hidden rounded-xl border border-[#ededec] bg-white">
        <div className="w-full space-y-3 border-r border-[#f0f0ef] p-3 lg:w-[340px]">
          <Skeleton className="h-9 w-full rounded-md" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden flex-1 items-center justify-center lg:flex">
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
