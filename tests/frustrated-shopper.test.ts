import assert from "node:assert/strict";
import test from "node:test";

import { MemoryStore } from "../lib/pipeline/adapters/memory";
import { processEvent } from "../lib/pipeline/ingest";
import { priyaScenario, rajeshScenario, toRawEvent, type LabelledEvent } from "../lib/demo/fixtures";
import { buildJourney } from "../lib/journey/build";
import type { PipelineSuccess } from "../lib/pipeline/types";

const AS_OF = new Date("2026-09-22T04:30:00.000Z");

async function runScenario(
  store: MemoryStore,
  events: LabelledEvent[],
  skip: string[] = [],
) {
  const results = new Map<string, PipelineSuccess>();
  for (const event of events) {
    if (skip.includes(event.label)) continue;
    const result = await processEvent(store, toRawEvent(event), { asOf: AS_OF, source: "seed" });
    assert.equal(result.ok, true, `${event.label} should be accepted: ${JSON.stringify(result)}`);
    results.set(event.label, result as PipelineSuccess);
  }
  return results;
}

test("Frustrated Shopper: three channel fragments resolve to one customer", async () => {
  const store = new MemoryStore();
  const scenario = priyaScenario(AS_OF);
  const results = await runScenario(store, scenario.events);

  /* ---- One profile, 14 events, three channels ---- */
  assert.equal(store.profiles.size, 1, "all 14 events must land on one profile");
  const customerId = results.get("E1")!.customerId;
  const profile = store.profiles.get(customerId)!;
  assert.equal(store.events.length, 14);
  assert.deepEqual([...profile.channels].sort(), ["call_center", "mobile", "web"]);
  assert.equal(profile.isAnonymous, false);

  /* ---- Resolution methods match the documented expectations ---- */
  assert.equal(results.get("E1")!.method, "new_profile");
  for (const label of ["E2", "E3", "E4"]) {
    assert.equal(results.get(label)!.method, "probabilistic", `${label} is a session bridge`);
    assert.equal(results.get(label)!.confidence, 0.8, `${label} = cookie 0.30 + continuity 0.50`);
  }
  for (const label of ["E5", "E6", "E7", "E8", "E9", "E10", "E11", "E12", "E13", "E14"]) {
    assert.equal(results.get(label)!.method, "deterministic", `${label} matches on a strong ID`);
    assert.equal(results.get(label)!.confidence, 1);
  }

  /* ---- The login bridges the anonymous session to a known person ---- */
  assert.deepEqual(
    results.get("E4")!.identifiersAdded.map((i) => i.type).sort(),
    ["email", "name"],
  );
  assert.deepEqual(results.get("E7")!.identifiersAdded.map((i) => i.type), ["device_id"]);
  assert.deepEqual(results.get("E9")!.identifiersAdded.map((i) => i.type), ["phone"]);

  /* ---- Identity confidence is the weakest link (SoT D-10) ---- */
  const identifiers = store.identifiersFor(customerId);
  assert.deepEqual(
    identifiers.map((i) => i.type).sort(),
    ["cookie_id", "device_id", "email", "name", "phone"],
  );
  assert.equal(identifiers.find((i) => i.type === "cookie_id")!.linkConfidence, 1);
  assert.equal(identifiers.find((i) => i.type === "email")!.linkConfidence, 0.8);
  assert.equal(identifiers.find((i) => i.type === "phone")!.linkConfidence, 1);
  assert.equal(profile.identityConfidence, 0.8);

  /* ---- Mean resolution confidence: (0 + 0.8×3 + 1.0×10) / 14 = 0.886 ---- */
  const mean =
    store.events.reduce((sum, e) => sum + e.resolutionConfidence, 0) / store.events.length;
  assert.equal(Number(mean.toFixed(3)), 0.886);

  /* ---- Every pattern the spec calls for ---- */
  const patterns = store.patternsFor(customerId);
  const byType = (type: string) => patterns.filter((p) => p.patternType === type);

  const dropOff = byType("drop_off")[0];
  assert.ok(dropOff, "checkout drop-off");
  assert.equal(dropOff.details.reason, "card_declined");
  assert.equal(
    store.events.find((e) => e.id === dropOff.eventId)!.channel,
    "mobile",
    "the anchor is the cross-channel retry (E8), not the web checkout",
  );

  const escalation = byType("escalation");
  assert.equal(escalation.length, 1, "one escalation: mobile → call center");
  assert.equal(escalation[0].details.source, "mobile");
  assert.equal(escalation[0].details.destination, "call_center");

  const repeat = byType("repeat_contact")[0];
  assert.ok(repeat, "repeat contact");
  assert.equal(repeat.details.contactCount, 2, "E9+E10 collapse into one; E12 is the second");

  const unresolved = byType("unresolved_issue")[0];
  assert.ok(unresolved, "unresolved issue");
  assert.equal(unresolved.details.ticketId, "TKT-8891");

  /* ---- Churn: HIGH via R2 + R3 + R4, but not R1 (only two contacts) ---- */
  assert.equal(profile.churnRisk, "high");
  const churn = byType("churn_signal")[0];
  const rules = churn.details.rules as string[];
  assert.ok(rules.includes("R2_escalation_then_silence"));
  assert.ok(rules.includes("R3_dropoff_no_purchase"));
  assert.ok(rules.includes("R4_open_unresolved_issue"));
  assert.ok(!rules.includes("R1_repeated_contacts"), "only two contacts, so R1 must not fire");

  /* ---- A critical notification, with no raw identifiers in it ---- */
  const notification = store.notifications.find((n) => n.type === "churn_risk_high");
  assert.ok(notification);
  assert.equal(notification!.severity, "critical");
  assert.ok(!notification!.message.includes("priya.sharma@example.com"));

  /* ---- Every event carries an audit record ---- */
  assert.equal(store.resolutionLogs.length, 14);
  for (const log of store.resolutionLogs) {
    assert.ok(log.result.evidence.length > 0, "every decision must be explainable");
  }

  /* ---- The stitched journey reads chronologically across channels ---- */
  const journey = buildJourney(
    await store.findProfileEvents(customerId),
    patterns,
    store.resolutionLogs.map((l) => ({ eventId: l.eventId, result: l.result })),
    AS_OF,
  );
  assert.deepEqual(
    journey.map((e) => e.channel),
    [
      "web", "web", "web", "web", "web", "web",
      "mobile", "mobile",
      "call_center", "call_center", "call_center", "call_center", "call_center",
      "web",
    ],
  );
  // web → mobile → call centre → web
  assert.equal(journey.filter((e) => e.isTransition).length, 3);
  assert.ok(
    journey.some((e) => e.patterns.some((p) => p.type === "escalation" && p.role === "anchor")),
    "the escalation must be pinned to an event in the timeline",
  );
});

