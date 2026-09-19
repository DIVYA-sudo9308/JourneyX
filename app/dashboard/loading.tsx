import { Skeleton } from "@/components/ui/skeleton";
import { KpiRowSkeleton } from "@/components/dashboard/kpi-row";

/**
 * Route-level Suspense fallback while the analytics query resolves (DS §29):
 * skeleton KPI row matching the final count + skeleton charts with axes.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-6">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>

      <Skeleton className="h-9 w-full max-w-xl" />

      <KpiRowSkeleton />

      <div className="rounded-md border border-border bg-surface p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-surface p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-[280px] w-full" />
        </div>
        <div className="rounded-md border border-border bg-surface p-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-4 h-[280px] w-full" />
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-[280px] w-full" />
      </div>
    </div>
  );
}
