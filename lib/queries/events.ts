import { maskIdentifier } from "@/lib/pipeline/normalize";
import type { ResolutionEvidence } from "@/lib/pipeline/types";
import type { EventCategory, IdentifierType, LinkMethod } from "@/lib/types/customer";
import type { Channel } from "@/lib/types/domain";

import { raise } from "./shared";
import { client } from "./store";

export interface EventDetail {
  id: string;
  customerId: string;
  channel: Channel;
  eventType: string;
  eventCategory: EventCategory;
  timestampIso: string;
  metadata: Record<string, unknown>;
  /** Masked — the event API is not a way to dump raw identifiers. */
  identifiers: { type: IdentifierType; maskedValue: string }[];
  resolution: {
    method: LinkMethod;
    confidence: number;
    evidence: { signal: string; matched: boolean; contribution: number; description: string }[];
    ambiguous: boolean;
    conflict: boolean;
  } | null;
  patterns: { type: string; key: string; description: string; role: "anchor" | "related" }[];
}

interface EventRow {
  id: string;
  customer_id: string;
  channel: Channel;
  event_type: string;
  event_category: EventCategory;
  timestamp: string;
  metadata: Record<string, unknown> | null;
  identifiers: Record<string, string> | null;
  resolution_method: string;
  resolution_confidence: number | string;
}

interface ResolutionRow {
  method: string;
  confidence: number | string;
  evidence: ResolutionEvidence[] | null;
  ambiguous: boolean;
  conflict: boolean;
}

interface PatternRow {
  pattern_type: string;
  pattern_key: string;
  event_id: string | null;
  related_event_ids: string[] | null;
  metadata: Record<string, unknown> | null;
}

/** One event with the resolution decision and patterns attached to it. */
export async function getEvent(id: string): Promise<EventDetail | null> {
  const supabase = client();

  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, customer_id, channel, event_type, event_category, timestamp, metadata, identifiers, resolution_method, resolution_confidence",
    )
    .eq("id", id)
    .maybeSingle<EventRow>();
  if (error) raise("event.detail", error);
  if (!event) return null;

  const [resolutionRes, patternsRes] = await Promise.all([
    supabase
      .from("resolution_logs")
      .select("method, confidence, evidence, ambiguous, conflict")
      .eq("event_id", id)
      .maybeSingle<ResolutionRow>(),
    supabase
      .from("patterns")
      .select("pattern_type, pattern_key, event_id, related_event_ids, metadata")
      .eq("customer_id", event.customer_id)
      .or(`event_id.eq.${id},related_event_ids.cs.{${id}}`),
  ]);
  if (resolutionRes.error) raise("event.resolution", resolutionRes.error);
  if (patternsRes.error) raise("event.patterns", patternsRes.error);

  const resolution = resolutionRes.data;

  return {
    id: event.id,
    customerId: event.customer_id,
    channel: event.channel,
    eventType: event.event_type,
    eventCategory: event.event_category,
    timestampIso: event.timestamp,
    metadata: event.metadata ?? {},
    identifiers: Object.entries(event.identifiers ?? {}).map(([type, value]) => ({
      type: type as IdentifierType,
      maskedValue: maskIdentifier(type as IdentifierType, value),
    })),
    resolution: resolution
      ? {
          method: displayMethod(resolution.method),
          confidence: Number(resolution.confidence),
          evidence: (resolution.evidence ?? []).map((e) => ({
            signal: e.signal,
            matched: e.matched,
            contribution: e.contribution,
            description: e.description,
          })),
          ambiguous: resolution.ambiguous,
          conflict: resolution.conflict,
        }
      : null,
    patterns: ((patternsRes.data ?? []) as PatternRow[]).map((p) => ({
      type: p.pattern_type,
      key: p.pattern_key,
      description: (p.metadata?.description as string) ?? "",
      role: p.event_id === id ? ("anchor" as const) : ("related" as const),
    })),
  };
}

function displayMethod(method: string): LinkMethod {
  if (method === "new_profile") return "origin";
  if (method === "probabilistic") return "probabilistic";
  if (method === "conflict") return "conflict";
  return "deterministic";
}
