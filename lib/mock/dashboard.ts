import type { Channel } from "@/lib/types/domain";
import type {
  AnalyticsSummary,
  ChurnCorrelationRow,
  EscalationPair,
  FrictionPoint,
} from "@/lib/types/analytics";

/**
 * Synthetic seed fixture standing in for `scripts/seed.ts` output (SoT D-45,
 * D-46: seeded, not invented per-KPI). Milestone 2 has no database yet, so
 * this fixture is the approved mock/fixture strategy — the shape matches
 * `GET /api/v1/analytics/summary` exactly (SoT §4.9) so swapping in a real
 * query in a later milestone does not change any component's props.
 *
 * The seed window is the 90 days ending at `asOf()`; a requested date range
 * outside that window legitimately yields zero events (Dashboard empty state).
 */
const SEED_WINDOW_DAYS = 90;

const BASE_TOTAL_CUSTOMERS_KNOWN = 264;
const BASE_TOTAL_CUSTOMERS_ANON = 41;
const BASE_TOTAL_EVENTS = 7218;
const BASE_IDENTIFIERS = 812;
const BASE_MULTI_CHANNEL_KNOWN = 179; // of the known customers, seen on >=2 channels
const BASE_AVG_CONFIDENCE = 0.87;

interface ChannelWeight {
  channel: Channel;
  /** Share of total events attributed to this channel (sums to 1). */
  share: number;
}

const CHANNEL_WEIGHTS: ChannelWeight[] = [
  { channel: "web", share: 0.34 },
  { channel: "mobile", share: 0.22 },
  { channel: "call_center", share: 0.14 },
  { channel: "email", share: 0.12 },
  { channel: "chat", share: 0.1 },
  { channel: "in_store", share: 0.08 },
];

const FRICTION_FIXTURES: FrictionPoint[] = [
  {
    id: "f1",
    channel: "web",
    eventType: "checkout_start",
    reason: "card_declined",
    affectedCustomers: 42,
    href: "/customers?pattern=drop_off&channel=web",
  },
  {
    id: "f2",
    channel: "mobile",
    eventType: "checkout_start",
    reason: "payment_timeout",
    affectedCustomers: 27,
    href: "/customers?pattern=drop_off&channel=mobile",
  },
  {
    id: "f3",
    channel: "call_center",
    eventType: "call_started",
    reason: "long_hold",
    affectedCustomers: 19,
    href: "/customers?pattern=escalation&channel=call_center",
  },
  {
    id: "f4",
    channel: "email",
    eventType: "ticket_created",
    reason: "shipping_delay",
    affectedCustomers: 15,
    href: "/customers?pattern=unresolved_issue&channel=email",
  },
  {
    id: "f5",
    channel: "chat",
    eventType: "chat_started",
    reason: "product_question_unanswered",
    affectedCustomers: 11,
    href: "/customers?pattern=repeat_contact&channel=chat",
  },
];

const ESCALATION_FIXTURES: EscalationPair[] = [
  { id: "e1", source: "web", destination: "call_center", count: 38 },
  { id: "e2", source: "mobile", destination: "call_center", count: 24 },
  { id: "e3", source: "email", destination: "call_center", count: 17 },
  { id: "e4", source: "chat", destination: "email", count: 9 },
  { id: "e5", source: "in_store", destination: "call_center", count: 6 },
];

const CHURN_CORRELATION_FIXTURES: ChurnCorrelationRow[] = [
  {
    pattern: "drop_off",
    patternLabel: "Checkout drop-off",
    churnRateWith: 0.38,
    churnRateWithout: 0.12,
    lift: 3.17,
    n: 69,
    href: "/customers?pattern=drop_off&churnRisk=high,medium",
  },
  {
    pattern: "escalation",
    patternLabel: "Escalation",
    churnRateWith: 0.31,
    churnRateWithout: 0.13,
    lift: 2.38,
    n: 94,
    href: "/customers?pattern=escalation&churnRisk=high,medium",
  },
  {
    pattern: "repeat_contact",
    patternLabel: "Repeat contact",
    churnRateWith: 0.29,
    churnRateWithout: 0.14,
    lift: 2.07,
    n: 58,
    href: "/customers?pattern=repeat_contact&churnRisk=high,medium",
  },
  {
    pattern: "unresolved_issue",
    patternLabel: "Unresolved issue",
    churnRateWith: 0.26,
    churnRateWithout: 0.15,
    lift: 1.73,
    n: 33,
    href: "/customers?pattern=unresolved_issue&churnRisk=high,medium",
  },
];

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Days between two dates, floor, non-negative. */
function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
}

export interface DashboardMockFilters {
  dateFrom?: Date;
  dateTo?: Date;
  channels?: Channel[];
  asOf: Date;
}

/**
 * Builds the analytics summary from the fixture, applying date-range and
 * channel filters the way a real query would: a range outside the seed
 * window returns zero events (empty state); a channel subset scales
 * channel-attributable figures and narrows the friction/escalation rows.
 */
