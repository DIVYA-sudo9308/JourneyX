/**
 * Deterministic JourneyX seeder. Uses the same mock builders that power the
 * mock fallback, then inserts customers, identifiers, identity_links, events,
 * journeys, patterns and churn_signals into Supabase via the service role key.
 *
 * Usage:
 *   npm run seed
 *
 * Env (place in .env.local):
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import {
  getMockCustomers,
  getMockCustomerById,
  getMockCustomerJourney,
} from "../lib/mock/customers";
import { asOf } from "../lib/shared/clock";
import type { Channel } from "../lib/types/domain";
import type { CustomerPattern } from "../lib/types/customer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[seed] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CHUNK = 500;

async function chunked<T>(rows: T[], tableName: string): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    // Supabase's generated `Row` type is `never` without generated types,
    // so we widen `insert`'s argument to `any[]` here — the shape is
    // validated by Postgres.
    const { error } = await supabase.from(tableName).insert(slice as unknown as never[]);
    if (error) {
      throw new Error(`insert ${tableName} @ chunk ${i}: ${error.message}`);
    }
    process.stdout.write(
      `  ${tableName}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`,
    );
  }
  process.stdout.write("\n");
}

async function truncateAll(): Promise<void> {
  const tables = [
    "identity_links",
    "customer_identifiers",
    "events",
    "journeys",
    "patterns",
    "churn_signals",
    "customers",
  ];
  for (const t of tables) {
    // PostgREST insists on a filter; a non-null id catches every row.
    const { error } = await supabase.from(t).delete().not("id", "is", null);
    if (error) throw new Error(`truncate ${t}: ${error.message}`);
  }
}

function fullEmailFor(displayName: string | null, maskedEmail: string | null): string {
  const domain = maskedEmail?.split("@")[1] ?? "example.com";
  const parts = (displayName ?? "anon user").toLowerCase().split(" ");
  return `${parts[0] ?? "customer"}.${parts[1] ?? "user"}@${domain}`;
}

type PatternMeta = {
  channel: Channel;
  eventType: string;
  label: string;
  detail: string;
  groupId: string;
  reason?: string;
  source?: Channel;
  destination?: Channel;
};

async function main(): Promise<void> {
  const now = asOf();
  console.log(`[seed] Using asOf = ${now.toISOString()}`);
  console.log("[seed] Building deterministic dataset from mock builders...");

  const listResult = getMockCustomers({
    asOf: now,
    page: 1,
    pageSize: 10_000,
  });
  const items = listResult.items;
  console.log(`[seed] Customers: ${items.length}`);

  const customerRows: unknown[] = [];
  const identifierRows: (Record<string, unknown> & {
    __linkMethod: string;
    __linkConfidence: number;
  })[] = [];
  const journeyRows: unknown[] = [];
  const eventRows: unknown[] = [];
  const patternRows: unknown[] = [];
  const churnRows: unknown[] = [];

  let eventCount = 0;
  const totalPatterns: Record<CustomerPattern, number> = {
    drop_off: 0,
    escalation: 0,
    repeat_contact: 0,
    unresolved_issue: 0,
  };

  for (const item of items) {
    const detail = getMockCustomerById(item.id, now);
    if (!detail) continue;
    const journey = getMockCustomerJourney(detail, now);

    const emailIdent = detail.identifiers.find((i) => i.type === "email");
    const phoneIdent = detail.identifiers.find((i) => i.type === "phone");
    const loyaltyIdent = detail.identifiers.find((i) => i.type === "loyalty_id");

    customerRows.push({
      id: detail.id,
      display_name: detail.displayName,
      email:
        emailIdent?.value ??
        (item.isAnonymous ? null : fullEmailFor(detail.displayName, item.maskedEmail)),
      phone: phoneIdent?.value ?? null,
      loyalty_id: loyaltyIdent?.value ?? null,
      is_anonymous: detail.isAnonymous,
      channels: detail.channels,
      event_count: detail.eventCount,
      identity_confidence: detail.identityConfidence,
      churn_risk: detail.churnRisk,
      patterns: item.patterns,
      first_seen_at: detail.firstSeenIso,
      last_active_at: detail.lastSeenIso,
      metadata: {
        activeDurationDays: detail.activeDurationDays,
        silenceDays: detail.silenceDays,
        weakestLinkExplanation: detail.weakestLink.explanation,
        hasConflict: detail.hasConflict,
        patternCounts: detail.patternCounts,
      },
    });

    for (const ident of detail.identifiers) {
      identifierRows.push({
        customer_id: detail.id,
        identifier_type: ident.type,
        identifier_value: ident.value,
        confidence: ident.linkConfidence,
        source: ident.sourceChannel,
        first_seen_at: ident.firstSeenIso,
        __linkMethod: ident.linkMethod,
        __linkConfidence: ident.linkConfidence,
      });
    }

    // Assign a UUID per unique journeyIndex encountered in this customer's stream.
    const journeyMap = new Map<number, string>();
    const journeyStarts = new Map<string, string>();
    const journeyEnds = new Map<string, string>();
    const journeyEventCounts = new Map<string, number>();

    for (const ev of journey.events) {
      let jid = journeyMap.get(ev.journeyIndex);
      if (!jid) {
        jid = randomUUID();
        journeyMap.set(ev.journeyIndex, jid);
      }
      if (!journeyStarts.has(jid)) journeyStarts.set(jid, ev.timestampIso);
      journeyEnds.set(jid, ev.timestampIso);
      journeyEventCounts.set(jid, (journeyEventCounts.get(jid) ?? 0) + 1);
    }
    for (const [jid, started] of journeyStarts.entries()) {
      journeyRows.push({
        id: jid,
        customer_id: detail.id,
        started_at: started,
        ended_at: journeyEnds.get(jid) ?? started,
        event_count: journeyEventCounts.get(jid) ?? 0,
      });
    }

    for (const ev of journey.events) {
      const jid = journeyMap.get(ev.journeyIndex);
      eventRows.push({
        id: ev.id,
        customer_id: detail.id,
        event_type: ev.eventType,
        channel: ev.channel,
        timestamp: ev.timestampIso,
        session_id: `${detail.id}-s${ev.sessionIndex}`,
        journey_id: jid,
        source: "seed",
        metadata: {
          summary: ev.summary,
          metadata: ev.metadata,
          resolution: ev.resolution,
          patterns: ev.patterns,
          eventCategory: ev.eventCategory,
        },
      });
      eventCount += 1;
    }

    // Anchor patterns → one pattern row each.
    for (const ev of journey.events) {
      for (const pat of ev.patterns ?? []) {
        if (pat.role !== "anchor") continue;
        const meta: PatternMeta = {
          channel: ev.channel,
          eventType: ev.eventType,
          label: pat.label,
          detail: pat.detail,
          groupId: pat.groupId,
        };
        if (pat.type === "drop_off") {
          const errorItem = ev.metadata.find((m) => m.label === "error_code");
          meta.reason = errorItem?.value ?? "card_declined";
        } else if (pat.type === "escalation") {
          const related = journey.events.find((e) =>
            (e.patterns ?? []).some(
              (x) => x.groupId === pat.groupId && x.role === "related",
            ),
          );
          if (related) meta.source = related.channel;
          meta.destination = ev.channel;
        }
        totalPatterns[pat.type] += 1;
        patternRows.push({
          customer_id: detail.id,
          pattern_type: pat.type,
          confidence: 0.9,
          detected_at: ev.timestampIso,
          metadata: meta,
        });
      }
    }

    for (const s of detail.churnSignals) {
      churnRows.push({
        customer_id: detail.id,
        signal_type: s.rule,
        severity:
          detail.churnRisk === "high"
            ? "high"
            : detail.churnRisk === "medium"
              ? "medium"
              : "low",
        confidence: 0.85,
        evidence: s.evidence,
        detected_at: detail.lastSeenIso,
        metadata: {},
      });
    }
    if (detail.churnRisk !== "none" && detail.churnSignals.length === 0) {
      churnRows.push({
        customer_id: detail.id,
        signal_type: "silence",
        severity: detail.churnRisk === "high" ? "high" : "medium",
        confidence: 0.7,
        evidence: `${detail.silenceDays} days of silence.`,
        detected_at: detail.lastSeenIso,
        metadata: {},
      });
    }
  }

  console.log("[seed] Wiping existing rows...");
  await truncateAll();

  console.log(`[seed] Inserting customers (${customerRows.length})...`);
  await chunked(customerRows, "customers");

  console.log(`[seed] Inserting journeys (${journeyRows.length})...`);
  await chunked(journeyRows, "journeys");

  console.log(`[seed] Inserting events (${eventRows.length})...`);
  await chunked(eventRows, "events");

  console.log(`[seed] Inserting patterns (${patternRows.length})...`);
  await chunked(patternRows, "patterns");

  console.log(`[seed] Inserting churn_signals (${churnRows.length})...`);
  await chunked(churnRows, "churn_signals");

  console.log(`[seed] Inserting identifiers + identity_links...`);
  const grouped = new Map<string, typeof identifierRows>();
  for (const r of identifierRows) {
    const cid = r.customer_id as string;
    if (!grouped.has(cid)) grouped.set(cid, []);
    grouped.get(cid)!.push(r);
  }
  let inserted = 0;
  for (const [customerId, rows] of grouped.entries()) {
    const stripped = rows.map((r) => {
      const { __linkMethod, __linkConfidence, ...rest } = r;
      void __linkMethod;
      void __linkConfidence;
      return rest;
    });
    const { data, error } = await supabase
      .from("customer_identifiers")
      .insert(stripped)
      .select("id");
    if (error) throw new Error(`identifiers ${customerId}: ${error.message}`);
    const links = (data ?? []).map((idRow, idx) => ({
      customer_id: customerId,
      identifier_id: (idRow as { id: string }).id,
      link_method: rows[idx].__linkMethod,
      confidence: rows[idx].__linkConfidence,
    }));
    if (links.length > 0) {
      const { error: linkErr } = await supabase.from("identity_links").insert(links);
      if (linkErr) throw new Error(`identity_links ${customerId}: ${linkErr.message}`);
    }
    inserted += rows.length;
    if (inserted % 500 === 0 || inserted === identifierRows.length) {
      process.stdout.write(
        `  identifiers+links: ${inserted}/${identifierRows.length}\r`,
      );
    }
  }
  process.stdout.write("\n");

  console.log("[seed] Done.");
  console.log(
    JSON.stringify(
      {
        customers: customerRows.length,
        identifiers: identifierRows.length,
        identity_links: identifierRows.length,
        journeys: journeyRows.length,
        events: eventCount,
        patterns: patternRows.length,
        churn_signals: churnRows.length,
        pattern_breakdown: totalPatterns,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
