import {
  CHANNEL_TIER,
  CONTACT_START_TYPES,
  ISSUE_TYPES,
  RESOLUTION_TYPES,
} from "@/lib/pipeline/taxonomy";
import type {
  ChurnAssessment,
  DetectedPattern,
  StoredEventRecord,
} from "@/lib/pipeline/types";
import { CHANNEL_LABEL, type Channel } from "@/lib/types/domain";

/** Detection windows — SoT §4.8, verbatim. */
export const WINDOWS = {
  checkoutMs: 2 * 60 * 60 * 1000,
  onboardingMs: 7 * 24 * 60 * 60 * 1000,
  escalationMs: 48 * 60 * 60 * 1000,
  /** Contacts closer than this are one conversation, not two. */
  contactCollapseMs: 30 * 60 * 1000,
  repeatContactMs: 7 * 24 * 60 * 60 * 1000,
  unresolvedMs: 7 * 24 * 60 * 60 * 1000,
  churnContactWindowMs: 30 * 24 * 60 * 60 * 1000,
  churnEscalationWindowMs: 30 * 24 * 60 * 60 * 1000,
  churnSilenceAfterEscalationMs: 14 * 24 * 60 * 60 * 1000,
  churnSilenceAfterDropOffMs: 7 * 24 * 60 * 60 * 1000,
} as const;

/** Minimum contacts in a cluster before it counts as a repeat contact. */
const REPEAT_CONTACT_MIN = 2;
/** Collapsed contacts within 30 days that make churn risk high (rule R1). */
const CHURN_CONTACT_THRESHOLD = 3;

type Ev = StoredEventRecord;

function ts(event: Ev): number {
  return Date.parse(event.timestampIso);
}

function chronological(events: Ev[]): Ev[] {
  return [...events].sort((a, b) => {
    const delta = ts(a) - ts(b);
    return delta !== 0 ? delta : a.id < b.id ? -1 : 1;
  });
}

function reasonFor(event: Ev): string {
  const meta = event.metadata ?? {};
  const raw = meta.error_code ?? meta.reason ?? meta.failure_reason;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "unknown";
}

/**
 * Runs every detector over one customer's events. Pure: `(events, asOf)` in,
 * findings out — no clock reads, no database, no I/O. `asOf` decides which
 * windows have closed, so re-evaluating the same events on a later day can
 * legitimately produce new findings (SoT D-23).
 */
export function detectPatterns(events: Ev[], asOf: Date): DetectedPattern[] {
  const sorted = chronological(events);
  return [
    ...detectCheckoutDropOff(sorted, asOf),
    ...detectOnboardingDropOff(sorted, asOf),
    ...detectEscalations(sorted),
    ...detectRepeatContacts(sorted, asOf),
    ...detectUnresolvedIssues(sorted, asOf),
  ];
}

/* ------------------------------------------------------------------ *
 * Checkout drop-off
 * ------------------------------------------------------------------ */

/**
 * `checkout_start` with no `purchase_complete` on any channel within 2 h.
 * Retries inside an open window extend the same window instead of opening a
 * new one, and the finding only appears once `asOf` has passed the window's
 * close — before that the customer may still be checking out.
 */
export function detectCheckoutDropOff(events: Ev[], asOf: Date): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  const starts = events.filter((e) => e.eventType === "checkout_start");
  const purchases = events.filter((e) => e.eventType === "purchase_complete");

  let windowEnd = -Infinity;
  for (const start of starts) {
    const startTime = ts(start);
    if (startTime <= windowEnd) continue; // retry inside an open window
    const closesAt = startTime + WINDOWS.checkoutMs;
    windowEnd = closesAt;

    if (asOf.getTime() < closesAt) continue; // window still open
    const completed = purchases.some((p) => {
      const t = ts(p);
      return t >= startTime && t <= closesAt;
    });
    if (completed) continue;

    const inWindow = events.filter((e) => {
      const t = ts(e);
      return t >= startTime && t <= closesAt && e.eventCategory === "commerce";
    });
    const anchor = inWindow.at(-1) ?? start;

    out.push({
      patternType: "drop_off",
      patternKey: `drop_off:checkout:${start.id}`,
      eventId: anchor.id,
      relatedEventIds: inWindow.map((e) => e.id),
      confidence: 0.95,
      detectedAtIso: new Date(closesAt).toISOString(),
      severity: "medium",
      description: `Started checkout on ${CHANNEL_LABEL[start.channel]} but did not complete the purchase within 2 hours.`,
      details: {
        process: "checkout",
        channel: anchor.channel,
        eventType: anchor.eventType,
        reason: reasonFor(anchor),
        startEventId: start.id,
        windowHours: 2,
      },
    });
  }
  return out;
}

