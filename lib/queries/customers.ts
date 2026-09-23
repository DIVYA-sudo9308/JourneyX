import { cache } from "react";

import { buildJourney, silenceDays } from "@/lib/journey/build";
import { maskIdentifier } from "@/lib/pipeline/normalize";
import type {
  DetectedPattern,
  ResolutionEvidence,
  StoredEventRecord,
} from "@/lib/pipeline/types";
import { asOf } from "@/lib/shared/clock";
import {
  CHANNELS,
  CHURN_RISK_LEVELS,
  type Channel,
  type ChurnRisk,
  type PatternType,
} from "@/lib/types/domain";
import type {
  ChurnSignal,
  CustomerDetail,
  CustomerIdentifier,
  CustomerJourney,
  CustomerListFilters,
  CustomerListItem,
  CustomerListResult,
  CustomerPattern,
  CustomerSearchHit,
  CustomerSearchResult,
  EventCategory,
  IdentifierType,
  IdentityConflictSummary,
  IdentityFragment,
  IdentityGraph,
  IdentityNode,
  LinkMethod,
  ResolutionChainStep,
} from "@/lib/types/customer";

import { QueryError, raise, readAll, dateRange } from "./shared";
import { client } from "./store";
export { QueryError } from "./shared";

const LIST_PATTERNS: CustomerPattern[] = [
  "drop_off",
  "escalation",
  "repeat_contact",
  "unresolved_issue",
];
const SORT_KEYS: CustomerSortKey[] = ["lastActive", "eventCount", "churnRisk"];

type CustomerSortKey = NonNullable<CustomerListFilters["sortBy"]>;

function normalizeFilters(filters: CustomerListFilters) {
  const patterns = filters.pattern?.filter((p): p is CustomerPattern =>
    LIST_PATTERNS.includes(p),
  );
  const channels = filters.channel?.filter((c): c is Channel => CHANNELS.includes(c));
  const churnRisk = filters.churnRisk?.filter((r): r is ChurnRisk =>
    CHURN_RISK_LEVELS.includes(r),
  );
  const sortBy: CustomerSortKey | undefined =
    filters.sortBy && SORT_KEYS.includes(filters.sortBy) ? filters.sortBy : undefined;
  const sortOrder =
    filters.sortOrder === "asc" || filters.sortOrder === "desc" ? filters.sortOrder : undefined;
  const minConfidence =
    filters.minConfidence !== undefined && !Number.isNaN(filters.minConfidence)
      ? Math.min(1, Math.max(0, filters.minConfidence))
      : undefined;

  const dates = dateRange(filters.dateFrom, filters.dateTo);
  return { patterns, channels, churnRisk, sortBy, sortOrder, minConfidence, ...dates };
}

interface CustomerRow {
  id: string;
  display_name: string | null;
  email: string | null;
  is_anonymous: boolean;
  channels: Channel[] | null;
  event_count: number;
  last_active_at: string | null;
  identity_confidence: number | string;
  patterns: CustomerPattern[] | null;
  churn_risk: ChurnRisk;
}

function maskEmail(raw: string | null): string | null {
  if (!raw) return null;
  const [local, domain] = raw.split("@");
  if (!local || !domain) return null;
  return `${local[0]?.toLowerCase() ?? "x"}***@${domain}`;
}

function rowToListItem(row: CustomerRow): CustomerListItem {
  return {
    id: row.id,
    displayName: row.display_name,
    maskedEmail: maskEmail(row.email),
    isAnonymous: row.is_anonymous,
    channels: (row.channels ?? []).filter((c) => CHANNELS.includes(c)),
    eventCount: row.event_count,
    lastActiveIso: row.last_active_at ?? new Date(0).toISOString(),
    identityConfidence: Number(row.identity_confidence),
    patterns: (row.patterns ?? []).filter((p) => LIST_PATTERNS.includes(p)),
    churnRisk: row.churn_risk,
  };
}

/** JSONB "any of" filter — produces `col @> '[v1]' OR col @> '[v2]' ...`. */
function jsonbOverlapOr(column: string, values: string[]): string {
  return values.map((v) => `${column}.cs.${JSON.stringify([v])}`).join(",");
}

