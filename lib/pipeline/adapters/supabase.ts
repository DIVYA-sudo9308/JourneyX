import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventCategory, IdentifierType, LinkMethod } from "@/lib/types/customer";
import type { Channel, ChurnRisk, PatternType } from "@/lib/types/domain";

import type {
  EventInsert,
  IdentifierUpsert,
  IngestionLogInput,
  NewProfileInput,
  NotificationInput,
  PipelineStore,
  ProfileUpdate,
  ResolutionLogInsert,
} from "../store";
import type {
  DetectedPattern,
  IdentifierRecord,
  NormalizedIdentifier,
  ProfileRecord,
  ResolutionMethod,
  StoredEventRecord,
} from "../types";

/** Raised when Postgres rejects a write; carries the constraint for callers. */
export class StoreError extends Error {
  code?: string;
  constructor(scope: string, error: { message?: string; code?: string }) {
    super(`${scope}: ${error.message ?? "unknown database error"}`);
    this.name = "StoreError";
    this.code = error.code;
  }
}

/** PostgREST unique-violation code — used for "already there, that's fine". */
const UNIQUE_VIOLATION = "23505";

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_id: string | null;
  is_anonymous: boolean;
  channels: Channel[] | null;
  event_count: number;
  identity_confidence: number | string;
  churn_risk: ChurnRisk;
  patterns: PatternType[] | null;
  first_seen_at: string | null;
  last_active_at: string | null;
  has_identity_conflict: boolean;
}

interface IdentifierRow {
  id: string;
  customer_id: string;
  identifier_type: IdentifierType;
  identifier_value: string;
  source: string;
  link_method: LinkMethod;
  link_confidence: number | string;
  first_seen_at: string;
  last_seen_at: string;
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
  resolution_method: ResolutionMethod;
  resolution_confidence: number | string;
}

const EVENT_COLUMNS =
  "id, customer_id, channel, event_type, event_category, timestamp, metadata, identifiers, resolution_method, resolution_confidence";
const IDENTIFIER_COLUMNS =
  "id, customer_id, identifier_type, identifier_value, source, link_method, link_confidence, first_seen_at, last_seen_at";
const PROFILE_COLUMNS =
  "id, display_name, email, phone, loyalty_id, is_anonymous, channels, event_count, identity_confidence, churn_risk, patterns, first_seen_at, last_active_at, has_identity_conflict";

/**
 * Supabase-backed `PipelineStore`. Server-only: it needs the service-role key
 * because every table's RLS policy grants SELECT alone (writes are reserved to
 * the pipeline and the seeder).
 *
 * Supabase's PostgREST client has no interactive transactions, so Transaction 1
 * is ordered so that a mid-way failure leaves no dangling references: the
 * profile and identifiers exist before the event, and the resolution log after
 * it. The permanent UNIQUE index on `events.dedup_key` makes a retry of a
 * partially-applied ingestion converge rather than duplicate.
 */
export class SupabaseStore implements PipelineStore {
  constructor(private readonly db: SupabaseClient) {}

  async findIdentifierOwners(identifiers: NormalizedIdentifier[]): Promise<IdentifierRecord[]> {
    if (identifiers.length === 0) return [];
    // One OR'd filter keeps this to a single indexed round trip.
    const filter = identifiers
      .map(
        (i) =>
          `and(identifier_type.eq.${i.type},identifier_value.eq.${quote(i.value)})`,
      )
      .join(",");
    const { data, error } = await this.db
      .from("customer_identifiers")
      .select(IDENTIFIER_COLUMNS)
      .or(filter);
    if (error) throw new StoreError("findIdentifierOwners", error);
    return (data ?? []).map(toIdentifier);
  }

  async findIdentifiersForProfiles(customerIds: string[]): Promise<IdentifierRecord[]> {
    if (customerIds.length === 0) return [];
    const { data, error } = await this.db
      .from("customer_identifiers")
      .select(IDENTIFIER_COLUMNS)
      .in("customer_id", customerIds)
      .order("first_seen_at", { ascending: true });
    if (error) throw new StoreError("findIdentifiersForProfiles", error);
    return (data ?? []).map(toIdentifier);
  }

  async findProfiles(customerIds: string[]): Promise<ProfileRecord[]> {
    if (customerIds.length === 0) return [];
    const { data, error } = await this.db
      .from("customers")
      .select(PROFILE_COLUMNS)
      .in("id", customerIds);
    if (error) throw new StoreError("findProfiles", error);
    return (data ?? []).map(toProfile);
  }

  async findEventsInWindow(
    customerIds: string[],
    fromIso: string,
    toIso: string,
  ): Promise<StoredEventRecord[]> {
    if (customerIds.length === 0) return [];
    const { data, error } = await this.db
      .from("events")
      .select(EVENT_COLUMNS)
      .in("customer_id", customerIds)
      .gte("timestamp", fromIso)
      .lte("timestamp", toIso)
      .order("timestamp", { ascending: true })
      .limit(500);
    if (error) throw new StoreError("findEventsInWindow", error);
    return (data ?? []).map(toEvent);
  }

