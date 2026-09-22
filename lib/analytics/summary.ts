import { CHANNELS, type Channel, type ChurnRisk } from "@/lib/types/domain";
import type { AnalyticsSummary, DashboardFilters, FrictionPoint, EscalationPair, Kpi } from "@/lib/types/analytics";
import { dateRange, QueryError } from "@/lib/queries/shared";

export interface AnalyticsCustomer {
  id: string;
  is_anonymous: boolean;
  churn_risk: ChurnRisk;
}
export interface AnalyticsEvent {
  id: string;
  customer_id: string;
  channel: Channel;
  timestamp: string;
  metadata: { resolution?: { method: string; confidence: number } } | null;
}
export interface AnalyticsPattern {
  id: string;
  customer_id: string;
  pattern_type: string;
  detected_at: string;
  metadata: {
    channel?: Channel;
    eventType?: string;
    reason?: string;
    source?: Channel;
    destination?: Channel;
  } | null;
}
export interface AnalyticsIdentifier {
  id: string;
  customer_id: string;
  identifier_type: string;
  identifier_value: string;
}
export interface AnalyticsData {
  customers: AnalyticsCustomer[];
  events: AnalyticsEvent[];
  patterns: AnalyticsPattern[];
  identifiers: AnalyticsIdentifier[];
}

/** All metrics use the same event-active customer cohort when filters are set.
 * Pattern occurrences are additionally scoped to their detection date/channel.
 * Churn is the current profile risk, not a reconstructed historical outcome.
 */
