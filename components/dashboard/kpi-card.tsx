import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/types/analytics";

/**
 * KPI card anatomy (DS §19): uppercase muted label → mono KPI value → optional
 * delta/breakdown row. Interactive cards (with `href`) are a single button-like
 * link, raising on hover, with a visible focus ring — never color alone.
 */
export function KpiCard({ kpi }: { kpi: Kpi }) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">
        {kpi.label}
      </p>
      <p className="mt-2 font-mono text-[32px] font-semibold leading-9 tracking-[-0.02em] text-foreground">
        {kpi.value}
      </p>
      {kpi.breakdown ? (
        <p className="mt-1.5 text-[13px] text-text-secondary">
          {kpi.breakdown
            .map((b) => `${b.label} ${b.value.toLocaleString("en-IN")}`)
            .join(" · ")}
        </p>
      ) : kpi.delta ? (
        <p
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 text-[13px]",
            kpi.delta.tone === "positive" && "text-success",
            kpi.delta.tone === "negative" && "text-danger",
            kpi.delta.tone === "neutral" && "text-text-secondary",
          )}
        >
          {kpi.delta.tone === "positive" ? (
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
          ) : kpi.delta.tone === "negative" ? (
            <ArrowDownRight aria-hidden className="h-3.5 w-3.5" />
          ) : null}
          {kpi.delta.value}
        </p>
      ) : null}
    </>
  );

  const className = cn(
    "block rounded-md border border-border bg-surface p-5 text-left transition-all",
    kpi.href &&
      "hover:-translate-y-px hover:border-input hover:shadow-jx-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  if (kpi.href) {
    return (
      <Link href={kpi.href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
