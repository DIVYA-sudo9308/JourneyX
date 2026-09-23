import type { Metadata } from "next";

import { EmptyState, CodeHint } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getPipelineHealth } from "@/lib/queries/pipeline";
import { cn } from "@/lib/utils";
import { formatDateTimeIST } from "@/lib/shared/format";

export const metadata: Metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

/**
 * Pipeline health (P2). Every counter here comes from `ingestion_log`, which
 * gets one row per ingestion attempt — so this is the processing history, not
 * a status mock.
 */
export default async function PipelinePage() {
  const health = await getPipelineHealth();

  if (health.totalAttempts === 0) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
        <PageHeader title="Pipeline health" subtitle="Ingestion, resolution and detection" />
        <EmptyState
          title="No events have been ingested yet"
          description={
            <>
              Seed the demo dataset, or post an event to{" "}
              <code className="font-mono">/api/v1/events</code>.
            </>
          }
          action={<CodeHint>npm run seed</CodeHint>}
        />
      </div>
    );
  }

  const cards = [
    { label: "Events processed", value: health.totalAttempts.toLocaleString("en-IN") },
    { label: "Accepted", value: health.accepted.toLocaleString("en-IN") },
    { label: "Duplicates", value: health.duplicates.toLocaleString("en-IN") },
    { label: "Rejected", value: health.rejected.toLocaleString("en-IN") },
    { label: "Failed", value: health.failed.toLocaleString("en-IN") },
    { label: "Success rate", value: `${Math.round(health.successRate * 100)}%` },
    {
      label: "Avg. latency",
      value: health.avgLatencyMs === null ? "—" : `${health.avgLatencyMs} ms`,
    },
    {
      label: "p95 latency",
      value: health.p95LatencyMs === null ? "—" : `${health.p95LatencyMs} ms`,
    },
  ];

  const maxReached = Math.max(...health.stages.map((s) => s.reached), 1);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Pipeline health"
        subtitle={`Ingestion, resolution and detection · last event ${
          health.lastIngestedAtIso ? formatDateTimeIST(health.lastIngestedAtIso) : "—"
        }`}
      />

      <section aria-label="Pipeline counters" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-md border border-border bg-surface p-4">
            <p className="text-[13px] text-text-secondary">{card.label}</p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-foreground">{card.value}</p>
          </div>
        ))}
      </section>

      <section
        aria-labelledby="stages-heading"
        className="rounded-md border border-border bg-surface p-5"
      >
        <h2 id="stages-heading" className="text-[15px] font-semibold text-foreground">
          Stages
        </h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          How far each attempt got, and the mean time spent in each stage.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {health.stages.map((stage) => (
            <li key={stage.stage} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-foreground">{stage.label}</span>
                <span className="font-mono text-[12px] tabular-nums text-text-secondary">
                  {stage.reached.toLocaleString("en-IN")} reached
                  {stage.stopped > 0 ? ` · ${stage.stopped} stopped here` : ""}
                  {stage.avgMs !== null ? ` · ${stage.avgMs} ms avg` : ""}
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-pill bg-surface-alt"
                role="img"
                aria-label={`${stage.label}: ${stage.reached} of ${maxReached} attempts`}
              >
                <div
                  className={cn(
                    "h-full rounded-pill",
                    stage.stopped > 0 ? "bg-warning" : "bg-accent",
                  )}
                  style={{ width: `${Math.round((stage.reached / maxReached) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section
          aria-labelledby="channels-heading"
          className="rounded-md border border-border bg-surface p-5"
        >
          <h2 id="channels-heading" className="text-[15px] font-semibold text-foreground">
            By channel
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-border border-t border-border">
            {health.byChannel.map((row) => (
              <li key={row.channel} className="flex items-baseline justify-between py-2">
                <span className="text-[13px] text-foreground">
                  {row.channel.replace(/_/g, " ")}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-text-secondary">
                  {row.count.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="errors-heading"
          className="rounded-md border border-border bg-surface p-5"
        >
          <h2 id="errors-heading" className="text-[15px] font-semibold text-foreground">
            Recent errors
          </h2>
          {health.recentErrors.length === 0 ? (
            <p className="mt-3 text-[13px] text-text-secondary">
              No rejected or failed ingestions in the last {health.totalAttempts} attempts.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-border border-t border-border">
              {health.recentErrors.map((error, index) => (
                <li key={index} className="py-2.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className={cn(
                        "rounded-xs px-1.5 py-0.5 text-[11px] font-medium",
                        error.outcome === "failed"
                          ? "bg-danger-tint text-danger"
                          : "bg-warning-tint text-warning",
                      )}
                    >
                      {error.outcome}
                    </span>
                    <span className="font-mono text-[12px] text-text-secondary">
                      {error.channel ?? "—"} · {error.eventType ?? "—"} · stopped at{" "}
                      {error.stageReached}
                    </span>
                    <span className="ml-auto text-[11px] text-text-muted">
                      {formatDateTimeIST(error.receivedAtIso)}
                    </span>
                  </div>
                  {error.errorMessage ? (
                    <p className="mt-1 break-words font-mono text-[12px] text-text-secondary">
                      {error.errorMessage}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
