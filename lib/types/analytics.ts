import type { Channel } from "./domain";

/** URL-param filters shared by the Dashboard (SoT §4.9, Screen Spec §3). */
export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  channel?: Channel[];
}

export interface KpiBreakdownItem {
  label: string;
  value: number;
}

export interface Kpi {
  key: string;
  label: string;
  /** Formatted primary value (already unit/percent formatted for display). */
  value: string;
  /** Optional secondary breakdown shown under the value, e.g. "High 12 · Medium 27". */
  breakdown?: KpiBreakdownItem[];
  /** Optional delta vs. the previous period; positive is not always "good" (see `deltaTone`). */
  delta?: {
    value: string;
    tone: "positive" | "negative" | "neutral";
  };
  /** Customer-list filter this KPI drills into. */
  href?: string;
}

export interface FrictionPoint {
  id: string;
  channel: Channel;
  eventType: string;
  reason: string;
  affectedCustomers: number;
  href: string;
}

export interface EscalationPair {
  id: string;
  source: Channel;
  destination: Channel;
  count: number;
}

export interface ChurnCorrelationRow {
  pattern: string;
  patternLabel: string;
  churnRateWith: number;
  churnRateWithout: number;
  lift: number | null;
  n: number;
  href: string;
}

export interface InsightCard {
  title: string;
  frictionPoint: string;
  affectedCount: number;
  churnRateAffected: number;
  churnRateBaseline: number;
  lift: number | null;
  ctaHref: string;
}

export interface AnalyticsSummary {
  asOfIso: string;
  totalEvents: number;
  kpis: Kpi[];
  insight: InsightCard | null;
  frictionRanking: FrictionPoint[];
  escalationPairs: EscalationPair[];
  churnCorrelation: ChurnCorrelationRow[];
}
