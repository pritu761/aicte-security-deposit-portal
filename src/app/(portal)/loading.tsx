import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading workspace…</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/80 bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between">
              <div className="w-full space-y-2">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-7 w-28" />
              </div>
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-3 w-4/5" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-card xl:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
          <Skeleton className="mt-5 h-[260px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-card">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-52" />
          <Skeleton className="mx-auto mt-8 h-[180px] w-[180px] rounded-full" />
          <div className="mt-5 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
