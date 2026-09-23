import { maskIdentifier } from "@/lib/pipeline/normalize";
import type { PipelineStore } from "@/lib/pipeline/store";
import {
  isStrongIdentifier,
  type IdentifierRecord,
  type NormalizedEvent,
  type ProfileRecord,
  type ResolutionCandidate,
  type ResolutionEvidence,
  type ResolutionResult,
  type StoredEventRecord,
} from "@/lib/pipeline/types";
import { CHANNEL_LABEL } from "@/lib/types/domain";
import type { IdentifierType } from "@/lib/types/customer";

import { jaroWinkler } from "./jaro-winkler";

/** Scoring weights and thresholds — SoT §4.6 steps 4 and 5, verbatim. */
export const SCORING = {
  deviceId: 0.6,
  cookieId: 0.3,
  sessionContinuity: 0.5,
  nameWeight: 0.2,
  nameThreshold: 0.85,
  temporalProximity: 0.1,
  /** Probabilistic matching can never claim certainty. */
  maxScore: 0.94,
  matchThreshold: 0.7,
  /** A best/runner-up gap below this is ambiguous, so no match is made. */
  decisionMargin: 0.05,
  /** Confidence recorded when competing strong identifiers force a winner. */
  conflictConfidence: 0.75,
  sessionWindowMs: 30 * 60 * 1000,
  temporalWindowMs: 2 * 60 * 60 * 1000,
} as const;

/** Everything the resolver needs, already fetched. Keeps scoring pure. */
export interface ResolutionContext {
  event: NormalizedEvent;
  /** Identifier rows matching one of the event's (type, value) pairs. */
  identifierMatches: IdentifierRecord[];
  /** Every identifier owned by any profile in play. */
  profileIdentifiers: IdentifierRecord[];
  profiles: ProfileRecord[];
  /** Candidate events within ±2 h of the event, for continuity signals. */
  nearbyEvents: StoredEventRecord[];
}

/** Gathers the context for one event, then resolves it. */
export async function resolveEvent(
  store: PipelineStore,
  event: NormalizedEvent,
): Promise<ResolutionResult> {
  const identifierMatches = await store.findIdentifierOwners(event.identifiers);
  const candidateIds = [...new Set(identifierMatches.map((i) => i.customerId))];

  const windowFrom = new Date(
    Date.parse(event.timestampIso) - SCORING.temporalWindowMs,
  ).toISOString();
  const windowTo = new Date(
    Date.parse(event.timestampIso) + SCORING.temporalWindowMs,
  ).toISOString();

  const [profiles, profileIdentifiers, nearbyEvents] = await Promise.all([
    store.findProfiles(candidateIds),
    store.findIdentifiersForProfiles(candidateIds),
    candidateIds.length > 0
      ? store.findEventsInWindow(candidateIds, windowFrom, windowTo)
      : Promise.resolve([] as StoredEventRecord[]),
  ]);

  return resolveIdentity({
    event,
    identifierMatches,
    profileIdentifiers,
    profiles,
    nearbyEvents,
  });
}

/**
 * The identity-resolution decision (SoT §4.6). Pure: same context in, same
 * decision out. Every signal it considered — including the ones that did *not*
 * match — is returned as evidence, so the UI can answer "why does JourneyX
 * believe this event belongs to this customer?" without inventing anything.
 */
