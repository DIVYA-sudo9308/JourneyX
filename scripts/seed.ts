/**
 * JourneyX seeder.
 *
 * The important property: **the seed does not write conclusions.** It emits
 * raw events and runs every one of them through `processEvent` — the same
 * validate → normalize → deduplicate → resolve → stitch → detect pipeline the
 * API runs. Profiles, identifiers, resolution logs, patterns, churn signals
 * and notifications are all produced by that pipeline, never inserted directly.
 *
 * For speed the run executes against the in-memory store (thousands of events
 * would otherwise mean tens of thousands of network round trips), then the
 * resulting rows are bulk-inserted. The code path that *decides* anything is
 * identical either way.
 *
 * Usage:
 *   npm run seed                 # default population
 *   npm run seed -- --count 120  # smaller dataset
 *
 * Env (.env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_AS_OF
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { demoScenarios, toRawEvent } from "../lib/demo/fixtures";
import { MemoryStore } from "../lib/pipeline/adapters/memory";
import { processEvent } from "../lib/pipeline/ingest";
import { reconcileProfile } from "../lib/patterns/reconcile";
import { asOf } from "../lib/shared/clock";
import { generatePopulation } from "./generate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[seed] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CHUNK = 500;

function arg(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

async function insertChunked(table: string, rows: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from(table).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/** Child tables first — every one cascades from `customers`. */
async function wipe(): Promise<void> {
  const tables = [
    "notifications",
    "ingestion_log",
    "resolution_logs",
    "patterns",
    "events",
    "customer_identifiers",
    "customers",
  ];
  for (const table of tables) {
    const { error } = await db.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`wipe ${table}: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const clock = asOf();
  const count = arg("count", 300);

  console.log(`[seed] asOf = ${clock.toISOString()} (set DEMO_AS_OF to pin it)`);

  /* ---- 1. Build the raw event stream ---- */
  const population = generatePopulation(clock, count);
  const scenarios = demoScenarios(clock);
  const demoEvents = scenarios.flatMap((scenario) =>
    scenario.events
      .filter((event) => !scenario.deferredLabels.includes(event.label))
      .map(toRawEvent),
  );
  const deferred = scenarios.flatMap((s) =>
    s.deferredLabels.map((label) => `${s.key} ${label}`),
  );

  console.log(
    `[seed] generated ${population.events.length} population events + ${demoEvents.length} demo events`,
  );

  /* ---- 2. Run them through the real pipeline ---- */
  const store = new MemoryStore();
  const started = Date.now();
  let rejected = 0;
  let duplicates = 0;

  // The demo customers go first so their profile ids are stable across runs.
  const stream = [...demoEvents, ...population.events];
  for (let i = 0; i < stream.length; i += 1) {
    const result = await processEvent(store, stream[i], {
      asOf: clock,
      source: "seed",
      // Detectors run once per customer at the end instead of after every
      // event — same result, a fraction of the work.
      skipReconcile: true,
    });
    if (!result.ok) rejected += 1;
    else if (result.duplicate) duplicates += 1;
    if ((i + 1) % 1000 === 0) {
      console.log(`[seed]   processed ${i + 1}/${stream.length} events…`);
    }
  }

  console.log(
    `[seed] ingested in ${((Date.now() - started) / 1000).toFixed(1)}s · ${store.profiles.size} profiles · ${store.events.length} events · ${rejected} rejected · ${duplicates} duplicates`,
  );

  /* ---- 3. Detect patterns for every profile ---- */
  for (const customerId of store.profiles.keys()) {
    await reconcileProfile(store, customerId, clock);
  }
  console.log(
    `[seed] detected ${store.patterns.length} patterns · ${store.notifications.length} notifications`,
  );

  /* ---- 4. Flush to Supabase ---- */
  console.log("[seed] wiping existing data…");
  await wipe();

  console.log("[seed] writing customers…");
  await insertChunked(
    "customers",
    [...store.profiles.values()].map((p) => ({
      id: p.id,
      display_name: p.displayName,
      email: p.email,
      phone: p.phone,
      loyalty_id: p.loyaltyId,
      is_anonymous: p.isAnonymous,
      channels: p.channels,
      event_count: p.eventCount,
      identity_confidence: p.identityConfidence,
      churn_risk: p.churnRisk,
      patterns: p.patterns,
      first_seen_at: p.firstSeenIso,
      last_active_at: p.lastActiveIso,
      has_identity_conflict: p.hasIdentityConflict,
      patterns_evaluated_at: clock.toISOString(),
      metadata: p.metadata,
    })),
  );

  console.log("[seed] writing identifiers…");
  await insertChunked(
    "customer_identifiers",
    store.identifiers.map((i) => ({
      id: i.id,
      customer_id: i.customerId,
      identifier_type: i.type,
      identifier_value: i.value,
      confidence: i.linkConfidence,
      source: i.sourceChannel,
      link_method: i.linkMethod,
      link_confidence: i.linkConfidence,
      first_seen_at: i.firstSeenIso,
      last_seen_at: i.lastSeenIso,
    })),
  );

  console.log("[seed] writing events…");
  const dedupByEvent = store.dedupKeysByEvent();
  await insertChunked(
    "events",
    store.events.map((e) => ({
      id: e.id,
      customer_id: e.customerId,
      event_type: e.eventType,
      event_category: e.eventCategory,
      channel: e.channel,
      timestamp: e.timestampIso,
      metadata: e.metadata,
      identifiers: e.identifiers,
      dedup_key: dedupByEvent.get(e.id) ?? e.id,
      source_event_id: null,
      resolution_method: e.resolutionMethod,
      resolution_confidence: e.resolutionConfidence,
      source: "seed",
    })),
  );

  console.log("[seed] writing resolution logs…");
  await insertChunked(
    "resolution_logs",
    store.resolutionLogs.map((log) => ({
      event_id: log.eventId,
      customer_id: log.customerId,
      method: log.result.method,
      confidence: log.result.confidence,
      evidence: log.result.evidence,
      candidates: log.result.candidates,
      identifiers_added: log.result.identifiersAdded.map((i) => ({
        type: i.type,
        link_method: i.linkMethod,
        link_confidence: i.linkConfidence,
      })),
      ambiguous: log.result.ambiguous,
      conflict: log.result.conflict,
      conflict_details: log.result.conflictDetails,
    })),
  );

  console.log("[seed] writing patterns…");
  await insertChunked(
    "patterns",
    store.patterns.map((p) => ({
      customer_id: p.customerId,
      pattern_type: p.patternType,
      pattern_key: p.patternKey,
      event_id: p.eventId,
      related_event_ids: p.relatedEventIds,
      confidence: p.confidence,
      detected_at: p.detectedAtIso,
      evaluated_as_of: p.detectedAtIso,
      metadata: { ...p.details, severity: p.severity, description: p.description },
    })),
  );

  console.log("[seed] writing notifications…");
  await insertChunked(
    "notifications",
    store.notifications.map((n) => ({
      notification_type: n.type,
      severity: n.severity,
      dedupe_key: n.dedupeKey,
      title: n.title,
      message: n.message,
      customer_id: n.customerId,
      deep_link: n.deepLink,
    })),
  );

  console.log("[seed] writing ingestion log…");
  await insertChunked(
    "ingestion_log",
    store.ingestionLogs.map((l) => ({
      received_at: l.receivedAt,
      channel: l.channel,
      event_type: l.eventType,
      outcome: l.outcome,
      stage_reached: l.stageReached,
      error_code: l.errorCode,
      error_message: l.errorMessage,
      event_id: l.eventId,
      latency_ms: l.latencyMs,
      stage_timings: l.stageTimings,
    })),
  );

  /* ---- 5. Report what the pipeline decided ---- */
  const profiles = [...store.profiles.values()];
  const byRisk = (risk: string) => profiles.filter((p) => p.churnRisk === risk).length;
  const byPattern = (type: string) =>
    store.patterns.filter((p) => p.patternType === type).length;
  const methods = store.events.reduce<Record<string, number>>((acc, e) => {
    acc[e.resolutionMethod] = (acc[e.resolutionMethod] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\n[seed] done. Everything below was computed by the pipeline:");
  console.table({
    profiles: profiles.length,
    known: profiles.filter((p) => !p.isAnonymous).length,
    anonymous: profiles.filter((p) => p.isAnonymous).length,
    events: store.events.length,
    identifiers: store.identifiers.length,
    resolution_logs: store.resolutionLogs.length,
  });
  console.table({
    deterministic: methods.deterministic ?? 0,
    probabilistic: methods.probabilistic ?? 0,
    new_profile: methods.new_profile ?? 0,
  });
  console.table({
    drop_off: byPattern("drop_off"),
    escalation: byPattern("escalation"),
    repeat_contact: byPattern("repeat_contact"),
    unresolved_issue: byPattern("unresolved_issue"),
    churn_signal: byPattern("churn_signal"),
  });
  console.table({
    churn_high: byRisk("high"),
    churn_medium: byRisk("medium"),
    churn_none: byRisk("none"),
    identity_conflicts: profiles.filter((p) => p.hasIdentityConflict).length,
    notifications: store.notifications.length,
  });

  if (deferred.length > 0) {
    console.log(
      `\n[seed] held back for the live demo: ${deferred.join(", ")} — replay with \`npm run replay -- priya E12\`.`,
    );
  }
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
