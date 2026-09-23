import { resolveEvent } from "@/lib/identity/resolve";
import { reconcileProfile } from "@/lib/patterns/reconcile";
import type { LinkMethod } from "@/lib/types/customer";

import { NormalizationError, maskIdentifier, normalizeEvent } from "./normalize";
import type { IdentifierUpsert, PipelineStore } from "./store";
import {
  isStrongIdentifier,
  type NormalizedEvent,
  type PipelineFailure,
  type PipelineResult,
  type PipelineStage,
  type PipelineSuccess,
  type RawEvent,
  type ResolutionResult,
} from "./types";
import { validateEvent } from "./validate";

export interface IngestOptions {
  asOf: Date;
  /** Provenance recorded on the event row: `api`, `seed`, … */
  source?: string;
  /** Skip pattern reconciliation — used by the seeder, which reconciles once
   *  per customer at the end instead of after every event. */
  skipReconcile?: boolean;
}

/**
 * The JourneyX ingestion pipeline, end to end:
 *
 *   parse → validate → normalize → deduplicate →
 *   [T1: resolve → expand identifiers → store event → resolution log] →
 *   [T2: detect patterns → reconcile → flags → notifications] →
 *   ingestion log
 *
 * Every attempt — accepted, duplicate, rejected or failed — writes exactly one
 * `ingestion_log` row outside both transactions (SoT D-18), which is what the
 * Pipeline health screen reads.
 */
