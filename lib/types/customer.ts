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

/* ------------------------------------------------------------------ *
 * Customer journey (S-04). The journey engine is computed at read time
 * (SoT §4.7): sessions (≤30m same channel), journeys (≤24h across
 * channels), transitions (channel change), plus detector patterns.
 * ------------------------------------------------------------------ */

export type EventCategory =
  | "browse"
  | "commerce"
  | "account"
  | "support"
  | "engagement"
  | "in_store"
  | "unknown";

/** A pattern annotation attached to an event (SoT §4.8). */
export interface JourneyEventPattern {
  type: CustomerPattern;
  /** Short badge label, e.g. "Escalation · mobile → call center". */
  label: string;
  /** One-line explanation shown in the expanded card. */
  detail: string;
  role: "anchor" | "related";
  /** Ties an anchor to its related events for highlight-on-click. */
  groupId: string;
}

export interface JourneyEvent {
  id: string;
  timestampIso: string;
  channel: Channel;
  eventType: string;
  eventCategory: EventCategory;
  /** One-line metadata summary for the collapsed card. */
  summary: string;
  /** Key/value pairs for the expanded card (already display-formatted). */
  metadata: { label: string; value: string }[];
  resolution: {
    method: LinkMethod;
    confidence: number;
    evidence: string[];
  };
  sessionIndex: number;
  journeyIndex: number;
  isSessionStart: boolean;
  isJourneyStart: boolean;
  /** Channel differs from the previous event. */
  isTransition: boolean;
  transitionFrom: Channel | null;
  /** Minutes since the previous event (0 for the first). */
  gapMinutes: number;
  patterns: JourneyEventPattern[];
}

export interface CustomerJourney {
  id: string;
  displayName: string | null;
  isAnonymous: boolean;
  events: JourneyEvent[];
  channels: Channel[];
  totalEvents: number;
  journeyCount: number;
  sessionCount: number;
  silenceDays: number;
  churnRisk: ChurnRisk;
  asOfIso: string;
}

/* ------------------------------------------------------------------ *
 * Identity graph (S-05). Built entirely from `customer_identifiers`
 * and `resolution_logs` — every edge shown is a decision the engine
 * actually made, with the evidence it made it on.
 * ------------------------------------------------------------------ */

/** A source system's isolated view of the customer, before unification. */
export interface IdentityFragment {
  /** The channel system that holds this fragment. */
  channel: Channel;
  /** The identifier that system knows them by. */
  identifierType: IdentifierType;
  value: string;
  maskedValue: string;
  eventCount: number;
  firstSeenIso: string;
  lastSeenIso: string;
}

/** One identifier linked to the unified customer, with its provenance. */
export interface IdentityNode {
  id: string;
  type: IdentifierType;
  value: string;
  sourceChannel: Channel;
  linkMethod: LinkMethod;
  linkConfidence: number;
  firstSeenIso: string;
  lastSeenIso: string;
  /** Why the engine attached this identifier — verbatim resolution evidence. */
  evidence: string[];
  linkedByEventId: string | null;
  linkedByEventType: string | null;
}

/** One resolution decision, in the order the events arrived. */
export interface ResolutionChainStep {
  eventId: string;
  timestampIso: string;
  channel: Channel;
  eventType: string;
  method: LinkMethod;
  confidence: number;
  evidence: string[];
  identifiersAdded: { type: IdentifierType; maskedValue: string }[];
  ambiguous: boolean;
  conflict: boolean;
}

export interface IdentityConflictSummary {
  eventId: string;
  detectedAtIso: string;
  competingProfileIds: string[];
  identifiers: { customerId: string; type: IdentifierType; maskedValue: string }[];
}

export interface IdentityGraph {
  customerId: string;
  displayName: string | null;
  isAnonymous: boolean;
  identityConfidence: number;
  weakestLink: { confidence: number; explanation: string };
  nodes: IdentityNode[];
  fragments: IdentityFragment[];
  chain: ResolutionChainStep[];
  conflicts: IdentityConflictSummary[];
  methodCounts: Record<LinkMethod, number>;
  totalEvents: number;
  asOfIso: string;
}

/* ------------------------------------------------------------------ *
 * Customer search (S-09)
 * ------------------------------------------------------------------ */

export interface CustomerSearchHit {
  id: string;
  displayName: string | null;
  /** The identifier the query matched, masked. */
  matchedOn: { type: IdentifierType; maskedValue: string } | null;
  identifierCount: number;
  eventCount: number;
  channels: Channel[];
  churnRisk: ChurnRisk;
  lastActiveIso: string | null;
}

export interface CustomerSearchResult {
  query: string;
  hits: CustomerSearchHit[];
  total: number;
}