export function resolveIdentity(ctx: ResolutionContext): ResolutionResult {
  const { event } = ctx;
  const strong = event.identifiers.filter((i) => isStrongIdentifier(i.type));

  /* ---- Step 1: strong deterministic lookup ---- */
  const strongOwners = ctx.identifierMatches.filter((m) => isStrongIdentifier(m.type));
  const ownerIds = [...new Set(strongOwners.map((m) => m.customerId))];

  if (ownerIds.length === 1) {
    const customerId = ownerIds[0];
    const matched = strongOwners.filter((m) => m.customerId === customerId);
    const evidence: ResolutionEvidence[] = matched.map((m) => ({
      signal: "strong_identifier",
      matched: true,
      contribution: 0,
      identifierType: m.type,
      description: `${labelFor(m.type)} ${maskIdentifier(m.type, m.value)} matches an identifier already on this customer.`,
    }));
    for (const id of strong) {
      if (!matched.some((m) => m.type === id.type && m.value === id.value)) {
        evidence.push({
          signal: "strong_identifier",
          matched: false,
          contribution: 0,
          identifierType: id.type,
          description: `${labelFor(id.type)} ${maskIdentifier(id.type, id.value)} was not previously known — it is added to this customer.`,
        });
      }
    }
    return {
      customerId,
      method: "deterministic",
      confidence: 1,
      evidence,
      candidates: [{ customerId, score: 1, evidence }],
      identifiersAdded: [],
      ambiguous: false,
      conflict: false,
      conflictDetails: null,
      createdProfile: false,
    };
  }

  if (ownerIds.length >= 2) {
    /* ---- Identity conflict: never merge silently (SoT §4.6 step 1) ---- */
    const winner = pickConflictWinner(ownerIds, ctx.profiles);
    const evidence: ResolutionEvidence[] = [
      {
        signal: "conflict",
        matched: true,
        contribution: 0,
        description: `This event carries strong identifiers owned by ${ownerIds.length} different customers. The event is attached to the largest profile and both profiles are flagged for review — no profiles were merged.`,
      },
      ...strongOwners.map<ResolutionEvidence>((m) => ({
        signal: "strong_identifier",
        matched: m.customerId === winner,
        contribution: 0,
        identifierType: m.type,
        description: `${labelFor(m.type)} ${maskIdentifier(m.type, m.value)} belongs to ${m.customerId}.`,
      })),
    ];
    return {
      customerId: winner,
      method: "deterministic",
      confidence: SCORING.conflictConfidence,
      evidence,
      candidates: ownerIds.map((id) => ({
        customerId: id,
        score: id === winner ? SCORING.conflictConfidence : 0,
        evidence: [],
      })),
      identifiersAdded: [],
      ambiguous: false,
      conflict: true,
      conflictDetails: {
        competingProfileIds: ownerIds,
        winnerId: winner,
        identifiers: strongOwners.map((m) => ({
          customerId: m.customerId,
          type: m.type,
          maskedValue: maskIdentifier(m.type, m.value),
        })),
      },
      createdProfile: false,
    };
  }

  /* ---- Step 2: candidates from exact device/cookie matches only ---- */
  const weakMatches = ctx.identifierMatches.filter(
    (m) => m.type === "device_id" || m.type === "cookie_id",
  );
  const candidateIds = [...new Set(weakMatches.map((m) => m.customerId))];

  const candidates: ResolutionCandidate[] = [];
  for (const customerId of candidateIds) {
    const candidate = scoreCandidate(ctx, customerId, weakMatches);
    candidates.push(candidate);
  }

  const viable = candidates
    .filter((c) => !c.rejectedReason)
    .sort((a, b) => b.score - a.score);
  const best = viable[0];
  const runnerUp = viable[1];

  /* ---- Step 5: decide ---- */
  if (best && best.score >= SCORING.matchThreshold) {
    const margin = best.score - (runnerUp?.score ?? 0);
    if (margin >= SCORING.decisionMargin) {
      return {
        customerId: best.customerId,
        method: "probabilistic",
        confidence: round(best.score),
        evidence: best.evidence,
        candidates,
        identifiersAdded: [],
        ambiguous: false,
        conflict: false,
        conflictDetails: null,
        createdProfile: false,
      };
    }
    return newProfileResult(candidates, [
      ...best.evidence.filter((e) => e.matched),
      {
        signal: "contradiction",
        matched: false,
        contribution: 0,
        description: `Two customers scored within ${SCORING.decisionMargin.toFixed(2)} of each other (${best.score.toFixed(2)} vs ${runnerUp!.score.toFixed(2)}). JourneyX creates a new profile rather than guess.`,
      },
    ], true);
  }

  /* ---- No match: create a new profile ---- */
  const evidence: ResolutionEvidence[] =
    candidates.length > 0
      ? candidates.flatMap((c) =>
          c.rejectedReason
            ? [
                {
                  signal: "contradiction" as const,
                  matched: false,
                  contribution: 0,
                  description: c.rejectedReason,
                },
              ]
            : [
                {
                  signal: "contradiction" as const,
                  matched: false,
                  contribution: 0,
                  description: `Best candidate ${c.customerId} scored ${c.score.toFixed(2)}, below the ${SCORING.matchThreshold.toFixed(2)} match threshold.`,
                },
              ],
        )
      : [
          {
            signal: "no_identifiers",
            matched: false,
            contribution: 0,
            description:
              "No existing customer shares a strong identifier, device or cookie with this event.",
          },
        ];

  return newProfileResult(candidates, evidence, false);
}

