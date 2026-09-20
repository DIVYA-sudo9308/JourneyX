import { cache } from "react";

import { asOf } from "@/lib/shared/clock";
import {
  CHANNELS,
  CHURN_RISK_LEVELS,
  type Channel,
  type ChurnRisk,
} from "@/lib/types/domain";
import type {
  CustomerDetail,
  CustomerIdentifier,
  CustomerJourney,
  CustomerListFilters,
  CustomerListItem,
  CustomerListResult,
  CustomerPattern,
  ChurnSignal,
  JourneyEvent,
  LinkMethod,
} from "@/lib/types/customer";
import { getServerSupabase } from "@/lib/supabase/server";

export class QueryError extends Error {
  supabaseCode?: string;
  supabaseHint?: string;
  supabaseDetails?: string;
  constructor(message: string, opts?: { code?: string; hint?: string; details?: string }) {
    super(message);
    this.name = "QueryError";
    this.supabaseCode = opts?.code;
    this.supabaseHint = opts?.hint;
    this.supabaseDetails = opts?.details;
  }
}

const LIST_PATTERNS: CustomerPattern[] = [
  "drop_off",
  "escalation",
  "repeat_contact",
  "unresolved_issue",
];
const SORT_KEYS: CustomerSortKey[] = ["lastActive", "eventCount", "churnRisk"];

type CustomerSortKey = NonNullable<CustomerListFilters["sortBy"]>;

interface SupabaseErrorLike {
  message?: string;
  code?: string;
  hint?: string;
  details?: string;
}

function raise(scope: string, error: SupabaseErrorLike): never {
  const msg = error?.message || "Unknown Supabase error";
  console.error(`[query:${scope}]`, {
    message: msg,
    code: error?.code,
    hint: error?.hint,
    details: error?.details,
  });
  throw new QueryError(`${scope}: ${msg}`, {
    code: error?.code,
    hint: error?.hint,
    details: error?.details,
  });
}

function client() {
  const supabase = getServerSupabase();
  if (!supabase) {
    throw new QueryError(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env.local.",
    );
  }
  return supabase;
}

