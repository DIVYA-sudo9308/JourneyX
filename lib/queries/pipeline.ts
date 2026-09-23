import { asOf } from "@/lib/shared/clock";
import type { PipelineStage } from "@/lib/pipeline/types";

import { raise, readAll } from "./shared";
import { client } from "./store";

export interface StageStat {
  stage: PipelineStage;
  label: string;
  /** Attempts that reached this stage. */
  reached: number;
  /** Attempts that stopped here (rejected, duplicate or failed). */
  stopped: number;
  /** Mean time spent in this stage, in ms. */
  avgMs: number | null;
}

export interface PipelineError {
  receivedAtIso: string;
  channel: string | null;
  eventType: string | null;
  outcome: "rejected" | "failed";
  stageReached: PipelineStage;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface PipelineHealth {
  totalAttempts: number;
  accepted: number;
  duplicates: number;
  rejected: number;
  failed: number;
  /** Accepted + duplicate over all attempts — a replay is not a failure. */
  successRate: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  stages: StageStat[];
  recentErrors: PipelineError[];
  byChannel: { channel: string; count: number }[];
  lastIngestedAtIso: string | null;
  asOfIso: string;
}

/** Pipeline stages in execution order, with the timing key each one records. */
const STAGES: { stage: PipelineStage; label: string; timing?: string }[] = [
  { stage: "parsed", label: "Parsed" },
  { stage: "validated", label: "Validated", timing: "validate" },
  { stage: "normalized", label: "Normalized", timing: "normalize" },
  { stage: "deduplicated", label: "Deduplicated", timing: "dedup" },
  { stage: "resolved", label: "Identity resolved", timing: "resolve" },
  { stage: "stored", label: "Stored", timing: "store" },
  { stage: "patterns", label: "Patterns detected", timing: "patterns" },
];

interface IngestionRow {
  received_at: string;
  channel: string | null;
  event_type: string | null;
  outcome: "accepted" | "duplicate" | "rejected" | "failed";
  stage_reached: PipelineStage;
  error_code: string | null;
  error_message: string | null;
  latency_ms: number | null;
  stage_timings: Record<string, number> | null;
}

/** How many recent attempts the health view summarizes. */
const WINDOW = 2000;

/**
 * Pipeline health from `ingestion_log` — one row per ingestion attempt, so
 * these counters are the real processing history, not a simulation.
 */
export async function getPipelineHealth(): Promise<PipelineHealth> {
  const supabase = client();
  // Past the window, end paging with an empty page: `range(from, WINDOW - 1)`
  // with from >= WINDOW is inverted and PostgREST rejects it (PGRST103).
  const rows = await readAll<IngestionRow>("pipeline.health", (from, to) =>
    from >= WINDOW
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("ingestion_log")
          .select(
            "received_at, channel, event_type, outcome, stage_reached, error_code, error_message, latency_ms, stage_timings",
          )
          .order("received_at", { ascending: false })
          .range(from, Math.min(to, WINDOW - 1)),
  );

  const count = (outcome: IngestionRow["outcome"]) =>
    rows.filter((r) => r.outcome === outcome).length;

  const accepted = count("accepted");
  const duplicates = count("duplicate");
  const rejected = count("rejected");
  const failed = count("failed");
  const total = rows.length;

  const latencies = rows
    .map((r) => r.latency_ms)
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => a - b);

  const stageOrder = STAGES.map((s) => s.stage);
  const stages: StageStat[] = STAGES.map((definition, index) => {
    const reached = rows.filter(
      (r) => stageOrder.indexOf(r.stage_reached) >= index,
    ).length;
    const stopped = rows.filter(
      (r) => r.stage_reached === definition.stage && r.outcome !== "accepted",
    ).length;
    const timings = definition.timing
      ? rows
          .map((r) => r.stage_timings?.[definition.timing!])
          .filter((n): n is number => typeof n === "number")
      : [];
    return {
      stage: definition.stage,
      label: definition.label,
      reached,
      stopped,
      avgMs: timings.length
        ? Math.round((timings.reduce((a, b) => a + b, 0) / timings.length) * 10) / 10
        : null,
    };
  });

  const byChannel = new Map<string, number>();
  for (const row of rows) {
    const key = row.channel ?? "unknown";
    byChannel.set(key, (byChannel.get(key) ?? 0) + 1);
  }

  return {
    totalAttempts: total,
    accepted,
    duplicates,
    rejected,
    failed,
    successRate: total ? (accepted + duplicates) / total : 0,
    avgLatencyMs: latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null,
    p95LatencyMs: latencies.length
      ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))]
      : null,
    stages,
    recentErrors: rows
      .filter((r) => r.outcome === "rejected" || r.outcome === "failed")
      .slice(0, 20)
      .map((r) => ({
        receivedAtIso: r.received_at,
        channel: r.channel,
        eventType: r.event_type,
        outcome: r.outcome as "rejected" | "failed",
        stageReached: r.stage_reached,
        errorCode: r.error_code,
        errorMessage: r.error_message,
      })),
    byChannel: [...byChannel.entries()]
      .map(([channel, value]) => ({ channel, count: value }))
      .sort((a, b) => b.count - a.count),
    lastIngestedAtIso: rows[0]?.received_at ?? null,
    asOfIso: asOf().toISOString(),
  };
}

/** Liveness probe for `GET /api/v1/health`. */
export async function getServiceHealth(): Promise<{ database: boolean; events: number }> {
  const supabase = client();
  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true });
  if (error) raise("health.events", error);
  return { database: true, events: count ?? 0 };
}