function newProfileResult(
  candidates: ResolutionCandidate[],
  evidence: ResolutionEvidence[],
  ambiguous: boolean,
): ResolutionResult {
  return {
    // Filled in by the caller once the profile row exists.
    customerId: "",
    method: "new_profile",
    // No prior customer was matched, so match confidence is zero (SoT §4.6).
    confidence: 0,
    evidence,
    candidates,
    identifiersAdded: [],
    ambiguous,
    conflict: false,
    conflictDetails: null,
    createdProfile: true,
  };
}

/** Most events wins; ties break to the earliest-seen profile (SoT §4.6). */
function pickConflictWinner(ownerIds: string[], profiles: ProfileRecord[]): string {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return [...ownerIds].sort((a, b) => {
    const pa = byId.get(a);
    const pb = byId.get(b);
    const events = (pb?.eventCount ?? 0) - (pa?.eventCount ?? 0);
    if (events !== 0) return events;
    const seenA = pa?.firstSeenIso ? Date.parse(pa.firstSeenIso) : Number.MAX_SAFE_INTEGER;
    const seenB = pb?.firstSeenIso ? Date.parse(pb.firstSeenIso) : Number.MAX_SAFE_INTEGER;
    if (seenA !== seenB) return seenA - seenB;
    return a < b ? -1 : 1;
  })[0];
}

