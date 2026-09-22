import type { Channel } from "@/lib/types/domain";
import type { JourneyEvent } from "@/lib/types/customer";

export interface EventRow {
  id: string;
  channel: Channel;
  event_type: string;
  timestamp: string;
  metadata: unknown;
}

/** Chronological read model; break thresholds use exact elapsed time. */
export function buildJourneyEvents(rows: EventRow[]): JourneyEvent[] {
  const events: JourneyEvent[] = [];
  let sessionIndex = -1;
  let journeyIndex = -1;
  let prevTime: number | null = null;
  let prevChannel: Channel | null = null;

  for (const row of rows) {
    const meta = (row.metadata ?? {}) as Partial<
      Pick<
        JourneyEvent,
        "summary" | "metadata" | "resolution" | "patterns" | "eventCategory"
      >
    >;
    const ts = new Date(row.timestamp as string).getTime();
    const gapMinutes = prevTime === null ? 0 : (ts - prevTime) / 60_000;
    const isJourneyStart = prevTime === null || gapMinutes > 24 * 60;
    const isTransition =
      prevChannel !== null && (row.channel as Channel) !== prevChannel;
    const isSessionStart = prevTime === null || gapMinutes > 30 || isTransition;
    if (isJourneyStart) journeyIndex += 1;
    if (isSessionStart) sessionIndex += 1;

    events.push({
      id: row.id as string,
      timestampIso: new Date(ts).toISOString(),
      channel: row.channel as Channel,
      eventType: row.event_type as string,
      eventCategory: meta.eventCategory ?? "unknown",
      summary: meta.summary ?? String(row.event_type).replace(/_/g, " "),
      metadata: meta.metadata ?? [],
      resolution:
        meta.resolution ?? {
          method: "deterministic",
          confidence: 1,
          evidence: ["Linked via an existing identifier"],
        },
      sessionIndex,
      journeyIndex,
      isSessionStart,
      isJourneyStart,
      isTransition,
      transitionFrom: isTransition ? prevChannel : null,
      gapMinutes,
      patterns: meta.patterns ?? [],
    });

    prevTime = ts;
    prevChannel = row.channel as Channel;
  }

  return events;
}