/**
 * Server-side customer query (SoT D-34). Reads `public.customers` from
 * Supabase with URL-param filters applied in-DB. Uses the service role client
 * (server-only) so RLS/anon-grant gaps never mask the read.
 */
export async function getCustomers(
  filters: CustomerListFilters,
): Promise<CustomerListResult> {
  const norm = normalizeFilters(filters);
  const supabase = client();

  const page = Number.isFinite(filters.page) ? Math.max(1, Math.floor(filters.page!)) : 1;
  const pageSize = Number.isFinite(filters.pageSize)
    ? Math.max(1, Math.min(200, Math.floor(filters.pageSize!)))
    : 25;

  const totalUnfilteredRes = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true });
  if (totalUnfilteredRes.error) raise("customers.count", totalUnfilteredRes.error);
  const totalUnfiltered = totalUnfilteredRes.count ?? 0;

  let q = supabase
    .from("customers")
    .select(
      "id, display_name, email, is_anonymous, channels, event_count, last_active_at, identity_confidence, patterns, churn_risk",
      { count: "exact" },
    );

  if (norm.churnRisk && norm.churnRisk.length > 0) q = q.in("churn_risk", norm.churnRisk);
  if (norm.minConfidence !== undefined) {
    q = q.gte("identity_confidence", norm.minConfidence);
  }
  if (norm.fromIso) q = q.gte("last_active_at", norm.fromIso);
  if (norm.untilIso) q = q.lt("last_active_at", norm.untilIso);
  if (norm.patterns && norm.patterns.length > 0) q = q.or(jsonbOverlapOr("patterns", norm.patterns));
  if (norm.channels && norm.channels.length > 0) q = q.or(jsonbOverlapOr("channels", norm.channels));

  const sortBy = norm.sortBy ?? "lastActive";
  const sortOrder = norm.sortOrder ?? "desc";
  let ascending = sortOrder === "asc";
  let column: string;
  if (sortBy === "eventCount") column = "event_count";
  else if (sortBy === "churnRisk") {
    // Text order: high < medium < none. So "desc" (worst-first) is ASC alpha.
    column = "churn_risk";
    ascending = sortOrder === "desc";
  } else column = "last_active_at";

  q = q.order(column, { ascending, nullsFirst: false }).order("id", { ascending: true });

  const from = (page - 1) * pageSize;
  q = q.range(from, from + pageSize - 1);

  const filtered = await q;
  if (filtered.error) raise("customers.list", filtered.error);
  const rows = (filtered.data ?? []) as CustomerRow[];

  return {
    items: rows.map(rowToListItem),
    total: filtered.count ?? rows.length,
    totalUnfiltered,
    page,
    pageSize,
    asOfIso: asOf().toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Shared row shapes
 * ------------------------------------------------------------------ */

interface IdentifierRow {
  id: string;
  customer_id: string;
  identifier_type: IdentifierType;
  identifier_value: string;
  source: string;
  link_method: LinkMethod;
  link_confidence: number | string;
  first_seen_at: string;
  last_seen_at: string | null;
}

interface PatternRow {
  id: string;
  pattern_type: PatternType;
  pattern_key: string;
  event_id: string | null;
  related_event_ids: string[] | null;
  confidence: number | string;
  detected_at: string;
  metadata: Record<string, unknown> | null;
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
  event_id: string;
  method: string;
  confidence: number | string;
  evidence: ResolutionEvidence[] | null;
  identifiers_added: { type: IdentifierType }[] | null;
  ambiguous: boolean;
  conflict: boolean;
  conflict_details: {
    competingProfileIds?: string[];
    identifiers?: { customerId: string; type: IdentifierType; maskedValue: string }[];
  } | null;
  created_at: string;
}

const EVENT_COLUMNS =
  "id, customer_id, channel, event_type, event_category, timestamp, metadata, identifiers, resolution_method, resolution_confidence";
const PATTERN_COLUMNS =
  "id, pattern_type, pattern_key, event_id, related_event_ids, confidence, detected_at, metadata";
const RESOLUTION_COLUMNS =
  "event_id, method, confidence, evidence, identifiers_added, ambiguous, conflict, conflict_details, created_at";

function toStoredEvent(row: EventRow): StoredEventRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    channel: row.channel,
    eventType: row.event_type,
    eventCategory: row.event_category,
    timestampIso: row.timestamp,
    metadata: row.metadata ?? {},
    identifiers: row.identifiers ?? {},
    resolutionMethod: row.resolution_method as StoredEventRecord["resolutionMethod"],
    resolutionConfidence: Number(row.resolution_confidence),
  };
}

