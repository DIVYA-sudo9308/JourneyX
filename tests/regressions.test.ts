import assert from "node:assert/strict";
import test from "node:test";
import { dateRange, readAll, QueryError } from "../lib/queries/shared";
import { buildJourneyEvents, type EventRow } from "../lib/journey/build";
import { summarizeAnalytics, type AnalyticsData } from "../lib/analytics/summary";

const now = "2026-09-20T12:00:00.000Z";
function dataset(): AnalyticsData {
  return {
    customers: [
      { id: "a", is_anonymous: false, churn_risk: "high" },
      { id: "b", is_anonymous: false, churn_risk: "none" },
      { id: "c", is_anonymous: true, churn_risk: "medium" },
    ],
    events: [
      { id: "e1", customer_id: "a", channel: "web", timestamp: now, metadata: { resolution: { method: "origin", confidence: 0 } } },
      { id: "e2", customer_id: "a", channel: "web", timestamp: now, metadata: { resolution: { method: "probabilistic", confidence: 0.8 } } },
      { id: "e3", customer_id: "b", channel: "mobile", timestamp: "2026-08-01T00:00:00Z", metadata: { resolution: { method: "deterministic", confidence: 1 } } },
      { id: "e4", customer_id: "c", channel: "chat", timestamp: now, metadata: null },
    ],
    identifiers: [
      { id: "i1", customer_id: "a", identifier_type: "email", identifier_value: "a@example.test" },
      { id: "i2", customer_id: "a", identifier_type: "email", identifier_value: "a@example.test" },
      { id: "i3", customer_id: "b", identifier_type: "email", identifier_value: "b@example.test" },
      { id: "i4", customer_id: "c", identifier_type: "cookie_id", identifier_value: "cookie" },
    ],
    patterns: [
      ...["p1", "p2"].map((id) => ({ id, customer_id: "a", pattern_type: "drop_off", detected_at: now,
        metadata: { channel: "web" as const, eventType: "checkout_start", reason: "card_declined" } })),
      { id: "p3", customer_id: "b", pattern_type: "drop_off", detected_at: "2026-08-01T00:00:00Z",
        metadata: { channel: "mobile", eventType: "checkout_start", reason: "timeout" } },
      ...["p4", "p5", "p6", "p7"].map((id) => ({ id, customer_id: "a", pattern_type: "repeat_contact", detected_at: now, metadata: { channel: "web" as const } })),
    ],
  };
}
function kpi(summary: ReturnType<typeof summarizeAnalytics>, key: string) {
  return summary.kpis.find((k) => k.key === key)?.value;
}

