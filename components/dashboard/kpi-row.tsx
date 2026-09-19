import type { Kpi } from "@/lib/types/analytics";
import { KpiCard } from "./kpi-card";
import { Skeleton } from "@/components/ui/skeleton";

/** CSS grid, auto-fit min 200px (DS §6): 5 across on xl down to 1 on mobile. */
const GRID = "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4";

export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className={GRID}>
      {kpis.map((kpi) => (
        <KpiCard key={kpi.key} kpi={kpi} />
      ))}
    </div>
  );
}

/** Skeleton row matching the final KPI count (DS §29). */
export function KpiRowSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-md border border-border bg-surface p-5"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