export async function processEvent(
  store: PipelineStore,
  input: unknown,
  options: IngestOptions,
): Promise<PipelineResult> {
  const startedAt = Date.now();
  const timings: Record<string, number> = {};
  let stage: PipelineStage = "parsed";
  let mark = startedAt;
  const lap = (name: string) => {
    const now = Date.now();
    timings[name] = now - mark;
    mark = now;
  };

  let normalized: NormalizedEvent | null = null;

  try {
    /* ---- Stage 1: validate ---- */
    const validation = validateEvent(input);
    if (!validation.ok) {
      lap("validate");
      return await reject(store, {
        code: "validation_error",
        message: "The event failed schema validation.",
        details: validation.errors,
        stage: "parsed",
        channel: readString(input, "channel"),
        eventType: readString(input, "event_type"),
        startedAt,
        timings,
      });
    }
    const raw: RawEvent = validation.value;
    stage = "validated";
    lap("validate");

    /* ---- Stage 2: normalize ---- */
    try {
      normalized = normalizeEvent(raw, options.asOf);
    } catch (error) {
      lap("normalize");
      if (error instanceof NormalizationError) {
        return await reject(store, {
          code: "validation_error",
          message: "The event could not be normalized.",
          details: [{ field: error.field, message: error.message }],
          stage: "validated",
          channel: raw.channel,
          eventType: raw.event_type,
          startedAt,
          timings,
        });
      }
      throw error;
    }
    if (normalized.identifiers.length === 0) {
      lap("normalize");
      return await reject(store, {
        code: "validation_error",
        message: "No identifier survived normalization.",
        details: [
          {
            field: "identifiers",
            message:
              "Every supplied identifier was malformed (for example an email without a domain).",
          },
        ],
        stage: "validated",
        channel: raw.channel,
        eventType: raw.event_type,
        startedAt,
        timings,
      });
    }
    stage = "normalized";
    lap("normalize");

    /* ---- Stage 3: deduplicate ---- */
    const existing = await store.findEventByDedupKey(normalized.dedupKey);
    stage = "deduplicated";
    lap("dedup");
    if (existing) {
      const latencyMs = Date.now() - startedAt;
      await store.insertIngestionLog({
        channel: normalized.channel,
        eventType: normalized.eventType,
        outcome: "duplicate",
        stageReached: "deduplicated",
        errorCode: null,
        errorMessage: null,
        eventId: existing.id,
        latencyMs,
        stageTimings: timings,
      });
      return {
        ok: true,
        duplicate: true,
        eventId: existing.id,
        customerId: existing.customerId,
        method: "deterministic",
        confidence: 1,
        evidence: [
          {
            signal: "strong_identifier",
            matched: true,
            contribution: 0,
            description:
              "This event was already ingested; the original event and its effects are unchanged.",
          },
        ],
        identifiersAdded: [],
        conflict: false,
        ambiguous: false,
        patterns: [],
        churnRisk: "none",
        stageReached: "deduplicated",
        latencyMs,
        stageTimings: timings,
      };
    }

    /* ---- Transaction 1: resolve, expand, store ---- */
    const resolution = await resolveEvent(store, normalized);
    stage = "resolved";
    lap("resolve");

    let customerId = resolution.customerId;
    if (resolution.createdProfile) {
      customerId = await store.createProfile({
        displayName: normalized.identifiers.find((i) => i.type === "name")?.value ?? null,
        firstSeenIso: normalized.timestampIso,
        lastActiveIso: normalized.timestampIso,
        channel: normalized.channel,
      });
    }

    const identifiersAdded = await expandIdentifiers(
      store,
      customerId,
      normalized,
      resolution,
    );

    const eventId = await store.insertEvent({
      customerId,
      event: normalized,
      method: resolution.method,
      confidence: resolution.confidence,
      source: options.source ?? "api",
    });

    await store.insertResolutionLog({
      eventId,
      customerId,
      result: { ...resolution, customerId, identifiersAdded },
    });

    if (resolution.conflict) {
      await flagConflict(store, resolution, eventId, customerId);
    }

    stage = "stored";
    lap("store");

    /* ---- Transaction 2: patterns, flags, notifications (best effort) ---- */
    let patterns: PipelineSuccess["patterns"] = [];
    let churnRisk: PipelineSuccess["churnRisk"] = "none";
    if (!options.skipReconcile) {
      try {
        const reconciled = await reconcileProfile(store, customerId, options.asOf);
        patterns = reconciled.patterns.map((p) => ({
          patternType: p.patternType,
          patternKey: p.patternKey,
          description: p.description,
        }));
        churnRisk = reconciled.churnRisk;
        stage = "patterns";
      } catch (error) {
        // The event is safely stored; pattern reconciliation can be retried.
        console.error("[pipeline] pattern reconciliation failed", error);
      }
      lap("patterns");
    }

    const latencyMs = Date.now() - startedAt;
    await store.insertIngestionLog({
      channel: normalized.channel,
      eventType: normalized.eventType,
      outcome: "accepted",
      stageReached: stage,
      errorCode: null,
      errorMessage: null,
      eventId,
      latencyMs,
      stageTimings: timings,
    });

    return {
      ok: true,
      duplicate: false,
      eventId,
      customerId,
      method: resolution.method,
      confidence: resolution.confidence,
      evidence: resolution.evidence,
      identifiersAdded,
      conflict: resolution.conflict,
      ambiguous: resolution.ambiguous,
      patterns,
      churnRisk,
      stageReached: stage,
      latencyMs,
      stageTimings: timings,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[pipeline] ingestion failed", error);
    await safeLog(store, {
      channel: normalized?.channel ?? readString(input, "channel"),
      eventType: normalized?.eventType ?? readString(input, "event_type"),
      outcome: "failed",
      stageReached: stage,
      errorCode: "internal_error",
      // PII-free: the message is ours, never the payload.
      errorMessage: message.slice(0, 300),
      eventId: null,
      latencyMs,
      stageTimings: timings,
    });
    return {
      ok: false,
      code: "internal_error",
      message: "The event could not be processed.",
      stageReached: stage,
      latencyMs,
    };
  }
}

/** Runs a batch sequentially; partial success is allowed (SoT §4.5). */
export async function processBatch(
  store: PipelineStore,
  events: unknown[],
  options: IngestOptions,
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];
  for (const event of events) {
    results.push(await processEvent(store, event, options));
  }
  return results;
}

/**
 * Step 6 of resolution: the profile learns every identifier this event carried
 * that it did not already own. This is how one customer's identifier graph
 * grows — a cookie today, an email at login tomorrow, a phone number when they
 * call. Strong identifiers already owned by *another* profile are never moved.
 */