function toDetectedPattern(row: PatternRow): DetectedPattern {
  const metadata = row.metadata ?? {};
  return {
    patternType: row.pattern_type,
    patternKey: row.pattern_key,
    eventId: row.event_id,
    relatedEventIds: row.related_event_ids ?? [],
    confidence: Number(row.confidence),
    detectedAtIso: row.detected_at,
    severity: (metadata.severity as DetectedPattern["severity"]) ?? "medium",
    description: (metadata.description as string) ?? "",
    details: metadata,
  };
}

/** `new_profile` is the origin of its own profile — shown as "origin". */
function displayMethod(method: string): LinkMethod {
  if (method === "new_profile") return "origin";
  if (method === "probabilistic") return "probabilistic";
  if (method === "conflict") return "conflict";
  return "deterministic";
}

async function readEvents(customerId: string): Promise<StoredEventRecord[]> {
  const supabase = client();
  const rows = await readAll<EventRow>("journey.events", (from, to) =>
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("customer_id", customerId)
      .order("timestamp", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  return rows.map(toStoredEvent);
}

async function readPatterns(customerId: string): Promise<DetectedPattern[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from("patterns")
    .select(PATTERN_COLUMNS)
    .eq("customer_id", customerId)
    .order("detected_at", { ascending: true });
  if (error) raise("customer.patterns", error);
  return ((data ?? []) as PatternRow[]).map(toDetectedPattern);
}

async function readIdentifiers(customerId: string): Promise<IdentifierRow[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from("customer_identifiers")
    .select("id, customer_id, identifier_type, identifier_value, source, link_method, link_confidence, first_seen_at, last_seen_at")
    .eq("customer_id", customerId)
    .order("first_seen_at", { ascending: true });
  if (error) raise("customer.identifiers", error);
  return (data ?? []) as IdentifierRow[];
}

async function readResolutions(customerId: string): Promise<ResolutionRow[]> {
  return readAll<ResolutionRow>("customer.resolutions", (from, to) =>
    client()
      .from("resolution_logs")
      .select(RESOLUTION_COLUMNS)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true })
      .order("event_id", { ascending: true })
      .range(from, to),
  );
}

/* ------------------------------------------------------------------ *
 * Customer detail
 * ------------------------------------------------------------------ */

interface FullCustomerRow extends CustomerRow {
  first_seen_at: string | null;
  has_identity_conflict: boolean;
  metadata: {
    activeDurationDays?: number;
    silenceDays?: number;
    weakestLinkExplanation?: string;
    hasConflict?: boolean;
    patternCounts?: Record<CustomerPattern, number>;
    churnSignals?: { rule: string; evidence: string }[];
  } | null;
}

