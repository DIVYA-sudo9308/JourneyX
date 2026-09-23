import assert from "node:assert/strict";
import test from "node:test";

import { MemoryStore } from "../lib/pipeline/adapters/memory";
import { processEvent } from "../lib/pipeline/ingest";
import { assessChurn, detectPatterns } from "../lib/patterns/detect";
import type { StoredEventRecord } from "../lib/pipeline/types";
import type { Channel } from "../lib/types/domain";
import { categoryFor } from "../lib/pipeline/taxonomy";

const AS_OF = new Date("2026-09-22T04:30:00.000Z");

let seq = 0;
function ev(
  eventType: string,
  channel: Channel,
  timestampIso: string,
  metadata: Record<string, unknown> = {},
): StoredEventRecord {
  seq += 1;
  return {
    id: `e${seq}`,
    customerId: "c1",
    channel,
    eventType,
    eventCategory: categoryFor(eventType),
    timestampIso,
    metadata,
    identifiers: {},
    resolutionMethod: "deterministic",
    resolutionConfidence: 1,
  };
}

/* ------------------------------------------------------------------ *
 * Drop-off
 * ------------------------------------------------------------------ */

test("checkout_start with no purchase within 2 hours is a drop-off", () => {
  const events = [
    ev("checkout_start", "web", "2026-09-10T10:00:00Z", { cart_value: 4999 }),
    ev("payment_attempt", "web", "2026-09-10T10:05:00Z", { error_code: "card_declined" }),
  ];
  const patterns = detectPatterns(events, AS_OF);
  const dropOff = patterns.find((p) => p.patternType === "drop_off");

  assert.ok(dropOff, "a drop-off must be detected");
  assert.equal(dropOff!.details.reason, "card_declined");
  assert.equal(dropOff!.details.process, "checkout");
});

test("a completed purchase inside the window is not a drop-off", () => {
  const events = [
    ev("checkout_start", "web", "2026-09-10T10:00:00Z"),
    ev("purchase_complete", "web", "2026-09-10T10:30:00Z"),
  ];
  assert.equal(detectPatterns(events, AS_OF).filter((p) => p.patternType === "drop_off").length, 0);
});

test("a checkout still inside its 2-hour window is not yet a drop-off", () => {
  const events = [ev("checkout_start", "web", "2026-09-22T04:00:00Z")];
  assert.equal(detectPatterns(events, AS_OF).length, 0);
  // The same events, evaluated a day later, do produce the finding.
  const later = detectPatterns(events, new Date("2026-09-23T04:30:00Z"));
  assert.equal(later.filter((p) => p.patternType === "drop_off").length, 1);
});

test("checkout retries inside one window produce a single drop-off", () => {
  const events = [
    ev("checkout_start", "web", "2026-09-10T10:00:00Z"),
    ev("checkout_start", "web", "2026-09-10T10:30:00Z"),
    ev("checkout_start", "web", "2026-09-10T11:15:00Z"),
  ];
  assert.equal(detectPatterns(events, AS_OF).filter((p) => p.patternType === "drop_off").length, 1);
});

/* ------------------------------------------------------------------ *
 * Escalation
 * ------------------------------------------------------------------ */

test("web activity followed by a support call is an escalation", () => {
  const events = [
    ev("payment_attempt", "web", "2026-09-10T10:00:00Z", { error_code: "card_declined" }),
    ev("call_started", "call_center", "2026-09-10T12:00:00Z"),
  ];
  const escalation = detectPatterns(events, AS_OF).find((p) => p.patternType === "escalation");

  assert.ok(escalation);
  assert.equal(escalation!.details.source, "web");
  assert.equal(escalation!.details.destination, "call_center");
});

test("a contact with no lower-tier activity in the previous 48 hours is not an escalation", () => {
  const events = [ev("call_started", "call_center", "2026-09-10T12:00:00Z")];
  assert.equal(detectPatterns(events, AS_OF).filter((p) => p.patternType === "escalation").length, 0);
});

/* ------------------------------------------------------------------ *
 * Repeat contact
 * ------------------------------------------------------------------ */

test("two contacts within 7 days are a repeat contact; contacts 30 minutes apart are one", () => {
  const collapsed = detectPatterns(
    [
      ev("call_started", "call_center", "2026-09-10T12:00:00Z"),
      ev("ticket_created", "call_center", "2026-09-10T12:09:00Z"),
    ],
    AS_OF,
  );
  assert.equal(
    collapsed.filter((p) => p.patternType === "repeat_contact").length,
    0,
    "contacts inside 30 minutes are one conversation",
  );

  const repeated = detectPatterns(
    [
      ev("call_started", "call_center", "2026-09-10T12:00:00Z"),
      ev("ticket_created", "call_center", "2026-09-10T12:09:00Z"),
      ev("call_started", "call_center", "2026-09-13T12:00:00Z"),
    ],
    AS_OF,
  );
  const repeat = repeated.find((p) => p.patternType === "repeat_contact");
  assert.ok(repeat);
  assert.equal(repeat!.details.contactCount, 2);
});