  async findEventByDedupKey(dedupKey: string): Promise<{ id: string; customerId: string } | null> {
    const { data, error } = await this.db
      .from("events")
      .select("id, customer_id")
      .eq("dedup_key", dedupKey)
      .maybeSingle<{ id: string; customer_id: string }>();
    if (error) throw new StoreError("findEventByDedupKey", error);
    return data ? { id: data.id, customerId: data.customer_id } : null;
  }

  async createProfile(input: NewProfileInput): Promise<string> {
    const id = `cust_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const { error } = await this.db.from("customers").insert({
      id,
      display_name: input.displayName,
      is_anonymous: true,
      channels: [input.channel],
      event_count: 0,
      identity_confidence: 1,
      churn_risk: "none",
      patterns: [],
      first_seen_at: input.firstSeenIso,
      last_active_at: input.lastActiveIso,
      metadata: {},
    });
    if (error) throw new StoreError("createProfile", error);
    return id;
  }

  async upsertIdentifiers(upserts: IdentifierUpsert[]): Promise<void> {
    for (const up of upserts) {
      const { data: existing, error: readError } = await this.db
        .from("customer_identifiers")
        .select("id, first_seen_at, last_seen_at")
        .eq("customer_id", up.customerId)
        .eq("identifier_type", up.type)
        .eq("identifier_value", up.value)
        .maybeSingle<{ id: string; first_seen_at: string; last_seen_at: string }>();
      if (readError) throw new StoreError("upsertIdentifiers.read", readError);

      if (existing) {
        const { error } = await this.db
          .from("customer_identifiers")
          .update({
            first_seen_at: minIso(existing.first_seen_at, up.seenAtIso),
            last_seen_at: maxIso(existing.last_seen_at, up.seenAtIso),
          })
          .eq("id", existing.id);
        if (error) throw new StoreError("upsertIdentifiers.update", error);
        continue;
      }

      const { error } = await this.db.from("customer_identifiers").insert({
        customer_id: up.customerId,
        identifier_type: up.type,
        identifier_value: up.value,
        confidence: up.linkConfidence,
        source: up.sourceChannel,
        link_method: up.linkMethod,
        link_confidence: up.linkConfidence,
        first_seen_at: up.seenAtIso,
        last_seen_at: up.seenAtIso,
      });
      // `uq_strong_identifier`: another profile already owns it — that is a
      // conflict, recorded by the resolver, not an ingestion failure.
      if (error && error.code !== UNIQUE_VIOLATION) {
        throw new StoreError("upsertIdentifiers.insert", error);
      }
    }
  }

  async insertEvent(input: EventInsert): Promise<string> {
    const id = `evt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const { event } = input;
    const { error } = await this.db.from("events").insert({
      id,
      customer_id: input.customerId,
      event_type: event.eventType,
      event_category: event.eventCategory,
      channel: event.channel,
      timestamp: event.timestampIso,
      metadata: event.metadata,
      identifiers: Object.fromEntries(event.identifiers.map((i) => [i.type, i.value])),
      source_event_id: event.sourceEventId,
      dedup_key: event.dedupKey,
      resolution_method: input.method,
      resolution_confidence: input.confidence,
      raw_data: event.raw,
      source: input.source,
    });
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        // Concurrent ingestion of the same payload won the race.
        const existing = await this.findEventByDedupKey(event.dedupKey);
        if (existing) return existing.id;
      }
      throw new StoreError("insertEvent", error);
    }
    return id;
  }

  async insertResolutionLog(input: ResolutionLogInsert): Promise<void> {
    const { result } = input;
    const { error } = await this.db.from("resolution_logs").insert({
      event_id: input.eventId,
      customer_id: input.customerId,
      method: result.method,
      confidence: result.confidence,
      evidence: result.evidence,
      candidates: result.candidates,
      identifiers_added: result.identifiersAdded.map((i) => ({
        type: i.type,
        link_method: i.linkMethod,
        link_confidence: i.linkConfidence,
      })),
      ambiguous: result.ambiguous,
      conflict: result.conflict,
      conflict_details: result.conflictDetails,
    });
    if (error && error.code !== UNIQUE_VIOLATION) {
      throw new StoreError("insertResolutionLog", error);
    }
  }

  async updateProfile(customerId: string, update: ProfileUpdate): Promise<void> {
    const row: Record<string, unknown> = {};
    if (update.displayName !== undefined) row.display_name = update.displayName;
    if (update.email !== undefined) row.email = update.email;
    if (update.phone !== undefined) row.phone = update.phone;
    if (update.loyaltyId !== undefined) row.loyalty_id = update.loyaltyId;
    if (update.isAnonymous !== undefined) row.is_anonymous = update.isAnonymous;
    if (update.channels) row.channels = update.channels;
    if (update.eventCount !== undefined) row.event_count = update.eventCount;
    if (update.identityConfidence !== undefined) {
      row.identity_confidence = update.identityConfidence;
    }
    if (update.churnRisk) row.churn_risk = update.churnRisk;
    if (update.patterns) row.patterns = update.patterns;
    if (update.firstSeenIso) row.first_seen_at = update.firstSeenIso;
    if (update.lastActiveIso) row.last_active_at = update.lastActiveIso;
    if (update.hasIdentityConflict !== undefined) {
      row.has_identity_conflict = update.hasIdentityConflict;
    }
    if (update.patternsEvaluatedAtIso) {
      row.patterns_evaluated_at = update.patternsEvaluatedAtIso;
    }
    if (update.metadata) row.metadata = update.metadata;
    if (Object.keys(row).length === 0) return;

    const { error } = await this.db.from("customers").update(row).eq("id", customerId);
    if (error) throw new StoreError("updateProfile", error);
  }

  async findProfileEvents(customerId: string): Promise<StoredEventRecord[]> {
    const rows: EventRow[] = [];
    for (;;) {
      const { data, error } = await this.db
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("customer_id", customerId)
        .order("timestamp", { ascending: true })
        .order("id", { ascending: true })
        .range(rows.length, rows.length + 499);
      if (error) throw new StoreError("findProfileEvents", error);
      if (!data?.length) break;
      rows.push(...(data as EventRow[]));
      if (data.length < 500) break;
    }
    return rows.map(toEvent);
  }

  async upsertPatterns(customerId: string, patterns: DetectedPattern[]): Promise<void> {
    if (patterns.length === 0) return;
    const { error } = await this.db.from("patterns").upsert(
      patterns.map((p) => ({
        customer_id: customerId,
        pattern_type: p.patternType,
        pattern_key: p.patternKey,
        event_id: p.eventId,
        related_event_ids: p.relatedEventIds,
        confidence: p.confidence,
        detected_at: p.detectedAtIso,
        evaluated_as_of: p.detectedAtIso,
        metadata: { ...p.details, severity: p.severity, description: p.description },
      })),
      { onConflict: "customer_id,pattern_key" },
    );
    if (error) throw new StoreError("upsertPatterns", error);
  }

  async deletePatternsExcept(customerId: string, keepKeys: string[]): Promise<void> {
    let q = this.db.from("patterns").delete().eq("customer_id", customerId);
    if (keepKeys.length > 0) {
      q = q.not("pattern_key", "in", `(${keepKeys.map(quote).join(",")})`);
    }
    const { error } = await q;
    if (error) throw new StoreError("deletePatternsExcept", error);
  }

  async createNotification(input: NotificationInput): Promise<void> {
    const { error } = await this.db.from("notifications").insert({
      notification_type: input.type,
      severity: input.severity,
      dedupe_key: input.dedupeKey,
      title: input.title,
      message: input.message,
      customer_id: input.customerId,
      deep_link: input.deepLink,
    });
    // Duplicate dedupe_key: the alert already exists, and its read state is
    // deliberately preserved (SoT §4.10).
    if (error && error.code !== UNIQUE_VIOLATION) {
      throw new StoreError("createNotification", error);
    }
  }

  async insertIngestionLog(input: IngestionLogInput): Promise<void> {
    const { error } = await this.db.from("ingestion_log").insert({
      channel: input.channel,
      event_type: input.eventType,
      outcome: input.outcome,
      stage_reached: input.stageReached,
      error_code: input.errorCode,
      error_message: input.errorMessage,
      event_id: input.eventId,
      latency_ms: input.latencyMs,
      stage_timings: input.stageTimings,
    });
    if (error) throw new StoreError("insertIngestionLog", error);
  }
}

