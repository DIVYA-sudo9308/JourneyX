import type { Metadata } from "next";
import Link from "next/link";

import { getAnalyticsSummary } from "@/lib/queries/analytics";
import type { Channel } from "@/lib/types/domain";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { ChartFrame } from "@/components/shared/chart-frame";
import { EmptyState, CodeHint } from "@/components/shared/empty-state";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { InsightCard } from "@/components/dashboard/insight-card";
import { FrictionRanking } from "@/components/dashboard/friction-ranking";
import { EscalationPairChart } from "@/components/dashboard/escalation-pair-chart";
import { ChurnCorrelationChart } from "@/components/dashboard/churn-correlation-chart";

export const metadata: Metadata = { title: "Dashboard" };

function formatAsOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const dateFrom = typeof params.dateFrom === "string" ? params.dateFrom : undefined;
  const dateTo = typeof params.dateTo === "string" ? params.dateTo : undefined;
  const channel =
    typeof params.channel === "string" && params.channel.length > 0
      ? (params.channel.split(",") as Channel[])
      : undefined;

  const summary = await getAnalyticsSummary({ dateFrom, dateTo, channel });
  const isEmpty = summary.totalEvents === 0;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-6">
      <PageHeader
        title="Dashboard"
        subtitle={`How is our customer experience, and where is the friction? · as of ${formatAsOf(
          summary.asOfIso,
        )}, synthetic data`}
      />

      <FilterBar asOfIso={summary.asOfIso} />

      {isEmpty ? (
        <EmptyState
          title="No events ingested yet."
          description="Seed the demo dataset from the CLI to populate journeys, or widen the date range above."
          action={<CodeHint>npm run seed</CodeHint>}
        />
      ) : (
        <>
          <KpiRow kpis={summary.kpis} />

          {summary.insight ? <InsightCard insight={summary.insight} /> : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Top friction points"
              empty={summary.frictionRanking.length === 0}
              emptyMessage="No friction points for the current filters."
            >
              <FrictionRanking data={summary.frictionRanking} />
            </ChartFrame>

            <ChartFrame
              title="Escalations by channel pair"
              empty={summary.escalationPairs.length === 0}
              emptyMessage="No escalations for the current filters."
            >
              <EscalationPairChart data={summary.escalationPairs} />
            </ChartFrame>
          </div>

          <ChartFrame
            title="Churn correlation"
            empty={summary.churnCorrelation.length === 0}
            emptyMessage="No churn correlation data for the current filters."
          >
            <ChurnCorrelationChart data={summary.churnCorrelation} />
          </ChartFrame>

          <p className="text-xs text-text-muted">
            All figures are computed from the seeded synthetic dataset — see{" "}
            <Link href="/customers" className="underline hover:text-foreground">
              Customers
            </Link>{" "}
            to investigate individual profiles.
          </p>
        </>
      )}
    </div>
  );
}