export function summarizeAnalytics(data: AnalyticsData, filters: DashboardFilters, asOfIso: string): AnalyticsSummary {
  const { fromIso, untilIso } = dateRange(filters.dateFrom, filters.dateTo);
  const channels = filters.channel?.length ? filters.channel : undefined;
  if (channels?.some((c) => !CHANNELS.includes(c))) throw new QueryError("Unknown channel.");
  const inRange = (iso: string) => {
    const time = Date.parse(iso);
    return (!fromIso || time >= Date.parse(fromIso)) &&
      (!untilIso || time < Date.parse(untilIso));
  };
  const events = data.events.filter((e) => inRange(e.timestamp) && (!channels || channels.includes(e.channel)));
  const activeIds = new Set(events.map((e) => e.customer_id));
  const filtered = Boolean(fromIso || untilIso || channels);
  const customers = data.customers.filter((c) => !filtered || activeIds.has(c.id));
  const customerIds = new Set(customers.map((c) => c.id));
  const knownIds = new Set(customers.filter((c) => !c.is_anonymous).map((c) => c.id));
  const churnIds = new Set(customers.filter((c) => c.churn_risk !== "none").map((c) => c.id));
  const patterns = data.patterns.filter((p) => {
    if (!customerIds.has(p.customer_id) || !inRange(p.detected_at)) return false;
    if (!channels) return true;
    const meta = p.metadata;
    return Boolean((meta?.channel && channels.includes(meta.channel)) ||
      (p.pattern_type === "escalation" &&
        ((meta?.source && channels.includes(meta.source)) ||
         (meta?.destination && channels.includes(meta.destination)))));
  });
  const known = knownIds.size;
  const anon = customers.length - known;
  const high = customers.filter((c) => c.churn_risk === "high").length;
  const medium = customers.filter((c) => c.churn_risk === "medium").length;
  const identifiers = new Set(data.identifiers.filter((i) => knownIds.has(i.customer_id))
    .map((i) => JSON.stringify([i.customer_id, i.identifier_type, i.identifier_value])));
  const confidences = events.flatMap((e) => {
    const r = e.metadata?.resolution;
    return r && r.method !== "origin" && r.method !== "new_profile" &&
      Number.isFinite(r.confidence) ? [Number(r.confidence)] : [];
  });
  const average = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  const count = (type: string) => patterns.filter((p) => p.pattern_type === type).length;
  const repeats = new Set(patterns.filter((p) => p.pattern_type === "repeat_contact").map((p) => p.customer_id));
  const repeatRate = customers.length ? repeats.size / customers.length : 0;

  const rates = (affected: Set<string>) => {
    const n = affected.size;
    const churned = [...affected].filter((id) => churnIds.has(id)).length;
    const baselineN = customers.length - n;
    const withRate = n ? churned / n : 0;
    const withoutRate = baselineN ? (churnIds.size - churned) / baselineN : 0;
    return {
      churnRateWith: withRate,
      churnRateWithout: withoutRate,
      lift: n && withoutRate > 0 ? withRate / withoutRate : null,
      n,
    };
  };

  const friction = new Map<string, { point: FrictionPoint; customers: Set<string> }>();
  for (const p of patterns.filter((p) => p.pattern_type === "drop_off")) {
    const meta = p.metadata;
    // Missing metadata is unknown; do not invent a web/card-declined failure.
    if (!meta?.channel || !CHANNELS.includes(meta.channel)) continue;
    const eventType = meta.eventType ?? "unknown";
    const reason = meta.reason ?? "unknown";
    const key = JSON.stringify([meta.channel, eventType, reason]);
    let group = friction.get(key);
    if (!group) {
      group = { point: { id: `f${friction.size + 1}`, channel: meta.channel, eventType, reason,
        affectedCustomers: 0, href: `/customers?pattern=drop_off&channel=${meta.channel}` }, customers: new Set() };
      friction.set(key, group);
    }
    group.customers.add(p.customer_id);
    group.point.affectedCustomers = group.customers.size;
  }
  const frictionGroups = [...friction.values()].sort((a, b) => b.customers.size - a.customers.size).slice(0, 5);
  const pairs = new Map<string, EscalationPair>();
  for (const p of patterns.filter((p) => p.pattern_type === "escalation")) {
    const source = p.metadata?.source;
    const destination = p.metadata?.destination;
    if (!source || !destination || !CHANNELS.includes(source) || !CHANNELS.includes(destination)) continue;
    const key = `${source}->${destination}`;
    const pair = pairs.get(key);
    if (pair) pair.count += 1;
    else pairs.set(key, { id: `e${pairs.size + 1}`, source, destination, count: 1 });
  }
  const definitions = [
    ["drop_off", "Checkout drop-off"], ["escalation", "Escalation"],
    ["repeat_contact", "Repeat contact"], ["unresolved_issue", "Unresolved issue"],
  ];
  const churnCorrelation = definitions.map(([pattern, patternLabel]) => ({
    pattern, patternLabel,
    ...rates(new Set(patterns.filter((p) => p.pattern_type === pattern).map((p) => p.customer_id))),
    href: `/customers?pattern=${pattern}&churnRisk=high,medium`,
  }));
  const format = (n: number) => n.toLocaleString("en-IN");
  const kpis: Kpi[] = [
    { key: "unified_customers", label: "Unified customers", value: format(customers.length),
      breakdown: [{ label: "Known", value: known }, { label: "Anonymous", value: anon }], href: "/customers" },
    { key: "events_processed", label: "Events processed", value: format(events.length) },
    { key: "fragments_unified", label: "Fragments unified", value: format(identifiers.size) },
    { key: "avg_link_confidence", label: "Avg. link confidence", value: average.toFixed(2),
      delta: { value: "excl. new profile", tone: "neutral" } },
    { key: "checkout_drop_offs", label: "Checkout drop-offs", value: format(count("drop_off")), href: "/customers?pattern=drop_off" },
    { key: "escalations", label: "Escalations", value: format(count("escalation")), href: "/customers?pattern=escalation" },
    { key: "repeat_contact_rate", label: "Repeat-contact rate", value: `${Math.round(repeatRate * 100)}%`, href: "/customers?pattern=repeat_contact" },
    { key: "open_unresolved", label: "Open unresolved issues", value: format(count("unresolved_issue")), href: "/customers?pattern=unresolved_issue" },
    { key: "churn_risk_customers", label: "Churn-risk customers", value: format(high + medium),
      breakdown: [{ label: "High", value: high }, { label: "Medium", value: medium }], href: "/customers?churnRisk=high,medium" },
  ];
  const top = frictionGroups[0];
  const topRates = top ? rates(top.customers) : null;
  return {
    asOfIso, totalEvents: events.length, kpis,
    insight: top && topRates ? {
      title: "Top friction point",
      frictionPoint: `${top.point.eventType.replace(/_/g, " ")} — ${top.point.reason.replace(/_/g, " ")}`,
      affectedCount: top.customers.size, churnRateAffected: topRates.churnRateWith,
      churnRateBaseline: topRates.churnRateWithout, lift: topRates.lift, ctaHref: top.point.href,
    } : null,
    frictionRanking: frictionGroups.map((g) => g.point),
    escalationPairs: [...pairs.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    churnCorrelation,
  };
}