/** PostgREST `or()` values are comma-separated, so quote and escape them. */
function quote(value: string): string {
  return `"${value.replace(/["\\]/g, "\\$&")}"`;
}

function toIdentifier(row: IdentifierRow): IdentifierRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.identifier_type,
    value: row.identifier_value,
    sourceChannel: (row.source as Channel) ?? "web",
    linkMethod: row.link_method,
    linkConfidence: Number(row.link_confidence),
    firstSeenIso: row.first_seen_at,
    lastSeenIso: row.last_seen_at ?? row.first_seen_at,
  };
}

function toProfile(row: ProfileRow): ProfileRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    loyaltyId: row.loyalty_id,
    isAnonymous: row.is_anonymous,
    channels: row.channels ?? [],
    eventCount: row.event_count,
    identityConfidence: Number(row.identity_confidence),
    churnRisk: row.churn_risk,
    patterns: row.patterns ?? [],
    firstSeenIso: row.first_seen_at,
    lastActiveIso: row.last_active_at,
    hasIdentityConflict: row.has_identity_conflict,
  };
}

function toEvent(row: EventRow): StoredEventRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    channel: row.channel,
    eventType: row.event_type,
    eventCategory: row.event_category,
    timestampIso: row.timestamp,
    metadata: row.metadata ?? {},
    identifiers: row.identifiers ?? {},
    resolutionMethod: row.resolution_method,
    resolutionConfidence: Number(row.resolution_confidence),
  };
}

function maxIso(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function minIso(a: string, b: string): string {
  return Date.parse(a) <= Date.parse(b) ? a : b;
}
