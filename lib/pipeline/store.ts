import type { Channel, ChurnRisk, PatternType } from "@/lib/types/domain";
import type { IdentifierType, LinkMethod } from "@/lib/types/customer";

import type {
  DetectedPattern,
  IdentifierRecord,
  NormalizedEvent,
  NormalizedIdentifier,
  PipelineStage,
  ProfileRecord,
  ResolutionMethod,
  ResolutionResult,
  StoredEventRecord,
} from "./types";

export interface NewProfileInput {
  displayName: string | null;
  firstSeenIso: string;
  lastActiveIso: string;
  channel: Channel;
}

export interface IdentifierUpsert {
  customerId: string;
  type: IdentifierType;
  value: string;
  sourceChannel: Channel;
  linkMethod: LinkMethod;
  linkConfidence: number;
  seenAtIso: string;
}

export interface EventInsert {
  customerId: string;
  event: NormalizedEvent;
  method: ResolutionMethod;
  confidence: number;
  source: string;
}

export interface ResolutionLogInsert {
  eventId: string;
  customerId: string;
  result: ResolutionResult;
}

export interface ProfileUpdate {
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  loyaltyId?: string | null;
  isAnonymous?: boolean;
  channels?: Channel[];
  eventCount?: number;
  identityConfidence?: number;
  churnRisk?: ChurnRisk;
  patterns?: PatternType[];
  firstSeenIso?: string;
  lastActiveIso?: string;
  hasIdentityConflict?: boolean;
  patternsEvaluatedAtIso?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationInput {
  type: "identity_conflict" | "churn_risk_high" | "unresolved_issue";
  severity: "info" | "warning" | "critical";
  dedupeKey: string;
  title: string;
  message: string;
  customerId: string | null;
  deepLink: string | null;
}

export interface IngestionLogInput {
  channel: string | null;
  eventType: string | null;
  outcome: "accepted" | "duplicate" | "rejected" | "failed";
  stageReached: PipelineStage;
  errorCode: string | null;
  errorMessage: string | null;
  eventId: string | null;
  latencyMs: number;
  stageTimings: Record<string, number>;
}

/**
 * Persistence port for the ingestion pipeline. The engine (`lib/pipeline`,
 * `lib/identity`, `lib/patterns`) depends only on this interface, so the same
 * code runs against Supabase in the app and against an in-memory store in the
 * tests. Implementations live in `lib/pipeline/adapters/`.
 */
export interface PipelineStore {
  /* -------- reads used by identity resolution -------- */

  /** Identifier rows matching any of the event's (type, value) pairs. */
  findIdentifierOwners(identifiers: NormalizedIdentifier[]): Promise<IdentifierRecord[]>;
  /** Every identifier owned by the given profiles. */
  findIdentifiersForProfiles(customerIds: string[]): Promise<IdentifierRecord[]>;
  findProfiles(customerIds: string[]): Promise<ProfileRecord[]>;
  /** Events for the given profiles inside `[fromIso, toIso]`, for scoring. */
  findEventsInWindow(
    customerIds: string[],
    fromIso: string,
    toIso: string,
  ): Promise<StoredEventRecord[]>;

  /* -------- deduplication -------- */

  findEventByDedupKey(dedupKey: string): Promise<{ id: string; customerId: string } | null>;

  /* -------- transaction 1: resolve and store -------- */

  createProfile(input: NewProfileInput): Promise<string>;
  upsertIdentifiers(identifiers: IdentifierUpsert[]): Promise<void>;
  insertEvent(input: EventInsert): Promise<string>;
  insertResolutionLog(input: ResolutionLogInsert): Promise<void>;
  updateProfile(customerId: string, update: ProfileUpdate): Promise<void>;

  /* -------- transaction 2: patterns, flags, notifications -------- */

  /** All of a profile's events, chronologically — detector input. */
  findProfileEvents(customerId: string): Promise<StoredEventRecord[]>;
  /** Insert/update by (customer_id, pattern_key); returns nothing. */
  upsertPatterns(customerId: string, patterns: DetectedPattern[]): Promise<void>;
  /** Remove findings that no longer hold (e.g. a late purchase closed a drop-off). */
  deletePatternsExcept(customerId: string, keepKeys: string[]): Promise<void>;
  createNotification(input: NotificationInput): Promise<void>;

  /* -------- observability -------- */

  insertIngestionLog(input: IngestionLogInput): Promise<void>;
}