test("dashboard applies channel filters to customer, pattern, confidence and fragment KPIs", () => {
  const result = summarizeAnalytics(dataset(), { channel: ["web"] }, now);
  assert.equal(result.totalEvents, 2);
  assert.equal(kpi(result, "unified_customers"), "1");
  assert.equal(kpi(result, "fragments_unified"), "1");
  assert.equal(kpi(result, "avg_link_confidence"), "0.80");
  assert.equal(kpi(result, "checkout_drop_offs"), "2");
  assert.equal(kpi(result, "churn_risk_customers"), "1");
  assert.equal(result.frictionRanking.length, 1);
  assert.equal(result.churnCorrelation[0].n, 1);
});
test("dashboard dates scope both the event cohort and pattern occurrences", () => {
  const data = dataset();
  data.patterns.push({ ...data.patterns[0], id: "old", detected_at: "2026-01-01T00:00:00Z" });
  const result = summarizeAnalytics(data, { dateFrom: "2026-09-20", dateTo: "2026-09-20" }, now);
  assert.equal(result.totalEvents, 3);
  assert.equal(kpi(result, "unified_customers"), "2");
  assert.equal(kpi(result, "checkout_drop_offs"), "2");
});
test("friction counts unique customers and insight uses that failure's actual cohort", () => {
  const result = summarizeAnalytics(dataset(), {}, now);
  assert.equal(result.frictionRanking[0].affectedCustomers, 1);
  assert.equal(result.insight?.affectedCount, 1);
  assert.equal(result.insight?.churnRateAffected, 1);
  assert.equal(result.insight?.churnRateBaseline, 0.5);
  assert.equal(result.insight?.lift, 2);
  assert.equal(result.churnCorrelation[0].churnRateWith, 0.5);
});
test("repeat contact is a customer rate and cannot exceed 100%", () => {
  const result = summarizeAnalytics(dataset(), {}, now);
  assert.equal(kpi(result, "repeat_contact_rate"), "33%");
});
test("known and anonymous profiles add up and origin events do not reduce link confidence", () => {
  const result = summarizeAnalytics(dataset(), {}, now);
  assert.equal(kpi(result, "unified_customers"), "3");
  assert.equal(kpi(result, "avg_link_confidence"), "0.90");
  assert.equal(kpi(result, "fragments_unified"), "2");
});
test("zero baseline yields unavailable lift instead of false zero risk", () => {
  const result = summarizeAnalytics(dataset(), { channel: ["web"] }, now);
  assert.equal(result.insight?.lift, null);
});
test("empty filtered data produces consistent empty metrics", () => {
  const result = summarizeAnalytics(dataset(), { channel: ["in_store"] }, now);
  assert.equal(result.totalEvents, 0);
  assert.equal(kpi(result, "unified_customers"), "0");
  assert.equal(kpi(result, "checkout_drop_offs"), "0");
  assert.equal(result.insight, null);
});
test("unknown pattern metadata does not invent a card-declined web failure", () => {
  const data = dataset();
  data.patterns = [{ ...data.patterns[0], metadata: {} }];
  assert.equal(summarizeAnalytics(data, {}, now).frictionRanking.length, 0);
});
test("date range rejects impossible, reversed and non-calendar inputs", () => {
  for (const value of ["2026-02-30", "invalid", "2026-09-20T10:00:00Z"]) {
    assert.throws(() => dateRange(value), QueryError);
  }
  assert.throws(() => dateRange("2026-09-21", "2026-09-20"), QueryError);
  assert.deepEqual(dateRange("2024-02-29", "2024-02-29"), {
    fromIso: "2024-02-29T00:00:00.000Z", untilIso: "2024-03-01T00:00:00.000Z",
  });
});
test("readAll fetches beyond a server row cap, even if lower than the requested page", async () => {
  const source = Array.from({ length: 1207 }, (_, id) => ({ id }));
  const rows = await readAll("test", async (from, to) => ({
    data: source.slice(from, Math.min(to + 1, from + 100)), error: null,
  }));
  assert.deepEqual(rows, source);
});
test("readAll rejects a later page error instead of silently returning partial results", async () => {
  await assert.rejects(readAll("test", async (from) => from === 0
    ? { data: [{ id: 1 }], error: null }
    : { data: null, error: { message: "failed", code: "TEST" } }), QueryError);
});
function event(id: string, seconds: number, channel: EventRow["channel"] = "web"): EventRow {
  return { id, channel, event_type: "page_view", timestamp: new Date(Date.parse(now) + seconds * 1000).toISOString(), metadata: {} };
}
test("session splits immediately above 30 minutes, but not at exactly 30 minutes", () => {
  const events = buildJourneyEvents([event("1", 0), event("2", 1800), event("3", 3601)]);
  assert.deepEqual(events.map((e) => e.sessionIndex), [0, 0, 1]);
});
test("journey splits immediately above 24 hours, but not at exactly 24 hours", () => {
  const events = buildJourneyEvents([event("1", 0), event("2", 86400), event("3", 172801)]);
  assert.deepEqual(events.map((e) => e.journeyIndex), [0, 0, 1]);
});
test("channel changes start a session within the same journey", () => {
  const events = buildJourneyEvents([event("1", 0), event("2", 1, "mobile")]);
  assert.equal(events[1].sessionIndex, 1);
  assert.equal(events[1].journeyIndex, 0);
  assert.equal(events[1].transitionFrom, "web");
});