export const getCustomer = cache(async (id: string): Promise<CustomerDetail | null> => {
  const supabase = client();

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select(
      "id, display_name, email, is_anonymous, channels, event_count, last_active_at, first_seen_at, identity_confidence, patterns, churn_risk, has_identity_conflict, metadata",
    )
    .eq("id", id)
    .maybeSingle<FullCustomerRow>();
  if (cErr) raise("customer.detail", cErr);
  if (!customer) return null;

  const [identifierRows, patterns] = await Promise.all([
    readIdentifiers(id),
    readPatterns(id),
  ]);

  const identifiers: CustomerIdentifier[] = identifierRows.map((row) => ({
    type: row.identifier_type,
    value: row.identifier_value,
    sourceChannel: (row.source as Channel) ?? "web",
    linkMethod: row.link_method,
    linkConfidence: Number(row.link_confidence),
    firstSeenIso: row.first_seen_at,
  }));

  const identityConfidence = identifiers.length
    ? identifiers.reduce((min, i) => Math.min(min, i.linkConfidence), 1)
    : Number(customer.identity_confidence);

  const patternCounts = countPatterns(patterns);

  // Churn signals are the rules recorded on the stored churn_signal pattern.
  const churnPattern = patterns.find((p) => p.patternType === "churn_signal");
  const storedSignals = (churnPattern?.details.signals ?? customer.metadata?.churnSignals ?? []) as {
    rule: string;
    evidence: string;
  }[];
  const churnSignals: ChurnSignal[] = storedSignals.map((s) => ({
    rule: s.rule,
    evidence: s.evidence,
  }));

  const asOfDate = asOf();
  const lastSeen = customer.last_active_at ? new Date(customer.last_active_at) : asOfDate;
  const firstSeen = customer.first_seen_at ? new Date(customer.first_seen_at) : lastSeen;

  return {
    id: customer.id,
    displayName: customer.display_name,
    isAnonymous: customer.is_anonymous,
    channels: (customer.channels ?? []).filter((c) => CHANNELS.includes(c)),
    eventCount: customer.event_count,
    firstSeenIso: firstSeen.toISOString(),
    lastSeenIso: lastSeen.toISOString(),
    activeDurationDays: Math.max(
      0,
      Math.floor((lastSeen.getTime() - firstSeen.getTime()) / 86_400_000),
    ),
    silenceDays: Math.max(
      0,
      Math.floor((asOfDate.getTime() - lastSeen.getTime()) / 86_400_000),
    ),
    identityConfidence,
    weakestLink: {
      confidence: identityConfidence,
      explanation:
        customer.metadata?.weakestLinkExplanation ??
        "Derived from the weakest identifier link.",
    },
    identifiers,
    hasConflict:
      customer.has_identity_conflict || Boolean(customer.metadata?.hasConflict),
    churnRisk: customer.churn_risk,
    churnSignals,
    patternCounts,
    asOfIso: asOfDate.toISOString(),
  };
});

function countPatterns(patterns: DetectedPattern[]): Record<CustomerPattern, number> {
  const counts = Object.fromEntries(LIST_PATTERNS.map((p) => [p, 0])) as Record<
    CustomerPattern,
    number
  >;
  for (const pattern of patterns) {
    if (pattern.patternType !== "churn_signal") counts[pattern.patternType] += 1;
  }
  return counts;
}

/* ------------------------------------------------------------------ *
 * Journey
 * ------------------------------------------------------------------ */

export const getCustomerJourney = cache(
  async (id: string): Promise<CustomerJourney | null> => {
    const customer = await getCustomer(id);
    if (!customer) return null;

    const [events, patterns, resolutions] = await Promise.all([
      readEvents(id),
      readPatterns(id),
      readResolutions(id),
    ]);

    const asOfDate = asOf();
    const journeyEvents = buildJourney(
      events,
      patterns,
      resolutions.map((r) => ({
        eventId: r.event_id,
        result: {
          method: r.method as "deterministic" | "probabilistic" | "new_profile",
          confidence: Number(r.confidence),
          evidence: r.evidence ?? [],
        },
      })),
      asOfDate,
    );

    return {
      id: customer.id,
      displayName: customer.displayName,
      isAnonymous: customer.isAnonymous,
      events: journeyEvents,
      channels: customer.channels,
      totalEvents: journeyEvents.length,
      journeyCount: (journeyEvents.at(-1)?.journeyIndex ?? -1) + 1,
      sessionCount: (journeyEvents.at(-1)?.sessionIndex ?? -1) + 1,
      silenceDays: silenceDays(events, asOfDate),
      churnRisk: customer.churnRisk,
      asOfIso: asOfDate.toISOString(),
    };
  },
);

/* ------------------------------------------------------------------ *
 * Identity graph
 * ------------------------------------------------------------------ */

/**
 * The explainability view (S-05). Every node, edge and chain step is read from
 * `customer_identifiers` and `resolution_logs`: the graph shows the decisions
 * the engine made, not a drawing of them.
 */
