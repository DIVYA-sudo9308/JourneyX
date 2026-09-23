import type { Channel, ChurnRisk, PatternType } from "@/lib/types/domain";
import type { EventCategory, IdentifierType, LinkMethod } from "@/lib/types/customer";

/** Resolution methods recorded on an event (SoT §4.3 `resolution_method`). */
export type ResolutionMethod = "deterministic" | "probabilistic" | "new_profile";

/** Identifiers as they arrive on the wire, before normalization. */
export interface RawIdentifiers {
  email?: string | null;
  phone?: string | null;
  loyalty_id?: string | null;
  /** Producer-side customer key. Normalized into a `loyalty_id` identifier. */
  customer_id?: string | null;
  device_id?: string | null;
  cookie_id?: string | null;
  name?: string | null;
}

/** A validated (but not yet normalized) ingestion request body. */
export interface RawEvent {
  event_id?: string | null;
  channel: Channel;
  event_type: string;
  timestamp: string;
  identifiers: RawIdentifiers;
  metadata?: Record<string, unknown>;
}

/** One normalized identifier extracted from an event. */
export interface NormalizedIdentifier {
  type: IdentifierType;
  value: string;
}

/** The canonical event shape every downstream stage operates on. */
export interface NormalizedEvent {
  sourceEventId: string | null;
  channel: Channel;
  eventType: string;
  eventCategory: EventCategory;
  /** UTC ISO-8601, millisecond precision. */
  timestampIso: string;
  identifiers: NormalizedIdentifier[];
  metadata: Record<string, unknown>;
  /** Untouched request body, kept for audit (SoT §4.3 `raw_data`). */
  raw: Record<string, unknown>;
  dedupKey: string;
}

/** Strong identifier types own a profile exclusively (SoT §4.6 step 1). */
export const STRONG_IDENTIFIER_TYPES = ["email", "phone", "loyalty_id"] as const;
export type StrongIdentifierType = (typeof STRONG_IDENTIFIER_TYPES)[number];

export function isStrongIdentifier(type: IdentifierType): type is StrongIdentifierType {
  return (STRONG_IDENTIFIER_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ *
 * Identity resolution
 * ------------------------------------------------------------------ */

/** One signal that did — or explicitly did not — support a decision. */
export interface ResolutionEvidence {
  signal:
    | "strong_identifier"
    | "device_id"
    | "cookie_id"
    | "session_continuity"
    | "name_similarity"
    | "temporal_proximity"
    | "contradiction"
    | "no_identifiers"
    | "conflict";
  /** Did this signal contribute to the chosen profile? */
  matched: boolean;
  /** Points added to the candidate score (0 for deterministic/no-op signals). */
  contribution: number;
  /** Human-readable, PII-masked explanation shown in the UI. */
  description: string;
  identifierType?: IdentifierType;
}

export interface ResolutionCandidate {
  customerId: string;
  score: number;
  evidence: ResolutionEvidence[];
  /** Set when the candidate was dropped by the contradiction filter. */
  rejectedReason?: string;
}

export interface IdentityConflictDetails {
  /** Profiles that each own one of the event's strong identifiers. */
  competingProfileIds: string[];
  winnerId: string;
  /** Masked identifier values, by profile. */
  identifiers: { customerId: string; type: IdentifierType; maskedValue: string }[];
}

export interface IdentifierAddition {
  type: IdentifierType;
  value: string;
  linkMethod: LinkMethod;
  linkConfidence: number;
}

export interface ResolutionResult {
  customerId: string;
  method: ResolutionMethod;
  confidence: number;
  evidence: ResolutionEvidence[];
  candidates: ResolutionCandidate[];
  identifiersAdded: IdentifierAddition[];
  /** Two candidates scored within the 0.05 decision margin (SoT §4.6 step 5). */
  ambiguous: boolean;
  conflict: boolean;
  conflictDetails: IdentityConflictDetails | null;
  /** True when the resolver created the profile rather than matching one. */
  createdProfile: boolean;
}

/* ------------------------------------------------------------------ *
 * Pattern detection
 * ------------------------------------------------------------------ */

export interface DetectedPattern {
  patternType: PatternType;
  /** Deterministic identity of the finding (SoT §4.8) — reconciliation key. */
  patternKey: string;
  /** Anchor event; null for profile-level findings such as `churn_signal`. */
  eventId: string | null;
  relatedEventIds: string[];
  confidence: number;
  /** Detection time, i.e. the moment the rule became true. */
  detectedAtIso: string;
  severity: "low" | "medium" | "high";
  description: string;
  /** Stored in `patterns.metadata`; feeds analytics grouping. */
  details: Record<string, unknown>;
}

export interface ChurnAssessment {
  risk: ChurnRisk;
  /** The rules that fired, worst first. */
  signals: { rule: string; severity: "medium" | "high"; evidence: string }[];
}

/* ------------------------------------------------------------------ *
 * Pipeline results
 * ------------------------------------------------------------------ */

export type PipelineStage =
  | "parsed"
  | "validated"
  | "normalized"
  | "deduplicated"
  | "resolved"
  | "stored"
  | "patterns";

export interface PipelineSuccess {
  ok: true;
  duplicate: boolean;
  eventId: string;
  customerId: string;
  method: ResolutionMethod;
  confidence: number;
  evidence: ResolutionEvidence[];
  identifiersAdded: IdentifierAddition[];
  conflict: boolean;
  ambiguous: boolean;
  /** Patterns that exist on the profile after this event was reconciled. */
  patterns: { patternType: PatternType; patternKey: string; description: string }[];
  churnRisk: ChurnRisk;
  stageReached: PipelineStage;
  latencyMs: number;
  stageTimings: Record<string, number>;
}

export interface PipelineFailure {
  ok: false;
  code: "validation_error" | "internal_error";
  message: string;
  details?: { field: string; message: string }[];
  stageReached: PipelineStage;
  latencyMs: number;
}

export type PipelineResult = PipelineSuccess | PipelineFailure;

/* ------------------------------------------------------------------ *
 * Records as the store returns them
 * ------------------------------------------------------------------ */

export interface ProfileRecord {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  loyaltyId: string | null;
  isAnonymous: boolean;
  channels: Channel[];
  eventCount: number;
  identityConfidence: number;
  churnRisk: ChurnRisk;
  patterns: PatternType[];
  firstSeenIso: string | null;
  lastActiveIso: string | null;
  hasIdentityConflict: boolean;
}

export interface IdentifierRecord {
  id: string;
  customerId: string;
  type: IdentifierType;
  value: string;
  sourceChannel: Channel;
  linkMethod: LinkMethod;
  linkConfidence: number;
  firstSeenIso: string;
  lastSeenIso: string;
}

export interface StoredEventRecord {
  id: string;
  customerId: string;
  channel: Channel;
  eventType: string;
  eventCategory: EventCategory;
  timestampIso: string;
  metadata: Record<string, unknown>;
  identifiers: Record<string, string>;
  resolutionMethod: ResolutionMethod;
  resolutionConfidence: number;
}