function normalizeFilters(filters: CustomerListFilters) {
  const patterns = filters.pattern?.filter((p): p is CustomerPattern =>
    LIST_PATTERNS.includes(p),
  );
  const channels = filters.channel?.filter((c): c is Channel =>
    CHANNELS.includes(c),
  );
  const churnRisk = filters.churnRisk?.filter((r): r is ChurnRisk =>
    CHURN_RISK_LEVELS.includes(r),
  );
  const sortBy: CustomerSortKey | undefined =
    filters.sortBy && SORT_KEYS.includes(filters.sortBy)
      ? filters.sortBy
      : undefined;
  const sortOrder =
    filters.sortOrder === "asc" || filters.sortOrder === "desc"
      ? filters.sortOrder
      : undefined;
  const minConfidence =
    filters.minConfidence !== undefined && !Number.isNaN(filters.minConfidence)
      ? Math.min(1, Math.max(0, filters.minConfidence))
      : undefined;

  if (filters.dateFrom && filters.dateTo) {
    if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
      throw new QueryError('"dateFrom" must not be after "dateTo".');
    }
  }
  return { patterns, channels, churnRisk, sortBy, sortOrder, minConfidence };
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

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(200, filters.pageSize ?? 25));

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

  if (norm.churnRisk && norm.churnRisk.length > 0) {
    q = q.in("churn_risk", norm.churnRisk);
  }
  if (norm.minConfidence !== undefined) {
    q = q.gte("identity_confidence", norm.minConfidence);
  }
  if (filters.dateFrom) q = q.gte("last_active_at", filters.dateFrom);
  if (filters.dateTo) {
    q = q.lte("last_active_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  if (norm.patterns && norm.patterns.length > 0) {
    q = q.or(jsonbOverlapOr("patterns", norm.patterns));
  }
  if (norm.channels && norm.channels.length > 0) {
    q = q.or(jsonbOverlapOr("channels", norm.channels));
  }

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

  q = q
    .order(column, { ascending, nullsFirst: false })
    .order("id", { ascending: true });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  q = q.range(from, to);

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

interface IdentifierRow {
  identifier_type: CustomerIdentifier["type"];
  identifier_value: string;
  confidence: number | string;
  source: string;
  first_seen_at: string;
}

interface LinkRow {
  identifier_id: string;
  link_method: LinkMethod;
  confidence: number | string;
}

interface ChurnRow {
  signal_type: string;
  evidence: string | null;
}

interface PatternRow {
  pattern_type: CustomerPattern | "churn_signal";
}

interface FullCustomerRow extends CustomerRow {
  first_seen_at: string | null;
  metadata: {
    activeDurationDays?: number;
    silenceDays?: number;
    weakestLinkExplanation?: string;
    hasConflict?: boolean;
    patternCounts?: Record<CustomerPattern, number>;
  } | null;
}

export const getCustomer = cache(
  async (id: string): Promise<CustomerDetail | null> => {
    const supabase = client();

    const { data: customer, error: cErr } = await supabase
      .from("customers")
      .select(
        "id, display_name, email, is_anonymous, channels, event_count, last_active_at, first_seen_at, identity_confidence, patterns, churn_risk, metadata",
      )
      .eq("id", id)
      .maybeSingle<FullCustomerRow>();
    if (cErr) raise("customer.detail", cErr);
    if (!customer) return null;

    const [identsRes, linksRes, churnRes, patternsRes] = await Promise.all([
      supabase
        .from("customer_identifiers")
        .select("id, identifier_type, identifier_value, confidence, source, first_seen_at")
        .eq("customer_id", id)
        .order("first_seen_at", { ascending: true }),
      supabase
        .from("identity_links")
        .select("identifier_id, link_method, confidence")
        .eq("customer_id", id),
      supabase
        .from("churn_signals")
        .select("signal_type, evidence")
        .eq("customer_id", id)
        .order("detected_at", { ascending: true }),
      supabase
        .from("patterns")
        .select("pattern_type")
        .eq("customer_id", id),
    ]);
    if (identsRes.error) raise("customer.identifiers", identsRes.error);
    if (linksRes.error) raise("customer.identity_links", linksRes.error);
    if (churnRes.error) raise("customer.churn_signals", churnRes.error);
    if (patternsRes.error) raise("customer.patterns", patternsRes.error);

    const linksById = new Map<string, LinkRow>();
    for (const l of (linksRes.data ?? []) as (LinkRow & { identifier_id: string })[]) {
      linksById.set(l.identifier_id, l);
    }

    const identifiers: CustomerIdentifier[] = (identsRes.data ?? []).map((row) => {
      const ident = row as IdentifierRow & { id: string };
      const link = linksById.get(ident.id);
      const linkMethod: LinkMethod =
        (link?.link_method as LinkMethod | undefined) ?? "deterministic";
      const linkConfidence = link ? Number(link.confidence) : Number(ident.confidence);
      return {
        type: ident.identifier_type,
        value: ident.identifier_value,
        sourceChannel: (ident.source as Channel) ?? "web",
        linkMethod,
        linkConfidence,
        firstSeenIso: ident.first_seen_at,
      };
    });

    const identityConfidence =
      identifiers.length > 0
        ? identifiers.reduce((min, i) => Math.min(min, i.linkConfidence), 1)
        : Number(customer.identity_confidence);

    const patternCounts: Record<CustomerPattern, number> =
      customer.metadata?.patternCounts ?? {
        drop_off: 0,
        escalation: 0,
        repeat_contact: 0,
        unresolved_issue: 0,
      };
    if (!customer.metadata?.patternCounts) {
      for (const p of (patternsRes.data ?? []) as PatternRow[]) {
        if (p.pattern_type !== "churn_signal") {
          patternCounts[p.pattern_type] = (patternCounts[p.pattern_type] ?? 0) + 1;
        }
      }
    }

    const churnSignals: ChurnSignal[] = (churnRes.data ?? []).map((c) => {
      const row = c as ChurnRow;
      return { rule: row.signal_type, evidence: row.evidence ?? "" };
    });

    const lastSeen = customer.last_active_at
      ? new Date(customer.last_active_at)
      : new Date();
    const firstSeen = customer.first_seen_at
      ? new Date(customer.first_seen_at)
      : lastSeen;
    const asOfDate = asOf();
    const activeDurationDays =
      customer.metadata?.activeDurationDays ??
      Math.max(
        0,
        Math.floor((lastSeen.getTime() - firstSeen.getTime()) / 86_400_000),
      );
    const silenceDays =
      customer.metadata?.silenceDays ??
      Math.max(
        0,
        Math.floor((asOfDate.getTime() - lastSeen.getTime()) / 86_400_000),
      );

    return {
      id: customer.id,
      displayName: customer.display_name,
      isAnonymous: customer.is_anonymous,
      channels: (customer.channels ?? []).filter((c) => CHANNELS.includes(c)),
      eventCount: customer.event_count,
      firstSeenIso: firstSeen.toISOString(),
      lastSeenIso: lastSeen.toISOString(),
      activeDurationDays,
      silenceDays,
      identityConfidence,
      weakestLink: {
        confidence: identityConfidence,
        explanation:
          customer.metadata?.weakestLinkExplanation ??
          "Derived from the weakest identifier link.",
      },
      identifiers,
      hasConflict: Boolean(customer.metadata?.hasConflict),
      churnRisk: customer.churn_risk,
      churnSignals,
      patternCounts,
      asOfIso: asOfDate.toISOString(),
    };
  },
);

export const getCustomerJourney = cache(
  async (id: string): Promise<CustomerJourney | null> => {
    const supabase = client();
    const customer = await getCustomer(id);
    if (!customer) return null;

    const { data, error } = await supabase
      .from("events")
      .select("id, channel, event_type, timestamp, metadata")
      .eq("customer_id", id)
      .order("timestamp", { ascending: true });
    if (error) raise("journey.events", error);

    const events: JourneyEvent[] = [];
    let sessionIndex = -1;
    let journeyIndex = -1;
    let prevTime: number | null = null;
    let prevChannel: Channel | null = null;

    for (const row of data ?? []) {
      const meta = (row.metadata ?? {}) as Partial<
        Pick<
          JourneyEvent,
          "summary" | "metadata" | "resolution" | "patterns" | "eventCategory"
        >
      >;
      const ts = new Date(row.timestamp as string).getTime();
      const gapMinutes = prevTime === null ? 0 : Math.round((ts - prevTime) / 60_000);
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

    return {
      id: customer.id,
      displayName: customer.displayName,
      isAnonymous: customer.isAnonymous,
      events,
      channels: customer.channels,
      totalEvents: events.length,
      journeyCount: journeyIndex + 1,
      sessionCount: sessionIndex + 1,
      silenceDays: customer.silenceDays,
      churnRisk: customer.churnRisk,
      asOfIso: asOf().toISOString(),
    };
  },
);
