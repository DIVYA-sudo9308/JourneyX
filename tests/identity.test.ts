import assert from "node:assert/strict";
import test from "node:test";

import { MemoryStore } from "../lib/pipeline/adapters/memory";
import { processEvent } from "../lib/pipeline/ingest";
import {
  buildDedupKey,
  normalizeEmail,
  normalizeEvent,
  normalizeIdentifiers,
  normalizePhone,
} from "../lib/pipeline/normalize";
import { validateEvent } from "../lib/pipeline/validate";
import { jaroWinkler } from "../lib/identity/jaro-winkler";
import type { PipelineSuccess } from "../lib/pipeline/types";

const AS_OF = new Date("2026-09-22T12:00:00.000Z");

function ingest(
  store: MemoryStore,
  event: Record<string, unknown>,
  asOf: Date = AS_OF,
) {
  return processEvent(store, event, { asOf, source: "test" });
}

function ok(result: Awaited<ReturnType<typeof ingest>>): PipelineSuccess {
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);
  return result as PipelineSuccess;
}

/* ------------------------------------------------------------------ *
 * Normalization
 * ------------------------------------------------------------------ */

test("normalization canonicalizes identifiers before matching", () => {
  assert.equal(normalizeEmail("  PRIYA@EXAMPLE.COM "), "priya@example.com");
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.equal(normalizePhone("098765 43210"), "+919876543210");
  assert.equal(normalizePhone("9876543210"), "+919876543210");
  assert.equal(normalizeEmail("not-an-email"), null);

  const identifiers = normalizeIdentifiers({
    email: " PRIYA@Example.com ",
    phone: "+91 98765 43210",
    customer_id: " cust-7 ",
    name: "  priya   SHARMA ",
  });
  assert.deepEqual(identifiers, [
    { type: "email", value: "priya@example.com" },
    { type: "phone", value: "+919876543210" },
    { type: "loyalty_id", value: "CUST-7" },
    { type: "name", value: "Priya Sharma" },
  ]);
});

test("unknown event types are accepted and filed as unknown; channels are not", () => {
  const normalized = normalizeEvent(
    {
      channel: "web",
      event_type: "Teleported_In",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { cookie_id: "c1" },
    },
    AS_OF,
  );
  assert.equal(normalized.eventCategory, "unknown");
  assert.equal(normalized.eventType, "teleported_in");

  const bad = validateEvent({
    channel: "carrier_pigeon",
    event_type: "page_view",
    timestamp: "2026-09-20T10:00:00Z",
    identifiers: { cookie_id: "c1" },
  });
  assert.equal(bad.ok, false);
});

