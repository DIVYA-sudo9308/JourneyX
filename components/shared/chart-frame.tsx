import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Wrapper every dashboard chart renders inside (DS §19 card surface, §29
 * loading, §34.2 rule 7 empty-chart pattern). Exactly one of `loading` /
 * `empty` / children applies at a time.
 */
export function ChartFrame({
  title,
  loading,
  empty,
  emptyMessage = "No data for the current filters.",
  height = 280,
  children,
}: {
  title: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  height?: number;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <h3 className="text-[15px] font-semibold leading-[22px] text-foreground">
        {title}
      </h3>
      <div className="mt-4" style={{ height }}>
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-center">
            <p className="text-sm text-text-muted">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