test("a late-arriving event is stitched into place and creates the repeat contact", async () => {
  const store = new MemoryStore();
  const scenario = priyaScenario(AS_OF);

  // The seed deliberately withholds E12 (SoT §7.6) — before it arrives there
  // is only one contact episode, so no repeat-contact pattern.
  const results = await runScenario(store, scenario.events, scenario.deferredLabels);
  const customerId = results.get("E1")!.customerId;
  assert.equal(store.patternsFor(customerId).filter((p) => p.patternType === "repeat_contact").length, 0);

  const late = scenario.events.find((e) => e.label === "E12")!;
  const replay = await processEvent(store, toRawEvent(late), { asOf: AS_OF, source: "api" });
  assert.equal(replay.ok, true);
  const success = replay as PipelineSuccess;

  assert.equal(success.customerId, customerId, "resolved by phone onto the same profile");
  assert.equal(success.method, "deterministic");
  assert.ok(
    success.patterns.some((p) => p.patternType === "repeat_contact"),
    "the ingestion response reports the new repeat contact",
  );

  // Chronology, not arrival order, decides position in the timeline.
  const events = await store.findProfileEvents(customerId);
  const index = events.findIndex((e) => e.id === success.eventId);
  assert.equal(index, 11, "E12 sits between E11 and E13, not at the end");

  // Replaying it again is a no-op.
  const again = await processEvent(store, toRawEvent(late), { asOf: AS_OF, source: "api" });
  assert.equal(again.ok && again.duplicate, true);
  assert.equal((await store.findProfileEvents(customerId)).length, 14);
});

test("Support Loop, resolved: the contrast customer carries no churn risk", async () => {
  const store = new MemoryStore();
  const scenario = rajeshScenario(AS_OF);
  const results = await runScenario(store, scenario.events);

  assert.equal(store.profiles.size, 1);
  const customerId = results.get("R1")!.customerId;
  const profile = store.profiles.get(customerId)!;
  const patterns = store.patternsFor(customerId);

  assert.deepEqual([...profile.channels].sort(), ["chat", "email", "in_store", "web"]);
  assert.deepEqual(
    results.get("R4")!.identifiersAdded.map((i) => i.type).sort(),
    ["loyalty_id", "phone"],
  );

  assert.equal(
    patterns.filter((p) => p.patternType === "unresolved_issue").length,
    0,
    "the ticket was resolved in under 7 days",
  );
  assert.equal(patterns.filter((p) => p.patternType === "repeat_contact").length, 1);
  assert.equal(profile.churnRisk, "none", "he escalated, but it was resolved and he bought again");
});

test("the pipeline records one ingestion-log row per attempt", async () => {
  const store = new MemoryStore();
  const scenario = priyaScenario(AS_OF);
  await runScenario(store, scenario.events);

  await processEvent(store, { channel: "web" }, { asOf: AS_OF });
  await processEvent(store, toRawEvent(scenario.events[0]), { asOf: AS_OF });

  assert.equal(store.ingestionLogs.length, 16);
  assert.equal(store.ingestionLogs.filter((l) => l.outcome === "accepted").length, 14);
  assert.equal(store.ingestionLogs.filter((l) => l.outcome === "rejected").length, 1);
  assert.equal(store.ingestionLogs.filter((l) => l.outcome === "duplicate").length, 1);
  for (const log of store.ingestionLogs) {
    assert.ok(typeof log.latencyMs === "number");
  }
});