/** `signup` with no non-account activity within 7 days (SoT §4.8, SHOULD). */
export function detectOnboardingDropOff(events: Ev[], asOf: Date): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  for (const signup of events.filter((e) => e.eventType === "signup")) {
    const startTime = ts(signup);
    const closesAt = startTime + WINDOWS.onboardingMs;
    if (asOf.getTime() < closesAt) continue;
    const engaged = events.some((e) => {
      const t = ts(e);
      return t > startTime && t <= closesAt && e.eventCategory !== "account";
    });
    if (engaged) continue;

    out.push({
      patternType: "drop_off",
      patternKey: `drop_off:onboarding:${signup.id}`,
      eventId: signup.id,
      relatedEventIds: [],
      confidence: 0.9,
      detectedAtIso: new Date(closesAt).toISOString(),
      severity: "low",
      description: `Signed up on ${CHANNEL_LABEL[signup.channel]} but took no further action within 7 days.`,
      details: {
        process: "onboarding",
        channel: signup.channel,
        eventType: signup.eventType,
        reason: "no_activity_after_signup",
        windowDays: 7,
      },
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Escalation
 * ------------------------------------------------------------------ */

/**
 * An assisted contact at tier T preceded, within 48 h, by activity on a
 * lower-tier channel — the customer moved from self-serve to human support, or
 * from chat to a phone call. One finding per 48 h episode per destination.
 */
export function detectEscalations(events: Ev[]): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  let lastEscalationAt = -Infinity;

  for (const dest of events) {
    if (!CONTACT_START_TYPES.has(dest.eventType)) continue;
    const destTier = CHANNEL_TIER[dest.channel] ?? 0;
    const destTime = ts(dest);
    if (destTime - lastEscalationAt < WINDOWS.escalationMs) continue;

    const lowerTier = events.filter((e) => {
      const t = ts(e);
      return (
        t < destTime &&
        destTime - t <= WINDOWS.escalationMs &&
        (CHANNEL_TIER[e.channel] ?? 0) < destTier
      );
    });
    const source = lowerTier.at(-1);
    if (!source) continue;

    lastEscalationAt = destTime;
    out.push({
      patternType: "escalation",
      patternKey: `escalation:${dest.id}`,
      eventId: dest.id,
      relatedEventIds: [source.id],
      confidence: 0.92,
      detectedAtIso: dest.timestampIso,
      severity: "high",
      description: `Escalated from ${CHANNEL_LABEL[source.channel]} to ${CHANNEL_LABEL[dest.channel]} within ${Math.round((destTime - ts(source)) / 3_600_000)} hours.`,
      details: {
        source: source.channel,
        destination: dest.channel,
        channel: dest.channel,
        eventType: dest.eventType,
        reason: reasonFor(dest),
        sourceEventId: source.id,
        hoursBetween: Math.round((destTime - ts(source)) / 3_600_000),
      },
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Repeat contact
 * ------------------------------------------------------------------ */

/** Groups contact-start events, collapsing anything within 30 min into one. */
export function collapseContacts(events: Ev[]): Ev[][] {
  const contacts = events.filter((e) => CONTACT_START_TYPES.has(e.eventType));
  const clusters: Ev[][] = [];
  for (const contact of contacts) {
    const current = clusters.at(-1);
    if (current && ts(contact) - ts(current.at(-1)!) <= WINDOWS.contactCollapseMs) {
      current.push(contact);
    } else {
      clusters.push([contact]);
    }
  }
  return clusters;
}

/**
 * Two or more distinct contacts within 7 days of the first: the customer had
 * to come back. Each qualifying cluster is keyed on its first contact, so the
 * finding is stable as later contacts arrive.
 */
export function detectRepeatContacts(events: Ev[], asOf: Date): DetectedPattern[] {
  const collapsed = collapseContacts(events).map((cluster) => cluster[0]);
  const out: DetectedPattern[] = [];
  const consumed = new Set<string>();

  for (let i = 0; i < collapsed.length; i += 1) {
    const first = collapsed[i];
    if (consumed.has(first.id)) continue;
    const windowEnd = ts(first) + WINDOWS.repeatContactMs;
    const group = [first];
    for (let j = i + 1; j < collapsed.length; j += 1) {
      if (ts(collapsed[j]) > windowEnd) break;
      group.push(collapsed[j]);
    }
    if (group.length < REPEAT_CONTACT_MIN) continue;
    for (const member of group) consumed.add(member.id);

    const last = group.at(-1)!;
    out.push({
      patternType: "repeat_contact",
      patternKey: `repeat:${first.id}`,
      eventId: last.id,
      relatedEventIds: group.map((e) => e.id),
      confidence: 0.93,
      detectedAtIso: new Date(Math.min(ts(last), asOf.getTime())).toISOString(),
      severity: group.length >= CHURN_CONTACT_THRESHOLD ? "high" : "medium",
      description: `Contacted support ${group.length} times within ${Math.max(1, Math.round((ts(last) - ts(first)) / 86_400_000))} day(s).`,
      details: {
        contactCount: group.length,
        channel: last.channel,
        eventType: last.eventType,
        reason: reasonFor(last),
        channels: [...new Set(group.map((e) => e.channel))],
        firstContactId: first.id,
      },
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Unresolved issue
 * ------------------------------------------------------------------ */

/**
 * A ticket or complaint with no matching resolution within 7 days that is
 * *still* open at `asOf`. When the producer supplies `ticket_id`, resolution
 * is matched on that ticket; otherwise any resolution event closes the issue.
 */
export function detectUnresolvedIssues(events: Ev[], asOf: Date): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  const resolutions = events.filter((e) => RESOLUTION_TYPES.has(e.eventType));

  for (const issue of events.filter((e) => ISSUE_TYPES.has(e.eventType))) {
    const issueTime = ts(issue);
    const ticketId = typeof issue.metadata?.ticket_id === "string" ? issue.metadata.ticket_id : null;
    const resolved = resolutions.find((r) => {
      if (ts(r) < issueTime) return false;
      if (!ticketId) return true;
      return r.metadata?.ticket_id === ticketId;
    });
    if (resolved) continue;

    const closesAt = issueTime + WINDOWS.unresolvedMs;
    if (asOf.getTime() < closesAt) continue;

    const daysOpen = Math.floor((asOf.getTime() - issueTime) / 86_400_000);
    out.push({
      patternType: "unresolved_issue",
      patternKey: `unresolved:${issue.id}`,
      eventId: issue.id,
      relatedEventIds: [],
      confidence: 0.9,
      detectedAtIso: new Date(closesAt).toISOString(),
      severity: "high",
      description: `${ticketId ? `Ticket ${ticketId}` : "Issue"} raised on ${CHANNEL_LABEL[issue.channel]} is still open after ${daysOpen} days.`,
      details: {
        channel: issue.channel,
        eventType: issue.eventType,
        reason: reasonFor(issue),
        ticketId,
        daysOpen,
      },
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Churn risk
 * ------------------------------------------------------------------ */

/**
 * Rule-based, explainable churn scoring (SoT §4.8 R1–R4). Deliberately not a
 * model: every risk level traces back to named rules and the events behind
 * them, which is what the analyst is shown.
 */
export function assessChurn(
  events: Ev[],
  patterns: DetectedPattern[],
  asOf: Date,
): ChurnAssessment {
  const sorted = chronological(events);
  const signals: ChurnAssessment["signals"] = [];
  if (sorted.length === 0) return { risk: "none", signals };

  const lastSeen = ts(sorted.at(-1)!);
  const silenceMs = asOf.getTime() - lastSeen;
  const silenceDays = Math.floor(silenceMs / 86_400_000);

  /* R1 — 3+ collapsed contacts in any rolling 30 days. */
  const contacts = collapseContacts(sorted).map((c) => c[0]);
  for (let i = 0; i < contacts.length; i += 1) {
    const windowEnd = ts(contacts[i]) + WINDOWS.churnContactWindowMs;
    const count = contacts.filter(
      (c) => ts(c) >= ts(contacts[i]) && ts(c) <= windowEnd,
    ).length;
    if (count >= CHURN_CONTACT_THRESHOLD) {
      signals.push({
        rule: "R1_repeated_contacts",
        severity: "high",
        evidence: `${count} separate support contacts within 30 days.`,
      });
      break;
    }
  }

  /* R2 — an escalation shortly before the customer went quiet. */
  const escalations = patterns.filter((p) => p.patternType === "escalation");
  const recentEscalation = escalations.find(
    (p) =>
      lastSeen - Date.parse(p.detectedAtIso) <= WINDOWS.churnEscalationWindowMs &&
      Date.parse(p.detectedAtIso) <= lastSeen,
  );
  if (recentEscalation && silenceMs >= WINDOWS.churnSilenceAfterEscalationMs) {
    signals.push({
      rule: "R2_escalation_then_silence",
      severity: "high",
      evidence: `Escalated to support, then no activity for ${silenceDays} days.`,
    });
  }

  /* R3 — abandoned checkout and never came back to buy. */
  const dropOffs = patterns.filter(
    (p) => p.patternType === "drop_off" && p.details.process === "checkout",
  );
  const lastPurchase = sorted.filter((e) => e.eventType === "purchase_complete").at(-1);
  const unrecoveredDropOff = dropOffs.find(
    (p) => !lastPurchase || ts(lastPurchase) < Date.parse(p.detectedAtIso),
  );
  if (unrecoveredDropOff && silenceMs >= WINDOWS.churnSilenceAfterDropOffMs) {
    signals.push({
      rule: "R3_dropoff_no_purchase",
      severity: "medium",
      evidence: `Abandoned checkout with no purchase since, quiet for ${silenceDays} days.`,
    });
  }

  /* R4 — an issue the business never closed. */
  if (patterns.some((p) => p.patternType === "unresolved_issue")) {
    signals.push({
      rule: "R4_open_unresolved_issue",
      severity: "medium",
      evidence: "An issue raised by this customer is still unresolved.",
    });
  }

  const risk = signals.some((s) => s.severity === "high")
    ? "high"
    : signals.length > 0
      ? "medium"
      : "none";

  return {
    risk,
    signals: [...signals].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1)),
  };
}

/** Wraps a churn assessment as a storable `churn_signal` pattern. */
export function churnPattern(
  customerId: string,
  assessment: ChurnAssessment,
  asOf: Date,
): DetectedPattern | null {
  if (assessment.risk === "none") return null;
  return {
    patternType: "churn_signal",
    patternKey: `churn:${customerId}`,
    eventId: null,
    relatedEventIds: [],
    confidence: assessment.risk === "high" ? 0.85 : 0.65,
    detectedAtIso: asOf.toISOString(),
    severity: assessment.risk === "high" ? "high" : "medium",
    description: assessment.signals.map((s) => s.evidence).join(" "),
    details: {
      risk: assessment.risk,
      rules: assessment.signals.map((s) => s.rule),
      signals: assessment.signals,
    },
  };
}

/** Channels a customer has been seen on, in canonical order. */
export function channelsUsed(events: Ev[]): Channel[] {
  const seen = new Set(events.map((e) => e.channel));
  return [...seen];
}
