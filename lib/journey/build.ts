import type { DetectedPattern, ResolutionResult, StoredEventRecord } from "@/lib/pipeline/types";
import type { CustomerPattern, JourneyEvent, JourneyEventPattern, LinkMethod } from "@/lib/types/customer";
import { CHANNEL_LABEL, PATTERN_LABEL, type Channel } from "@/lib/types/domain";

/** Session and journey boundaries (SoT §4.7), computed at read time. */
export const SESSION_GAP_MINUTES = 30;
export const JOURNEY_GAP_MINUTES = 24 * 60;

export interface JourneyPatternInput extends DetectedPattern {
  id?: string;
}

export interface JourneyResolutionInput {
  eventId: string;
  result: Pick<ResolutionResult, "method" | "confidence" | "evidence">;
}

/**
 * Builds the timeline read model: one customer's stored events, ordered by
 * time, annotated with the sessions and journeys they fall into, the channel
 * transitions between them, the real resolution decision that put each event
 * on this profile, and the detector findings anchored to them.
 *
 * Nothing here is stored — journeys are a function of the events (SoT §4.7),
 * so a late-arriving event lands in its chronological place automatically.
 */
export function buildJourney(
  events: StoredEventRecord[],
  patterns: JourneyPatternInput[],
  resolutions: JourneyResolutionInput[],
  asOf: Date,
): JourneyEvent[] {
  const sorted = [...events].sort((a, b) => {
    const delta = Date.parse(a.timestampIso) - Date.parse(b.timestampIso);
    return delta !== 0 ? delta : a.id < b.id ? -1 : 1;
  });

  const resolutionByEvent = new Map(resolutions.map((r) => [r.eventId, r.result]));
  const patternsByEvent = groupPatternsByEvent(patterns);

  const out: JourneyEvent[] = [];
  let sessionIndex = -1;
  let journeyIndex = -1;
  let prevTime: number | null = null;
  let prevChannel: Channel | null = null;

  for (const event of sorted) {
    const ts = Date.parse(event.timestampIso);
    const gapMinutes = prevTime === null ? 0 : (ts - prevTime) / 60_000;
    const isJourneyStart = prevTime === null || gapMinutes > JOURNEY_GAP_MINUTES;
    const isTransition = prevChannel !== null && event.channel !== prevChannel;
    const isSessionStart =
      prevTime === null || gapMinutes > SESSION_GAP_MINUTES || isTransition;
    if (isJourneyStart) journeyIndex += 1;
    if (isSessionStart) sessionIndex += 1;

    const resolution = resolutionByEvent.get(event.id);

    out.push({
      id: event.id,
      timestampIso: new Date(ts).toISOString(),
      channel: event.channel,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      summary: summarize(event),
      metadata: metadataPairs(event.metadata),
      resolution: {
        method: displayMethod(resolution?.method ?? event.resolutionMethod),
        confidence: resolution?.confidence ?? event.resolutionConfidence,
        evidence: (resolution?.evidence ?? [])
          .filter((e) => e.matched)
          .map((e) => e.description),
      },
      sessionIndex,
      journeyIndex,
      isSessionStart,
      isJourneyStart,
      isTransition,
      transitionFrom: isTransition ? prevChannel : null,
      gapMinutes,
      patterns: patternsByEvent.get(event.id) ?? [],
    });

    prevTime = ts;
    prevChannel = event.channel;
  }

  void asOf;
  return out;
}

/** Days since the customer's last event — drives the silence marker. */
export function silenceDays(events: StoredEventRecord[], asOf: Date): number {
  const last = events.reduce(
    (max, e) => Math.max(max, Date.parse(e.timestampIso)),
    Number.NEGATIVE_INFINITY,
  );
  if (!Number.isFinite(last)) return 0;
  return Math.max(0, Math.floor((asOf.getTime() - last) / 86_400_000));
}

/**
 * Attaches each finding to its anchor event and to the events it cites, so
 * clicking a badge can highlight the whole episode.
 */
function groupPatternsByEvent(
  patterns: JourneyPatternInput[],
): Map<string, JourneyEventPattern[]> {
  const byEvent = new Map<string, JourneyEventPattern[]>();
  const add = (eventId: string, pattern: JourneyEventPattern) => {
    const list = byEvent.get(eventId);
    if (list) list.push(pattern);
    else byEvent.set(eventId, [pattern]);
  };

  for (const pattern of patterns) {
    if (pattern.patternType === "churn_signal") continue; // profile-level banner
    const type = pattern.patternType as CustomerPattern;
    const groupId = pattern.patternKey;
    const label = labelFor(pattern);

    if (pattern.eventId) {
      add(pattern.eventId, {
        type,
        label,
        detail: pattern.description,
        role: "anchor",
        groupId,
      });
    }
    for (const relatedId of pattern.relatedEventIds) {
      if (relatedId === pattern.eventId) continue;
      add(relatedId, {
        type,
        label,
        detail: pattern.description,
        role: "related",
        groupId,
      });
    }
  }
  return byEvent;
}

function labelFor(pattern: JourneyPatternInput): string {
  if (pattern.patternType === "escalation") {
    const source = pattern.details.source as Channel | undefined;
    const destination = pattern.details.destination as Channel | undefined;
    if (source && destination) {
      return `Escalation · ${CHANNEL_LABEL[source]} → ${CHANNEL_LABEL[destination]}`;
    }
  }
  if (pattern.patternType === "repeat_contact") {
    const count = pattern.details.contactCount;
    if (typeof count === "number") return `Repeat contact · ${count}×`;
  }
  if (pattern.patternType === "drop_off" && pattern.details.process === "onboarding") {
    return "Onboarding drop-off";
  }
  return PATTERN_LABEL[pattern.patternType];
}

/** `new_profile` is the origin of its own profile — shown as "origin". */
function displayMethod(method: string): LinkMethod {
  if (method === "new_profile") return "origin";
  if (method === "probabilistic") return "probabilistic";
  if (method === "conflict") return "conflict";
  return "deterministic";
}

/** One-line description for the collapsed card, built from real metadata. */
function summarize(event: StoredEventRecord): string {
  const meta = event.metadata ?? {};
  const action = event.eventType.replace(/_/g, " ");
  const parts: string[] = [];

  if (typeof meta.error_code === "string") parts.push(`failed: ${meta.error_code.replace(/_/g, " ")}`);
  else if (typeof meta.reason === "string") parts.push(meta.reason.replace(/_/g, " "));
  if (typeof meta.ticket_id === "string") parts.push(meta.ticket_id);
  if (typeof meta.product === "string") parts.push(meta.product);
  else if (typeof meta.path === "string") parts.push(meta.path);
  if (typeof meta.cart_value === "number") parts.push(formatRupees(meta.cart_value));
  else if (typeof meta.order_value === "number") parts.push(formatRupees(meta.order_value));

  const detail = parts.join(" · ");
  const label = action.charAt(0).toUpperCase() + action.slice(1);
  return detail ? `${label} — ${detail}` : label;
}

/** Turns the raw metadata object into display-ready key/value pairs. */
function metadataPairs(metadata: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(metadata ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 8)
    .map(([key, value]) => ({
      label: key.replace(/_/g, " "),
      value:
        typeof value === "number" && /value|amount|price|refund/.test(key)
          ? formatRupees(value)
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value),
    }));
}

function formatRupees(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}