export function getMockAnalyticsSummary(
  filters: DashboardMockFilters,
): AnalyticsSummary {
  const { asOf, dateFrom, dateTo, channels } = filters;
  const seedStart = new Date(asOf.getTime() - SEED_WINDOW_DAYS * 86_400_000);
  const seedEnd = asOf;

  const rangeStart = dateFrom ?? seedStart;
  const rangeEnd = dateTo ?? seedEnd;

  const intersects = rangeStart <= seedEnd && rangeEnd >= seedStart;
  const overlapDays = intersects
    ? daysBetween(
        rangeStart < seedStart ? seedStart : rangeStart,
        rangeEnd > seedEnd ? seedEnd : rangeEnd,
      ) + 1
    : 0;
  const timeScale = intersects
    ? Math.min(1, overlapDays / SEED_WINDOW_DAYS)
    : 0;

  const selectedChannels = channels && channels.length > 0 ? channels : null;
  const channelScale = selectedChannels
    ? CHANNEL_WEIGHTS.filter((w) => selectedChannels.includes(w.channel)).reduce(
        (sum, w) => sum + w.share,
        0,
      )
    : 1;

  const scale = timeScale * channelScale;

  if (scale <= 0) {
    return {
      asOfIso: asOf.toISOString(),
      totalEvents: 0,
      kpis: [],
      insight: null,
      frictionRanking: [],
      escalationPairs: [],
      churnCorrelation: [],
    };
  }

  const totalEvents = Math.round(BASE_TOTAL_EVENTS * scale);
  const knownCustomers = Math.round(BASE_TOTAL_CUSTOMERS_KNOWN * scale);
  const anonCustomers = Math.round(BASE_TOTAL_CUSTOMERS_ANON * scale);
  const identifiersUnified = Math.round(BASE_IDENTIFIERS * scale);
  const multiChannelKnown = Math.round(BASE_MULTI_CHANNEL_KNOWN * scale);
  const multiChannelPct = knownCustomers > 0 ? multiChannelKnown / knownCustomers : 0;

  const dropOffs = Math.round(69 * scale);
  const escalations = Math.round(94 * scale);
  const repeatCustomers = Math.round(58 * scale);
  const repeatRate = knownCustomers > 0 ? repeatCustomers / knownCustomers : 0;
  const openUnresolved = Math.round(33 * scale);
  const churnHigh = Math.round(31 * scale);
  const churnMedium = Math.round(52 * scale);

  const frictionRanking = FRICTION_FIXTURES.filter(
    (f) => !selectedChannels || selectedChannels.includes(f.channel),
  )
    .map((f) => ({
      ...f,
      affectedCustomers: Math.max(1, Math.round(f.affectedCustomers * timeScale)),
    }))
    .sort((a, b) => b.affectedCustomers - a.affectedCustomers);

  const escalationPairs = ESCALATION_FIXTURES.filter(
    (e) =>
      !selectedChannels ||
      selectedChannels.includes(e.source) ||
      selectedChannels.includes(e.destination),
  )
    .map((e) => ({ ...e, count: Math.max(1, Math.round(e.count * timeScale)) }))
    .sort((a, b) => b.count - a.count);

  const churnCorrelation = CHURN_CORRELATION_FIXTURES.map((row) => ({
    ...row,
    n: Math.max(1, Math.round(row.n * timeScale)),
  }));

  const top = frictionRanking[0] ?? null;

  return {
    asOfIso: asOf.toISOString(),
    totalEvents,
    kpis: [
      {
        key: "unified_customers",
        label: "Unified customers",
        value: knownCustomers.toLocaleString("en-IN"),
        breakdown: [
          { label: "Known", value: knownCustomers },
          { label: "Anonymous", value: anonCustomers },
        ],
        href: "/customers",
      },
      {
        key: "events_processed",
        label: "Events processed",
        value: totalEvents.toLocaleString("en-IN"),
      },
      {
        key: "fragments_unified",
        label: "Fragments unified",
        value: identifiersUnified.toLocaleString("en-IN"),
        delta: {
          value: `${pct(multiChannelPct)} on 2+ channels`,
          tone: "neutral",
        },
      },
      {
        key: "avg_link_confidence",
        label: "Avg. link confidence",
        value: BASE_AVG_CONFIDENCE.toFixed(2),
        delta: { value: "excl. new profile", tone: "neutral" },
      },
      {
        key: "checkout_drop_offs",
        label: "Checkout drop-offs",
        value: dropOffs.toLocaleString("en-IN"),
        href: "/customers?pattern=drop_off",
      },
      {
        key: "escalations",
        label: "Escalations",
        value: escalations.toLocaleString("en-IN"),
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
        value: openUnresolved.toLocaleString("en-IN"),
        href: "/customers?pattern=unresolved_issue",
      },
      {
        key: "churn_risk_customers",
        label: "Churn-risk customers",
        value: (churnHigh + churnMedium).toLocaleString("en-IN"),
        breakdown: [
          { label: "High", value: churnHigh },
          { label: "Medium", value: churnMedium },
        ],
        href: "/customers?churnRisk=high,medium",
      },
    ],
    insight: top
      ? {
          title: "Top friction point",
          frictionPoint: `${top.eventType.replace(/_/g, " ")} — ${top.reason.replace(/_/g, " ")}`,
          affectedCount: top.affectedCustomers,
          churnRateAffected: 0.38,
          churnRateBaseline: 0.12,
          lift: 3.17,
          ctaHref: top.href,
        }
      : null,
    frictionRanking,
    escalationPairs,
    churnCorrelation,
  };
}
