import { asOf } from "@/lib/shared/clock";
import { CHANNELS, type Channel } from "@/lib/types/domain";
import type {
  AnalyticsSummary,
  ChurnCorrelationRow,
  DashboardFilters,
  EscalationPair,
  FrictionPoint,
  Kpi,
} from "@/lib/types/analytics";
import { getMockAnalyticsSummary } from "@/lib/mock/dashboard";
import { hasSupabase } from "@/lib/supabase/env";
import { getServerSupabase } from "@/lib/supabase/server";

export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryError";
  }
}

function parseDate(value: string | undefined, field: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new QueryError(`"${field}" is not a valid date: "${value}".`);
  }
  return date;
}

function parseChannels(value: Channel[] | undefined): Channel[] | undefined {
  if (!value || value.length === 0) return undefined;
  const invalid = value.filter((c) => !CHANNELS.includes(c));
  if (invalid.length > 0) {
    throw new QueryError(`Unknown channel(s): ${invalid.join(", ")}.`);
  }
  return value;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function inr(n: number): string {
  return n.toLocaleString("en-IN");
}

/**
 * Server-side analytics query (SoT D-34). Reads live aggregates from Supabase
 * when configured, else returns the deterministic mock fixture. The KPI shape
 * matches the Screen Spec §3 dashboard contract exactly.
 */
export async function getAnalyticsSummary(
  filters: DashboardFilters,
): Promise<AnalyticsSummary> {
  const dateFrom = parseDate(filters.dateFrom, "dateFrom");
  const dateTo = parseDate(filters.dateTo, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new QueryError('"dateFrom" must not be after "dateTo".');
  }
  const channels = parseChannels(filters.channel);

  if (!hasSupabase()) {
    return getMockAnalyticsSummary({
      asOf: asOf(),
      dateFrom,
      dateTo,
      channels,
    });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return getMockAnalyticsSummary({
      asOf: asOf(),
      dateFrom,
      dateTo,
      channels,
    });
  }

  const now = asOf();
  const fromIso = dateFrom?.toISOString();
  const toIso = dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`).toISOString() : undefined;

  // Customer aggregate counts (unfiltered — reflects the whole population).
  const [
    { count: knownCustomers },
    { count: anonCustomers },
    { count: churnHigh },
    { count: churnMedium },
    { count: identifierCount },
    dropOffRows,
    escalationRows,
    repeatRows,
    unresolvedRows,
    { data: confRow },
    eventsBase,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("is_anonymous", false),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("is_anonymous", true),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("churn_risk", "high"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("churn_risk", "medium"),
    supabase
      .from("customer_identifiers")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("patterns")
      .select("customer_id", { count: "exact", head: true })
      .eq("pattern_type", "drop_off"),
    supabase
      .from("patterns")
      .select("customer_id", { count: "exact", head: true })
      .eq("pattern_type", "escalation"),
    supabase
      .from("patterns")
      .select("customer_id", { count: "exact", head: true })
      .eq("pattern_type", "repeat_contact"),
    supabase
      .from("patterns")
      .select("customer_id", { count: "exact", head: true })
      .eq("pattern_type", "unresolved_issue"),
    supabase
      .from("customers")
      .select("avg_confidence:identity_confidence.avg()")
      .maybeSingle(),
    (async () => {
      let q = supabase
        .from("events")
        .select("id", { count: "exact", head: true });
      if (channels && channels.length > 0) q = q.in("channel", channels);
      if (fromIso) q = q.gte("timestamp", fromIso);
      if (toIso) q = q.lte("timestamp", toIso);
      return q;
    })(),
  ]);

  const totalEvents = eventsBase.count ?? 0;
  const known = knownCustomers ?? 0;
  const anon = anonCustomers ?? 0;
  const idents = identifierCount ?? 0;
  const drops = dropOffRows.count ?? 0;
  const escalations = escalationRows.count ?? 0;
  const repeats = repeatRows.count ?? 0;
  const unresolved = unresolvedRows.count ?? 0;
  const high = churnHigh ?? 0;
  const medium = churnMedium ?? 0;

  const avgConfidence = Number(
    (confRow as { avg_confidence?: number | string } | null)?.avg_confidence ?? 0,
  );
  const repeatRate = known > 0 ? repeats / known : 0;

  // Friction ranking: top drop-off event_type × channel by affected customer count.
  const dropOffMeta = await supabase
    .from("patterns")
    .select("customer_id, metadata")
    .eq("pattern_type", "drop_off");
  const escalationMeta = await supabase
    .from("patterns")
    .select("customer_id, metadata")
    .eq("pattern_type", "escalation");

  const frictionMap = new Map<string, FrictionPoint>();
  for (const row of dropOffMeta.data ?? []) {
    const meta = (row.metadata ?? {}) as {
      channel?: Channel;
      eventType?: string;
      reason?: string;
    };
    const channel = meta.channel ?? "web";
    if (channels && !channels.includes(channel)) continue;
    const eventType = meta.eventType ?? "checkout_start";
    const reason = meta.reason ?? "card_declined";
    const key = `${channel}:${eventType}:${reason}`;
    const existing = frictionMap.get(key);
    if (existing) existing.affectedCustomers += 1;
    else
      frictionMap.set(key, {
        id: `f${frictionMap.size + 1}`,
        channel,
        eventType,
        reason,
        affectedCustomers: 1,
        href: `/customers?pattern=drop_off&channel=${channel}`,
      });
  }
  const frictionRanking: FrictionPoint[] = Array.from(frictionMap.values())
    .sort((a, b) => b.affectedCustomers - a.affectedCustomers)
    .slice(0, 5);

  const pairMap = new Map<string, EscalationPair>();
  for (const row of escalationMeta.data ?? []) {
    const meta = (row.metadata ?? {}) as {
      source?: Channel;
      destination?: Channel;
    };
    const source = meta.source ?? "web";
    const destination = meta.destination ?? "call_center";
    if (
      channels &&
      !channels.includes(source) &&
      !channels.includes(destination)
    ) {
      continue;
    }
    const key = `${source}->${destination}`;
    const existing = pairMap.get(key);
    if (existing) existing.count += 1;
    else
      pairMap.set(key, {
        id: `e${pairMap.size + 1}`,
        source,
        destination,
        count: 1,
      });
  }
  const escalationPairs = Array.from(pairMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Churn correlation is a deterministic derivation for the MVP: rate of
  // (high|medium) churn among customers that carry the given pattern.
  const churnCorrelation: ChurnCorrelationRow[] = await (async () => {
    const rows: ChurnCorrelationRow[] = [];
    const patterns = [
      { key: "drop_off", label: "Checkout drop-off" },
      { key: "escalation", label: "Escalation" },
      { key: "repeat_contact", label: "Repeat contact" },
      { key: "unresolved_issue", label: "Unresolved issue" },
    ] as const;

    for (const p of patterns) {
      const { data, error } = await supabase
        .from("patterns")
        .select("customer_id, customers!inner(churn_risk)")
        .eq("pattern_type", p.key);
      if (error) continue;
      const withCustomers = (data ?? []) as {
        customer_id: string;
        customers: { churn_risk: string } | { churn_risk: string }[];
      }[];
      const seen = new Set<string>();
      let churnedWith = 0;
      for (const row of withCustomers) {
        if (seen.has(row.customer_id)) continue;
        seen.add(row.customer_id);
        const c = Array.isArray(row.customers) ? row.customers[0] : row.customers;
        if (c && (c.churn_risk === "high" || c.churn_risk === "medium")) {
          churnedWith += 1;
        }
      }
      const n = seen.size;
      const withRate = n > 0 ? churnedWith / n : 0;
      const totalChurn = high + medium;
      const totalKnown = known + anon;
      const withoutN = Math.max(1, totalKnown - n);
      const withoutRate = Math.max(0, (totalChurn - churnedWith) / withoutN);
      const lift = withoutRate > 0 ? withRate / withoutRate : 0;
      rows.push({
        pattern: p.key,
        patternLabel: p.label,
        churnRateWith: Number(withRate.toFixed(2)),
        churnRateWithout: Number(withoutRate.toFixed(2)),
        lift: Number(lift.toFixed(2)),
        n,
        href: `/customers?pattern=${p.key}&churnRisk=high,medium`,
      });
    }
    return rows;
  })();

  const kpis: Kpi[] = [
    {
      key: "unified_customers",
      label: "Unified customers",
      value: inr(known),
      breakdown: [
        { label: "Known", value: known },
        { label: "Anonymous", value: anon },
      ],
      href: "/customers",
    },
    {
      key: "events_processed",
      label: "Events processed",
      value: inr(totalEvents),
    },
    {
      key: "fragments_unified",
      label: "Fragments unified",
      value: inr(idents),
    },
    {
      key: "avg_link_confidence",
      label: "Avg. link confidence",
      value: (avgConfidence || 0).toFixed(2),
      delta: { value: "excl. new profile", tone: "neutral" },
    },
    {
      key: "checkout_drop_offs",
      label: "Checkout drop-offs",
      value: inr(drops),
      href: "/customers?pattern=drop_off",
    },
    {
      key: "escalations",
      label: "Escalations",
      value: inr(escalations),
      href: "/customers?pattern=escalation",
    },
    {
      key: "repeat_contact_rate",
      label: "Repeat-contact rate",
      value: pct(repeatRate),
      href: "/customers?pattern=repeat_contact",
    },
    {
      key: "open_unresolved",
      label: "Open unresolved issues",
      value: inr(unresolved),
      href: "/customers?pattern=unresolved_issue",
    },
    {
      key: "churn_risk_customers",
      label: "Churn-risk customers",
      value: inr(high + medium),
      breakdown: [
        { label: "High", value: high },
        { label: "Medium", value: medium },
      ],
      href: "/customers?churnRisk=high,medium",
    },
  ];

  const top = frictionRanking[0] ?? null;
  const topPattern = churnCorrelation.find((r) => r.pattern === "drop_off");

  return {
    asOfIso: now.toISOString(),
    totalEvents,
    kpis,
    insight: top
      ? {
          title: "Top friction point",
          frictionPoint: `${top.eventType.replace(/_/g, " ")} — ${top.reason.replace(/_/g, " ")}`,
          affectedCount: top.affectedCustomers,
          churnRateAffected: topPattern?.churnRateWith ?? 0,
          churnRateBaseline: topPattern?.churnRateWithout ?? 0,
          lift: topPattern?.lift ?? 0,
          ctaHref: top.href,
        }
      : null,
    frictionRanking,
    escalationPairs,
    churnCorrelation,
  };
}