export const getCustomerIdentity = cache(
  async (id: string): Promise<IdentityGraph | null> => {
    const customer = await getCustomer(id);
    if (!customer) return null;

    const [identifierRows, events, resolutions] = await Promise.all([
      readIdentifiers(id),
      readEvents(id),
      readResolutions(id),
    ]);

    const eventById = new Map(events.map((e) => [e.id, e]));
    const resolutionByEvent = new Map(resolutions.map((r) => [r.event_id, r]));

    /* The event that first introduced each identifier, for its evidence. */
    const introducedBy = new Map<string, StoredEventRecord>();
    for (const event of events) {
      for (const [type, value] of Object.entries(event.identifiers ?? {})) {
        const key = `${type}:${value}`;
        if (!introducedBy.has(key)) introducedBy.set(key, event);
      }
    }

    const nodes: IdentityNode[] = identifierRows.map((row) => {
      const key = `${row.identifier_type}:${row.identifier_value}`;
      const origin = introducedBy.get(key) ?? null;
      const resolution = origin ? resolutionByEvent.get(origin.id) : undefined;
      return {
        id: row.id,
        type: row.identifier_type,
        value: row.identifier_value,
        sourceChannel: (row.source as Channel) ?? "web",
        linkMethod: row.link_method,
        linkConfidence: Number(row.link_confidence),
        firstSeenIso: row.first_seen_at,
        lastSeenIso: row.last_seen_at ?? row.first_seen_at,
        evidence: (resolution?.evidence ?? [])
          .filter((e) => e.matched)
          .map((e) => e.description),
        linkedByEventId: origin?.id ?? null,
        linkedByEventType: origin?.eventType ?? null,
      };
    });

    const chain: ResolutionChainStep[] = resolutions
      .map((row) => {
        const event = eventById.get(row.event_id);
        if (!event) return null;
        return {
          eventId: row.event_id,
          timestampIso: event.timestampIso,
          channel: event.channel,
          eventType: event.eventType,
          method: displayMethod(row.method),
          confidence: Number(row.confidence),
          evidence: (row.evidence ?? []).filter((e) => e.matched).map((e) => e.description),
          identifiersAdded: (row.identifiers_added ?? []).map((added) => {
            const value = event.identifiers?.[added.type];
            return {
              type: added.type,
              maskedValue: value ? maskIdentifier(added.type, value) : "***",
            };
          }),
          ambiguous: row.ambiguous,
          conflict: row.conflict,
        };
      })
      .filter((step): step is ResolutionChainStep => step !== null)
      .sort((a, b) => Date.parse(a.timestampIso) - Date.parse(b.timestampIso));

    const conflicts: IdentityConflictSummary[] = resolutions
      .filter((r) => r.conflict && r.conflict_details)
      .map((r) => ({
        eventId: r.event_id,
        detectedAtIso: r.created_at,
        competingProfileIds: r.conflict_details?.competingProfileIds ?? [],
        identifiers: r.conflict_details?.identifiers ?? [],
      }));

    const methodCounts = { origin: 0, deterministic: 0, probabilistic: 0, conflict: 0 };
    for (const step of chain) methodCounts[step.method] += 1;

    return {
      customerId: customer.id,
      displayName: customer.displayName,
      isAnonymous: customer.isAnonymous,
      identityConfidence: customer.identityConfidence,
      weakestLink: customer.weakestLink,
      nodes,
      fragments: buildFragments(events),
      chain,
      conflicts,
      methodCounts,
      totalEvents: events.length,
      asOfIso: customer.asOfIso,
    };
  },
);

/**
 * What each source system saw on its own: the channel, the identifier it knows
 * the customer by, and how many events it holds. This is the "three systems,
 * three strangers" panel — the before picture that unification resolves.
 */
