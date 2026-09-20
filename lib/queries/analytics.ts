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
 * Server-side analytics query (SoT D-34). Reads live aggregates from
 * `public.*` in Supabase using the server-only client. Averages are computed
 * in JS since PostgREST rejects `.avg()` aggregates without a project-level
 * opt-in (PGRST123).
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

  const supabase = getServerSupabase();
  if (!supabase) {
    throw new QueryError(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env.local.",
    );
  }

  const now = asOf();
  const fromIso = dateFrom?.toISOString();
  const toIso = dateTo
    ? new Date(`${filters.dateTo}T23:59:59.999Z`).toISOString()
    : undefined;

  const knownRes = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("is_anonymous", false);
  if (knownRes.error) raise("analytics.known", knownRes.error);
  const anonRes = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("is_anonymous", true);
  if (anonRes.error) raise("analytics.anon", anonRes.error);
  const highRes = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("churn_risk", "high");
  if (highRes.error) raise("analytics.high", highRes.error);
  const medRes = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("churn_risk", "medium");
  if (medRes.error) raise("analytics.medium", medRes.error);
  const identRes = await supabase
    .from("customer_identifiers")
    .select("id", { count: "exact", head: true });
  if (identRes.error) raise("analytics.identifiers", identRes.error);

  // Individual pattern counts (used both by KPIs and by churn correlation).
  const patternType = async (t: string) => {
    const r = await supabase
      .from("patterns")
      .select("customer_id", { count: "exact", head: true })
      .eq("pattern_type", t);
    if (r.error) raise(`analytics.patterns.${t}`, r.error);
    return r.count ?? 0;
  };
  const [drops, escalations, repeats, unresolved] = await Promise.all([
    patternType("drop_off"),
    patternType("escalation"),
    patternType("repeat_contact"),
    patternType("unresolved_issue"),
  ]);

  // Events count with optional channel + date filters.
  let evQ = supabase.from("events").select("id", { count: "exact", head: true });
  if (channels && channels.length > 0) evQ = evQ.in("channel", channels);
  if (fromIso) evQ = evQ.gte("timestamp", fromIso);
  if (toIso) evQ = evQ.lte("timestamp", toIso);
  const evRes = await evQ;
  if (evRes.error) raise("analytics.events", evRes.error);
  const totalEvents = evRes.count ?? 0;

  // Avg link confidence, computed in JS (PGRST123 blocks `.avg()` here).
  const confRes = await supabase
    .from("customers")
    .select("identity_confidence")
    .eq("is_anonymous", false);
  if (confRes.error) raise("analytics.avg_confidence", confRes.error);
  const confs = (confRes.data ?? []).map((r) =>
    Number((r as { identity_confidence: number | string }).identity_confidence),
  );
  const avgConfidence =
    confs.length > 0 ? confs.reduce((s, v) => s + v, 0) / confs.length : 0;

  const known = knownRes.count ?? 0;
  const anon = anonRes.count ?? 0;
  const high = highRes.count ?? 0;
  const medium = medRes.count ?? 0;
  const idents = identRes.count ?? 0;
  const repeatRate = known > 0 ? repeats / known : 0;

  // Friction & escalation ranking: aggregate pattern rows client-side.
  const dropMeta = await supabase
    .from("patterns")
    .select("customer_id, metadata")
    .eq("pattern_type", "drop_off");
  if (dropMeta.error) raise("analytics.friction.drop_off", dropMeta.error);
  const escMeta = await supabase
    .from("patterns")
    .select("customer_id, metadata")
    .eq("pattern_type", "escalation");
  if (escMeta.error) raise("analytics.friction.escalation", escMeta.error);

  const frictionMap = new Map<string, FrictionPoint>();
  for (const row of dropMeta.data ?? []) {
    const meta = ((row as { metadata: unknown }).metadata ?? {}) as {
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
  for (const row of escMeta.data ?? []) {
    const meta = ((row as { metadata: unknown }).metadata ?? {}) as {
      source?: Channel;
      destination?: Channel;
    };
    const source = meta.source ?? "web";
    const destination = meta.destination ?? "call_center";
    if (channels && !channels.includes(source) && !channels.includes(destination)) {
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

  // Churn correlation: rate of (high|medium) churn among customers carrying
  // each pattern. Read pattern rows and inline-fetch churn_risk per customer.
  const patternDefs = [
    { key: "drop_off", label: "Checkout drop-off" },
    { key: "escalation", label: "Escalation" },
    { key: "repeat_contact", label: "Repeat contact" },
    { key: "unresolved_issue", label: "Unresolved issue" },
  ] as const;
  const churnCorrelation: ChurnCorrelationRow[] = [];
  for (const p of patternDefs) {
    const pr = await supabase
      .from("patterns")
      .select("customer_id, customers!inner(churn_risk)")
      .eq("pattern_type", p.key);
    if (pr.error) {
      raise(`analytics.correlation.${p.key}`, pr.error);
    }
    const seen = new Set<string>();
    let churnedWith = 0;
    for (const row of pr.data ?? []) {
      const r = row as {
        customer_id: string;
        customers: { churn_risk: string } | { churn_risk: string }[];
      };
      if (seen.has(r.customer_id)) continue;
      seen.add(r.customer_id);
      const c = Array.isArray(r.customers) ? r.customers[0] : r.customers;
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
    churnCorrelation.push({
      pattern: p.key,
      patternLabel: p.label,
      churnRateWith: Number(withRate.toFixed(2)),
      churnRateWithout: Number(withoutRate.toFixed(2)),
      lift: Number(lift.toFixed(2)),
      n,
      href: `/customers?pattern=${p.key}&churnRisk=high,medium`,
    });
  }

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
      value: avgConfidence.toFixed(2),
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