async function expandIdentifiers(
  store: PipelineStore,
  customerId: string,
  event: NormalizedEvent,
  resolution: ResolutionResult,
): Promise<ResolutionResult["identifiersAdded"]> {
  const owned = await store.findIdentifiersForProfiles([customerId]);
  const ownedKeys = new Set(owned.map((i) => `${i.type}:${i.value}`));

  const linkMethod: LinkMethod = resolution.conflict
    ? "conflict"
    : resolution.createdProfile
      ? "origin"
      : resolution.method === "probabilistic"
        ? "probabilistic"
        : "deterministic";
  // A new profile is defined by its own first identifiers, so they are certain.
  const linkConfidence = resolution.createdProfile ? 1 : resolution.confidence;

  const upserts: IdentifierUpsert[] = [];
  const added: ResolutionResult["identifiersAdded"] = [];

  for (const identifier of event.identifiers) {
    const key = `${identifier.type}:${identifier.value}`;
    const isNew = !ownedKeys.has(key);
    if (isNew && isStrongIdentifier(identifier.type) && resolution.conflict) {
      // Do not take a strong identifier that another profile owns.
      const ownedElsewhere = resolution.conflictDetails?.identifiers.some(
        (c) => c.type === identifier.type && c.customerId !== customerId,
      );
      if (ownedElsewhere) continue;
    }
    upserts.push({
      customerId,
      type: identifier.type,
      value: identifier.value,
      sourceChannel: event.channel,
      linkMethod,
      linkConfidence,
      seenAtIso: event.timestampIso,
    });
    if (isNew) {
      added.push({
        type: identifier.type,
        value: identifier.value,
        linkMethod,
        linkConfidence,
      });
    }
  }

  if (upserts.length > 0) await store.upsertIdentifiers(upserts);
  return added;
}

/** Records the conflict on both profiles and raises one notification (N-01). */
async function flagConflict(
  store: PipelineStore,
  resolution: ResolutionResult,
  eventId: string,
  customerId: string,
): Promise<void> {
  const details = resolution.conflictDetails;
  if (!details) return;

  for (const profileId of details.competingProfileIds) {
    await store.updateProfile(profileId, { hasIdentityConflict: true });
  }

  const masked = details.identifiers
    .map((i) => `${i.type} ${i.maskedValue} → ${i.customerId}`)
    .join("; ");

  await store.createNotification({
    type: "identity_conflict",
    severity: "warning",
    dedupeKey: `conflict:${eventId}`,
    title: "Identity conflict detected",
    message: `An event carried strong identifiers owned by different customers (${masked}). No profiles were merged; the event was attached to ${customerId}.`,
    customerId,
    deepLink: `/customers/${customerId}/identity`,
  });
}

interface RejectInput {
  code: PipelineFailure["code"];
  message: string;
  details?: { field: string; message: string }[];
  stage: PipelineStage;
  channel: string | null;
  eventType: string | null;
  startedAt: number;
  timings: Record<string, number>;
}

async function reject(store: PipelineStore, input: RejectInput): Promise<PipelineFailure> {
  const latencyMs = Date.now() - input.startedAt;
  await safeLog(store, {
    channel: input.channel,
    eventType: input.eventType,
    outcome: "rejected",
    stageReached: input.stage,
    errorCode: input.code,
    errorMessage: input.details?.map((d) => `${d.field}: ${d.message}`).join("; ").slice(0, 300) ?? input.message,
    eventId: null,
    latencyMs,
    stageTimings: input.timings,
  });
  return {
    ok: false,
    code: input.code,
    message: input.message,
    details: input.details,
    stageReached: input.stage,
    latencyMs,
  };
}

/** The observability write must never be the reason an ingestion fails. */
async function safeLog(
  store: PipelineStore,
  input: Parameters<PipelineStore["insertIngestionLog"]>[0],
): Promise<void> {
  try {
    await store.insertIngestionLog(input);
  } catch (error) {
    console.error("[pipeline] ingestion_log write failed", error);
  }
}

function readString(input: unknown, key: string): string | null {
  if (!input || typeof input !== "object") return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value.slice(0, 100) : null;
}

export { maskIdentifier };