/** Steps 3 and 4: contradiction filter, then additive scoring. */
function scoreCandidate(
  ctx: ResolutionContext,
  customerId: string,
  weakMatches: IdentifierRecord[],
): ResolutionCandidate {
  const { event } = ctx;
  const owned = ctx.profileIdentifiers.filter((i) => i.customerId === customerId);
  const evidence: ResolutionEvidence[] = [];

  /* Step 3: a candidate owning a *different* value for a strong identifier
     type present on this event cannot be the same person. */
  for (const id of event.identifiers) {
    if (!isStrongIdentifier(id.type)) continue;
    const conflicting = owned.find((o) => o.type === id.type && o.value !== id.value);
    if (conflicting) {
      return {
        customerId,
        score: 0,
        evidence: [],
        rejectedReason: `Customer ${customerId} shares a device or cookie but has a different ${labelFor(id.type)}, so it cannot be the same person.`,
      };
    }
  }

  let score = 0;
  const matchedDevice = weakMatches.find(
    (m) => m.customerId === customerId && m.type === "device_id",
  );
  if (matchedDevice) {
    score += SCORING.deviceId;
    evidence.push({
      signal: "device_id",
      matched: true,
      contribution: SCORING.deviceId,
      identifierType: "device_id",
      description: `Device ${maskIdentifier("device_id", matchedDevice.value)} is already linked to this customer.`,
    });
  }

  const matchedCookie = weakMatches.find(
    (m) => m.customerId === customerId && m.type === "cookie_id",
  );
  if (matchedCookie) {
    score += SCORING.cookieId;
    evidence.push({
      signal: "cookie_id",
      matched: true,
      contribution: SCORING.cookieId,
      identifierType: "cookie_id",
      description: `Cookie ${maskIdentifier("cookie_id", matchedCookie.value)} is already linked to this customer.`,
    });
  }

  const eventTime = Date.parse(event.timestampIso);
  const candidateEvents = ctx.nearbyEvents.filter((e) => e.customerId === customerId);
  const sharedWeakValues = new Set(
    [matchedDevice?.value, matchedCookie?.value].filter(Boolean) as string[],
  );

  /* Session continuity: same channel, same device/cookie, within ±30 min. */
  const continuity = candidateEvents.find((e) => {
    if (e.channel !== event.channel) return false;
    if (Math.abs(Date.parse(e.timestampIso) - eventTime) > SCORING.sessionWindowMs) return false;
    return Object.values(e.identifiers ?? {}).some((v) => sharedWeakValues.has(v));
  });
  if (continuity) {
    score += SCORING.sessionContinuity;
    evidence.push({
      signal: "session_continuity",
      matched: true,
      contribution: SCORING.sessionContinuity,
      description: `The same device or cookie was active on ${CHANNEL_LABEL[event.channel]} ${minutesBetween(continuity.timestampIso, event.timestampIso)} minutes ${Date.parse(continuity.timestampIso) <= eventTime ? "before" : "after"} this event.`,
    });
  }

  /* Name similarity: supporting signal only, never a candidate generator. */
  const eventName = event.identifiers.find((i) => i.type === "name")?.value;
  const candidateName =
    owned.find((o) => o.type === "name")?.value ??
    ctx.profiles.find((p) => p.id === customerId)?.displayName ??
    null;
  if (eventName && candidateName) {
    const similarity = jaroWinkler(eventName, candidateName);
    if (similarity >= SCORING.nameThreshold) {
      const contribution = round(SCORING.nameWeight * similarity);
      score += contribution;
      evidence.push({
        signal: "name_similarity",
        matched: true,
        contribution,
        identifierType: "name",
        description: `Name "${eventName}" is ${(similarity * 100).toFixed(0)}% similar to "${candidateName}".`,
      });
    } else {
      evidence.push({
        signal: "name_similarity",
        matched: false,
        contribution: 0,
        identifierType: "name",
        description: `Name "${eventName}" is only ${(similarity * 100).toFixed(0)}% similar to "${candidateName}" — below the ${(SCORING.nameThreshold * 100).toFixed(0)}% threshold.`,
      });
    }
  }

  /* Temporal proximity: activity on a *different* channel within ±2 h. */
  const crossChannel = candidateEvents.find(
    (e) =>
      e.channel !== event.channel &&
      Math.abs(Date.parse(e.timestampIso) - eventTime) <= SCORING.temporalWindowMs,
  );
  if (crossChannel) {
    score += SCORING.temporalProximity;
    evidence.push({
      signal: "temporal_proximity",
      matched: true,
      contribution: SCORING.temporalProximity,
      description: `This customer was active on ${CHANNEL_LABEL[crossChannel.channel]} within 2 hours of this event.`,
    });
  }

  return { customerId, score: round(Math.min(SCORING.maxScore, score)), evidence };
}

function minutesBetween(a: string, b: string): number {
  return Math.round(Math.abs(Date.parse(a) - Date.parse(b)) / 60_000);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const IDENTIFIER_LABEL: Record<IdentifierType, string> = {
  email: "Email",
  phone: "Phone",
  loyalty_id: "Loyalty ID",
  device_id: "Device ID",
  cookie_id: "Cookie ID",
  name: "Name",
};

function labelFor(type: IdentifierType): string {
  return IDENTIFIER_LABEL[type];
}