/* ------------------------------------------------------------------ *
 * Unresolved issue
 * ------------------------------------------------------------------ */

test("a ticket open past 7 days is unresolved; a resolved ticket is not", () => {
  const open = detectPatterns(
    [ev("ticket_created", "call_center", "2026-09-01T10:00:00Z", { ticket_id: "T-1" })],
    AS_OF,
  );
  assert.equal(open.filter((p) => p.patternType === "unresolved_issue").length, 1);

  const resolved = detectPatterns(
    [
      ev("ticket_created", "call_center", "2026-09-01T10:00:00Z", { ticket_id: "T-2" }),
      ev("ticket_resolved", "email", "2026-09-03T10:00:00Z", { ticket_id: "T-2" }),
    ],
    AS_OF,
  );
  assert.equal(resolved.filter((p) => p.patternType === "unresolved_issue").length, 0);
});

test("a resolution for a different ticket does not close an open one", () => {
  const events = [
    ev("ticket_created", "call_center", "2026-09-01T10:00:00Z", { ticket_id: "T-3" }),
    ev("ticket_resolved", "email", "2026-09-03T10:00:00Z", { ticket_id: "T-OTHER" }),
  ];
  assert.equal(detectPatterns(events, AS_OF).filter((p) => p.patternType === "unresolved_issue").length, 1);
});

/* ------------------------------------------------------------------ *
 * Churn
 * ------------------------------------------------------------------ */

test("three contacts within 30 days is high churn risk (R1)", () => {
  const events = [
    ev("call_started", "call_center", "2026-09-01T10:00:00Z"),
    ev("call_started", "call_center", "2026-09-05T10:00:00Z"),
    ev("call_started", "call_center", "2026-09-09T10:00:00Z"),
  ];
  const assessment = assessChurn(events, detectPatterns(events, AS_OF), AS_OF);
  assert.equal(assessment.risk, "high");
  assert.ok(assessment.signals.some((s) => s.rule === "R1_repeated_contacts"));
});

test("a healthy, recently active customer has no churn risk", () => {
  const events = [
    ev("product_view", "web", "2026-09-20T10:00:00Z"),
    ev("purchase_complete", "web", "2026-09-21T10:00:00Z"),
  ];
  const assessment = assessChurn(events, detectPatterns(events, AS_OF), AS_OF);
  assert.equal(assessment.risk, "none");
  assert.equal(assessment.signals.length, 0);
});

test("churn signals name the rules that fired, with evidence", () => {
  const events = [
    ev("checkout_start", "web", "2026-09-01T10:00:00Z"),
    ev("payment_attempt", "web", "2026-09-01T10:05:00Z", { error_code: "card_declined" }),
    ev("ticket_created", "call_center", "2026-09-01T12:00:00Z", { ticket_id: "T-9" }),
  ];
  const patterns = detectPatterns(events, AS_OF);
  const assessment = assessChurn(events, patterns, AS_OF);

  assert.equal(assessment.risk, "high");
  const rules = assessment.signals.map((s) => s.rule);
  assert.ok(rules.includes("R2_escalation_then_silence"));
  assert.ok(rules.includes("R3_dropoff_no_purchase"));
  assert.ok(rules.includes("R4_open_unresolved_issue"));
  for (const signal of assessment.signals) {
    assert.ok(signal.evidence.length > 0, `${signal.rule} must carry evidence`);
  }
});

/* ------------------------------------------------------------------ *
 * Reconciliation through the real pipeline
 * ------------------------------------------------------------------ */

test("a late purchase retracts a drop-off instead of leaving it stale", async () => {
  const store = new MemoryStore();
  const base = {
    channel: "web" as const,
    identifiers: { email: "retract@example.com" },
  };
  const start = await processEvent(
    store,
    { ...base, event_id: "r-1", event_type: "checkout_start", timestamp: "2026-09-10T10:00:00Z" },
    { asOf: AS_OF, source: "test" },
  );
  assert.equal(start.ok, true);
  const customerId = start.ok === true ? start.customerId : "";
  assert.equal(
    store.patternsFor(customerId).filter((p) => p.patternType === "drop_off").length,
    1,
  );

  await processEvent(
    store,
    { ...base, event_id: "r-2", event_type: "purchase_complete", timestamp: "2026-09-10T11:00:00Z" },
    { asOf: AS_OF, source: "test" },
  );
  assert.equal(
    store.patternsFor(customerId).filter((p) => p.patternType === "drop_off").length,
    0,
    "the drop-off must be withdrawn once the purchase lands inside the window",
  );
});
