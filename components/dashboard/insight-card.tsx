import Link from "next/link";
import { Sparkle, ArrowRight } from "lucide-react";

import type { InsightCard as InsightCardData } from "@/lib/types/analytics";

/**
 * The deterministic, no-LLM insight (SoT §4.9, D-30): the top friction point
 * plus its affected customers' churn rate vs. baseline. Always labelled
 * "synthetic data" (P9) — this is a computed correlation, not a claim about
 * real people.
 */
export function InsightCard({ insight }: { insight: InsightCardData }) {
  const liftText = insight.lift === null ? null : `${insight.lift.toFixed(1)}×`;

  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Sparkle aria-hidden className="h-4 w-4 text-accent" />
        <h3 className="text-[15px] font-semibold leading-[22px] text-foreground">
          {insight.title}
        </h3>
      </div>

      <p className="mt-3 text-sm text-foreground">
        <span className="font-semibold capitalize">
          {insight.frictionPoint}
        </span>{" "}
        affects{" "}
        <span className="font-mono font-semibold">
          {insight.affectedCount}
        </span>{" "}
        customers, whose churn rate is{" "}
        <span className="font-mono font-semibold text-danger">
          {Math.round(insight.churnRateAffected * 100)}%
        </span>{" "}
        vs. a{" "}
        <span className="font-mono font-semibold">
          {Math.round(insight.churnRateBaseline * 100)}%
        </span>{" "}
        baseline —{" "}
        {liftText ? <><span className="font-mono font-semibold">{liftText}</span> the risk.</> : "risk multiplier unavailable."}
      </p>

      <p className="mt-2 text-xs text-text-muted">Synthetic data.</p>

      <Link
        href={insight.ctaHref}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
      >
        View affected customers
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
