import { maskIdentifier } from "@/lib/pipeline/normalize";
import type { PipelineStore } from "@/lib/pipeline/store";
import type { DetectedPattern, IdentifierRecord } from "@/lib/pipeline/types";
import type { CustomerPattern } from "@/lib/types/customer";
import { CHANNELS, type Channel, type ChurnRisk, type PatternType } from "@/lib/types/domain";

import { assessChurn, churnPattern, detectPatterns } from "./detect";

export interface ReconcileResult {
  customerId: string;
  patterns: DetectedPattern[];
  churnRisk: ChurnRisk;
  eventCount: number;
  channels: Channel[];
}

const LIST_PATTERNS: CustomerPattern[] = [
  "drop_off",
  "escalation",
  "repeat_contact",
  "unresolved_issue",
];

/**
 * Transaction 2 (SoT D-18): re-evaluate one customer's whole history, then
 * reconcile the stored findings to match. Re-evaluation from scratch is what
 * makes the detectors idempotent — a replayed event, or a late purchase that
 * closes an old drop-off, converges on the same answer instead of stacking
 * duplicates. Best-effort: a failure here never rolls back the stored event.
 */
export async function reconcileProfile(
  store: PipelineStore,
  customerId: string,
  asOf: Date,
): Promise<ReconcileResult> {
  const [events, identifiers] = await Promise.all([
    store.findProfileEvents(customerId),
    store.findIdentifiersForProfiles([customerId]),
  ]);

  const detected = detectPatterns(events, asOf);
  const assessment = assessChurn(events, detected, asOf);
  const churn = churnPattern(customerId, assessment, asOf);
  const patterns = churn ? [...detected, churn] : detected;

  await store.upsertPatterns(customerId, patterns);
  await store.deletePatternsExcept(
    customerId,
    patterns.map((p) => p.patternKey),
  );

  const sorted = [...events].sort(
    (a, b) => Date.parse(a.timestampIso) - Date.parse(b.timestampIso),
  );
  const firstSeen = sorted[0]?.timestampIso ?? asOf.toISOString();
  const lastSeen = sorted.at(-1)?.timestampIso ?? asOf.toISOString();
  const channels = CHANNELS.filter((c) => sorted.some((e) => e.channel === c));

  const patternCounts = countPatterns(patterns);
  const patternTypes = [
    ...new Set(patterns.map((p) => p.patternType).filter((t) => t !== "churn_signal")),
  ] as PatternType[];

  const strongIdentifiers = identifiers.filter((i) =>
    ["email", "phone", "loyalty_id"].includes(i.type),
  );
  const identityConfidence = identifiers.length
    ? Math.min(...identifiers.map((i) => i.linkConfidence))
    : 1;
  const hasConflict = identifiers.some((i) => i.linkMethod === "conflict");

  await store.updateProfile(customerId, {
    displayName: displayNameFrom(identifiers),
    email: pick(identifiers, "email"),
    phone: pick(identifiers, "phone"),
    loyaltyId: pick(identifiers, "loyalty_id"),
    isAnonymous: strongIdentifiers.length === 0,
    channels,
    eventCount: events.length,
    identityConfidence,
    churnRisk: assessment.risk,
    patterns: patternTypes,
    firstSeenIso: firstSeen,
    lastActiveIso: lastSeen,
    patternsEvaluatedAtIso: asOf.toISOString(),
    metadata: {
      patternCounts,
      activeDurationDays: Math.max(
        0,
        Math.floor((Date.parse(lastSeen) - Date.parse(firstSeen)) / 86_400_000),
      ),
      silenceDays: Math.max(
        0,
        Math.floor((asOf.getTime() - Date.parse(lastSeen)) / 86_400_000),
      ),
      weakestLinkExplanation: explainWeakestLink(identifiers),
      hasConflict,
      churnSignals: assessment.signals,
    },
  });

  if (assessment.risk === "high") {
    await store.createNotification({
      type: "churn_risk_high",
      severity: "critical",
      dedupeKey: `churn_high:${customerId}`,
      title: "High churn risk detected",
      message: `${displayNameFrom(identifiers) ?? customerId} matched ${assessment.signals.length} churn rule(s): ${assessment.signals.map((s) => s.rule).join(", ")}.`,
      customerId,
      deepLink: `/customers/${customerId}`,
    });
  }

  return {
    customerId,
    patterns,
    churnRisk: assessment.risk,
    eventCount: events.length,
    channels,
  };
}

function countPatterns(patterns: DetectedPattern[]): Record<CustomerPattern, number> {
  const counts = Object.fromEntries(LIST_PATTERNS.map((p) => [p, 0])) as Record<
    CustomerPattern,
    number
  >;
  for (const pattern of patterns) {
    if (pattern.patternType !== "churn_signal") {
      counts[pattern.patternType] += 1;
    }
  }
  return counts;
}

function pick(identifiers: IdentifierRecord[], type: string): string | null {
  return identifiers.find((i) => i.type === type)?.value ?? null;
}

function displayNameFrom(identifiers: IdentifierRecord[]): string | null {
  return identifiers.find((i) => i.type === "name")?.value ?? null;
}

/** One line explaining the profile's identity confidence (SoT D-10). */
function explainWeakestLink(identifiers: IdentifierRecord[]): string {
  if (identifiers.length === 0) return "No identifiers linked to this profile yet.";
  const weakest = identifiers.reduce((min, i) =>
    i.linkConfidence < min.linkConfidence ? i : min,
  );
  if (weakest.linkMethod === "conflict") {
    return `Identity conflict: ${weakest.type} ${maskIdentifier(weakest.type, weakest.value)} is also claimed by another profile.`;
  }
  if (weakest.linkMethod === "probabilistic") {
    return `Weakest link is ${weakest.type} ${maskIdentifier(weakest.type, weakest.value)}, matched probabilistically at ${(weakest.linkConfidence * 100).toFixed(0)}%.`;
  }
  return "All identifiers matched on strong deterministic evidence.";
}
