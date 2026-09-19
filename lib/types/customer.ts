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