function buildFragments(events: StoredEventRecord[]): IdentityFragment[] {
  const byKey = new Map<string, IdentityFragment>();

  for (const event of events) {
    const entries = Object.entries(event.identifiers ?? {}).filter(
      ([type]) => type !== "name",
    ) as [IdentifierType, string][];
    if (entries.length === 0) continue;
    // The identifier that channel's own system would key on.
    const [type, value] = entries[0];
    const key = `${event.channel}:${type}:${value}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.eventCount += 1;
      existing.lastSeenIso = maxIso(existing.lastSeenIso, event.timestampIso);
      existing.firstSeenIso = minIso(existing.firstSeenIso, event.timestampIso);
      continue;
    }
    byKey.set(key, {
      channel: event.channel,
      identifierType: type,
      value,
      maskedValue: maskIdentifier(type, value),
      eventCount: 1,
      firstSeenIso: event.timestampIso,
      lastSeenIso: event.timestampIso,
    });
  }

  return [...byKey.values()].sort((a, b) => Date.parse(a.firstSeenIso) - Date.parse(b.firstSeenIso));
}

function maxIso(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}
function minIso(a: string, b: string): string {
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

/** Minimum query length (SoT §4.4 route #4) — shorter matches everything. */
export const SEARCH_MIN_LENGTH = 3;
const SEARCH_LIMIT = 10;

/**
 * Customer search across every identifier and the display name. Strong
 * identifiers match exactly (a normalized email or phone is either theirs or
 * not); names and opaque IDs match on a prefix, which the
 * `identifier_value text_pattern_ops` index serves.
 */
export async function searchCustomers(rawQuery: string): Promise<CustomerSearchResult> {
  const query = rawQuery.trim();
  if (query.length < SEARCH_MIN_LENGTH) {
    throw new QueryError(`Search needs at least ${SEARCH_MIN_LENGTH} characters.`);
  }
  const supabase = client();
  const lowered = query.toLowerCase();
  const digits = query.replace(/\D/g, "");

  // Identifier matches: exact on the normalized value, prefix otherwise.
  const filters = [
    `identifier_value.eq.${escapeFilter(lowered)}`,
    `identifier_value.ilike.${escapeFilter(query)}%`,
    `identifier_value.ilike.%${escapeFilter(query)}%`,
  ];
  if (digits.length >= 4) filters.push(`identifier_value.ilike.%${digits}%`);

  const { data: identifierHits, error: idError } = await supabase
    .from("customer_identifiers")
    .select("customer_id, identifier_type, identifier_value")
    .or(filters.join(","))
    .limit(SEARCH_LIMIT * 4);
  if (idError) raise("search.identifiers", idError);

  const { data: nameHits, error: nameError } = await supabase
    .from("customers")
    .select("id")
    .ilike("display_name", `%${escapeFilter(query)}%`)
    .limit(SEARCH_LIMIT);
  if (nameError) raise("search.names", nameError);

  const matchedOn = new Map<string, { type: IdentifierType; value: string }>();
  for (const hit of (identifierHits ?? []) as {
    customer_id: string;
    identifier_type: IdentifierType;
    identifier_value: string;
  }[]) {
    if (!matchedOn.has(hit.customer_id)) {
      matchedOn.set(hit.customer_id, { type: hit.identifier_type, value: hit.identifier_value });
    }
  }
  for (const hit of (nameHits ?? []) as { id: string }[]) {
    if (!matchedOn.has(hit.id)) matchedOn.set(hit.id, { type: "name", value: "" });
  }

  const ids = [...matchedOn.keys()].slice(0, SEARCH_LIMIT);
  if (ids.length === 0) return { query, hits: [], total: 0 };

  const [{ data: customers, error: custError }, counts] = await Promise.all([
    supabase
      .from("customers")
      .select("id, display_name, event_count, channels, churn_risk, last_active_at")
      .in("id", ids),
    identifierCounts(ids),
  ]);
  if (custError) raise("search.customers", custError);

  const hits: CustomerSearchHit[] = ((customers ?? []) as {
    id: string;
    display_name: string | null;
    event_count: number;
    channels: Channel[] | null;
    churn_risk: ChurnRisk;
    last_active_at: string | null;
  }[]).map((row) => {
    const match = matchedOn.get(row.id);
    return {
      id: row.id,
      displayName: row.display_name,
      matchedOn:
        match && match.value
          ? { type: match.type, maskedValue: maskIdentifier(match.type, match.value) }
          : null,
      identifierCount: counts.get(row.id) ?? 0,
      eventCount: row.event_count,
      channels: (row.channels ?? []).filter((c) => CHANNELS.includes(c)),
      churnRisk: row.churn_risk,
      lastActiveIso: row.last_active_at,
    };
  });

  hits.sort((a, b) => b.eventCount - a.eventCount);
  return { query, hits, total: hits.length };
}

async function identifierCounts(ids: string[]): Promise<Map<string, number>> {
  const supabase = client();
  const { data, error } = await supabase
    .from("customer_identifiers")
    .select("customer_id")
    .in("customer_id", ids);
  if (error) raise("search.identifierCounts", error);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { customer_id: string }[]) {
    counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1);
  }
  return counts;
}

/** PostgREST `or()` is comma-separated — a raw comma would split the filter. */
function escapeFilter(value: string): string {
  return value.replace(/[,()]/g, " ");
}