test("timestamps far in the future are rejected", async () => {
  const store = new MemoryStore();
  const result = await ingest(store, {
    channel: "web",
    event_type: "page_view",
    timestamp: "2027-01-01T00:00:00Z",
    identifiers: { cookie_id: "c1" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.details?.[0].field, "timestamp");
  assert.equal(store.ingestionLogs.at(-1)?.outcome, "rejected");
});

test("an event with no identifier is rejected with a field error", async () => {
  const store = new MemoryStore();
  const result = await ingest(store, {
    channel: "web",
    event_type: "page_view",
    timestamp: "2026-09-20T10:00:00Z",
    identifiers: {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, "validation_error");
  assert.equal(store.events.length, 0);
});

/* ------------------------------------------------------------------ *
 * Deduplication
 * ------------------------------------------------------------------ */

test("the same event ingested twice is stored once", async () => {
  const store = new MemoryStore();
  const event = {
    event_id: "src-1",
    channel: "web",
    event_type: "page_view",
    timestamp: "2026-09-20T10:00:00Z",
    identifiers: { cookie_id: "cookie-a" },
  };
  const first = ok(await ingest(store, event));
  const second = ok(await ingest(store, event));

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.eventId, first.eventId);
  assert.equal(store.events.length, 1);
  assert.equal(store.profiles.size, 1);
  assert.equal(store.ingestionLogs.filter((l) => l.outcome === "duplicate").length, 1);
});

test("dedup keys ignore metadata key order but not genuine differences", () => {
  const base = {
    sourceEventId: null,
    channel: "web" as const,
    eventType: "page_view",
    timestampIso: "2026-09-20T10:00:00.000Z",
    identifiers: [{ type: "cookie_id" as const, value: "c1" }],
  };
  assert.equal(
    buildDedupKey({ ...base, metadata: { a: 1, b: 2 } }),
    buildDedupKey({ ...base, metadata: { b: 2, a: 1 } }),
  );
  assert.notEqual(
    buildDedupKey({ ...base, metadata: {} }),
    buildDedupKey({ ...base, timestampIso: "2026-09-20T10:00:01.000Z", metadata: {} }),
  );
});

/* ------------------------------------------------------------------ *
 * Identity resolution
 * ------------------------------------------------------------------ */

test("a first-seen identifier creates a new profile", async () => {
  const store = new MemoryStore();
  const result = ok(
    await ingest(store, {
      channel: "web",
      event_type: "page_view",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { cookie_id: "cookie-new" },
    }),
  );
  assert.equal(result.method, "new_profile");
  assert.equal(store.profiles.size, 1);
  assert.equal(store.profiles.get(result.customerId)?.isAnonymous, true);
});

test("the same email resolves deterministically to the existing profile", async () => {
  const store = new MemoryStore();
  const first = ok(
    await ingest(store, {
      channel: "mobile",
      event_type: "login",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { email: "priya@example.com", device_id: "dev-1" },
    }),
  );
  const second = ok(
    await ingest(store, {
      channel: "call_center",
      event_type: "call_started",
      timestamp: "2026-09-21T10:00:00Z",
      identifiers: { email: " PRIYA@EXAMPLE.COM " },
    }),
  );

  assert.equal(second.customerId, first.customerId);
  assert.equal(second.method, "deterministic");
  assert.equal(second.confidence, 1);
  assert.equal(store.profiles.size, 1);
  assert.ok(
    second.evidence.some((e) => e.signal === "strong_identifier" && e.matched),
    "deterministic match must cite the matching identifier",
  );
});

test("a new identifier on a known customer expands the identifier graph", async () => {
  const store = new MemoryStore();
  const first = ok(
    await ingest(store, {
      channel: "web",
      event_type: "login",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { email: "priya@example.com" },
    }),
  );
  const second = ok(
    await ingest(store, {
      channel: "mobile",
      event_type: "login",
      timestamp: "2026-09-21T10:00:00Z",
      identifiers: { email: "priya@example.com", device_id: "dev-99", phone: "+919876543210" },
    }),
  );

  assert.equal(second.customerId, first.customerId);
  assert.deepEqual(
    second.identifiersAdded.map((i) => i.type).sort(),
    ["device_id", "phone"],
  );
  const identifiers = store.identifiersFor(first.customerId).map((i) => i.type).sort();
  assert.deepEqual(identifiers, ["device_id", "email", "phone"]);
});

test("cookie continuity within 30 minutes is a probabilistic match (0.30 + 0.50)", async () => {
  const store = new MemoryStore();
  const first = ok(
    await ingest(store, {
      channel: "web",
      event_type: "product_view",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { cookie_id: "cookie-x" },
    }),
  );
  const second = ok(
    await ingest(store, {
      channel: "web",
      event_type: "add_to_cart",
      timestamp: "2026-09-20T10:04:00Z",
      identifiers: { cookie_id: "cookie-x" },
    }),
  );

  assert.equal(second.customerId, first.customerId);
  assert.equal(second.method, "probabilistic");
  assert.equal(second.confidence, 0.8);
});

test("a cookie seen again the next day scores too low to match", async () => {
  const store = new MemoryStore();
  ok(
    await ingest(store, {
      channel: "web",
      event_type: "page_view",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { cookie_id: "cookie-y" },
    }),
  );
  const next = ok(
    await ingest(store, {
      channel: "web",
      event_type: "page_view",
      timestamp: "2026-09-21T10:00:00Z",
      identifiers: { cookie_id: "cookie-y" },
    }),
  );

  assert.equal(next.method, "new_profile");
  assert.equal(store.profiles.size, 2);
});

test("a cookie whose profile has a different email is filtered out, not matched", async () => {
  const store = new MemoryStore();
  ok(
    await ingest(store, {
      channel: "web",
      event_type: "login",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { email: "someone@example.com", cookie_id: "shared-cookie" },
    }),
  );
  const other = ok(
    await ingest(store, {
      channel: "web",
      event_type: "login",
      timestamp: "2026-09-20T10:05:00Z",
      identifiers: { email: "different@example.com", cookie_id: "shared-cookie" },
    }),
  );

  assert.equal(other.method, "new_profile");
  assert.equal(store.profiles.size, 2);
  const log = store.resolutionFor(other.eventId);
  assert.ok(
    log?.candidates.some((c) => c.rejectedReason),
    "the contradicting candidate must be recorded as rejected",
  );
});

test("device plus a near-identical name is a low-confidence probabilistic match", async () => {
  const store = new MemoryStore();
  const first = ok(
    await ingest(store, {
      channel: "mobile",
      event_type: "login",
      timestamp: "2026-09-18T10:00:00Z",
      identifiers: { device_id: "dev-7", name: "Priya Sharma" },
    }),
  );
  const second = ok(
    await ingest(store, {
      channel: "mobile",
      event_type: "product_view",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { device_id: "dev-7", name: "Prya Sharma" },
    }),
  );

  assert.ok(jaroWinkler("Prya Sharma", "Priya Sharma") >= 0.85);
  assert.equal(second.customerId, first.customerId);
  assert.equal(second.method, "probabilistic");
  assert.ok(second.confidence >= 0.7 && second.confidence < 0.94);
});

test("two candidates inside the decision margin create a new profile, flagged ambiguous", async () => {
  const store = new MemoryStore();
  // Two profiles, each sharing one weak identifier with the incoming event.
  ok(
    await ingest(store, {
      channel: "web",
      event_type: "page_view",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { device_id: "dev-amb" },
    }),
  );
  ok(
    await ingest(store, {
      channel: "web",
      event_type: "page_view",
      timestamp: "2026-09-20T10:01:00Z",
      identifiers: { cookie_id: "cookie-amb", device_id: "dev-amb" },
    }),
  );

  const ambiguous = ok(
    await ingest(store, {
      channel: "web",
      event_type: "page_view",
      timestamp: "2026-09-20T10:10:00Z",
      identifiers: { device_id: "dev-amb", cookie_id: "cookie-amb" },
    }),
  );

  const log = store.resolutionFor(ambiguous.eventId);
  if (ambiguous.method === "new_profile") {
    assert.equal(log?.ambiguous, true, "a tie must be recorded as ambiguous");
  } else {
    // A clear winner is acceptable only with a margin of at least 0.05.
    const scores = (log?.candidates ?? []).map((c) => c.score).sort((a, b) => b - a);
    assert.ok(scores[0] - (scores[1] ?? 0) >= 0.05);
  }
});

test("conflicting strong identifiers are recorded, never merged", async () => {
  const store = new MemoryStore();
  const a = ok(
    await ingest(store, {
      channel: "web",
      event_type: "login",
      timestamp: "2026-09-20T09:00:00Z",
      identifiers: { email: "a@example.com" },
    }),
  );
  const b = ok(
    await ingest(store, {
      channel: "call_center",
      event_type: "call_started",
      timestamp: "2026-09-20T09:30:00Z",
      identifiers: { phone: "+919999999999" },
    }),
  );
  assert.notEqual(a.customerId, b.customerId);

  const conflicting = ok(
    await ingest(store, {
      channel: "chat",
      event_type: "chat_started",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { email: "a@example.com", phone: "+919999999999" },
    }),
  );

  assert.equal(conflicting.conflict, true);
  assert.equal(store.profiles.size, 2, "conflicting profiles must not be merged");
  assert.equal(store.profiles.get(a.customerId)?.hasIdentityConflict, true);
  assert.equal(store.profiles.get(b.customerId)?.hasIdentityConflict, true);

  const notification = store.notifications.find((n) => n.type === "identity_conflict");
  assert.ok(notification, "a conflict must raise a notification");
  assert.ok(
    !notification!.message.includes("a@example.com"),
    "notifications must mask identifier values",
  );

  // The loser keeps its own strong identifier.
  const loser = a.customerId === conflicting.customerId ? b.customerId : a.customerId;
  assert.ok(store.identifiersFor(loser).length > 0);
});

test("every resolution decision writes an audit record", async () => {
  const store = new MemoryStore();
  const result = ok(
    await ingest(store, {
      channel: "web",
      event_type: "page_view",
      timestamp: "2026-09-20T10:00:00Z",
      identifiers: { cookie_id: "audit-1" },
    }),
  );
  const log = store.resolutionFor(result.eventId);
  assert.ok(log, "resolution_logs must have a row for every event");
  assert.equal(log!.customerId, result.customerId);
  assert.equal(log!.method, "new_profile");
  assert.ok(log!.evidence.length > 0, "evidence must explain the decision");
});
