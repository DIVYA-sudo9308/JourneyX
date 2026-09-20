import type { Channel, ChurnRisk, PatternType } from "./domain";

/** Patterns surfaced as list badges — churn is a profile-level banner (SoT D-31). */
export type CustomerPattern = Exclude<PatternType, "churn_signal">;

/**
 * A row in the Customer List. Identifiers are already masked (SoT D-12 /
 * PRD NFR-009): the list never carries raw email/phone/PII — full values
 * appear only on the (later) detail screens.
 */
export interface CustomerListItem {
  id: string;
  displayName: string | null;
  maskedEmail: string | null;
  isAnonymous: boolean;
  channels: Channel[];
  eventCount: number;
  lastActiveIso: string;
  identityConfidence: number;
  patterns: CustomerPattern[];
  churnRisk: ChurnRisk;
}

export type CustomerSortKey = "lastActive" | "eventCount" | "churnRisk";
export type SortOrder = "asc" | "desc";

/** URL-param filters (Screen Spec S-02, SoT §4.4 route #3). */
export interface CustomerListFilters {
  page?: number;
  pageSize?: number;
  pattern?: CustomerPattern[];
  channel?: Channel[];
  churnRisk?: ChurnRisk[];
  minConfidence?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: CustomerSortKey;
  sortOrder?: SortOrder;
}

export interface CustomerListResult {
  items: CustomerListItem[];
  /** Rows matching the current filters (drives pagination). */
  total: number;
  /** Whole population — distinguishes "no data" from "no matches". */
  totalUnfiltered: number;
  page: number;
  pageSize: number;
  asOfIso: string;
}

/* ------------------------------------------------------------------ *
 * Customer detail (S-03). On the detail screen identifier values are
 * shown in FULL (SoT D-12) — masking applies only to lists/search/logs.
 * ------------------------------------------------------------------ */

export type IdentifierType =
  | "email"
  | "phone"
  | "loyalty_id"
  | "device_id"
  | "cookie_id"
  | "name";

export type LinkMethod =
  | "origin"
  | "deterministic"
  | "probabilistic"
  | "conflict";

export interface CustomerIdentifier {
  type: IdentifierType;
  /** Full, unmasked value — permitted on the detail screen (SoT D-12). */
  value: string;
  sourceChannel: Channel;
  linkMethod: LinkMethod;
  linkConfidence: number;
  firstSeenIso: string;
}

export interface ChurnSignal {
  rule: string;
  evidence: string;
}

export interface CustomerDetail {
  id: string;
  displayName: string | null;
  isAnonymous: boolean;
  channels: Channel[];
  eventCount: number;
  firstSeenIso: string;
  lastSeenIso: string;
  activeDurationDays: number;
  silenceDays: number;
  /** Profile identity confidence = the weakest identifier link (SoT D-10). */
  identityConfidence: number;
  weakestLink: { confidence: number; explanation: string };
  identifiers: CustomerIdentifier[];
  hasConflict: boolean;
  churnRisk: ChurnRisk;
  churnSignals: ChurnSignal[];
  patternCounts: Record<CustomerPattern, number>;
  asOfIso: string;
}
