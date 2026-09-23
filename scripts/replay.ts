/**
 * Replays one canonical demo event through the live ingestion API.
 *
 * The demo deliberately withholds a late-arriving call-center record (SoT
 * §7.6). Replaying it shows the whole pipeline working on a running system:
 * the event is validated, deduplicated, resolved by phone at 1.00, stitched
 * into its chronological place, and the response already reports the
 * repeat-contact pattern it created.
 *
 * Usage:
 *   npm run replay -- priya E12
 *   npm run replay -- --list
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import { demoScenarios, toRawEvent } from "../lib/demo/fixtures";
import { asOf } from "../lib/shared/clock";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const BASE_URL = process.env.REPLAY_BASE_URL || "http://localhost:3000";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const scenarios = demoScenarios(asOf());

  if (process.argv.includes("--list") || args.length < 2) {
    console.log("Available demo events:\n");
    for (const scenario of scenarios) {
      const labels = scenario.events
        .map((e) => (scenario.deferredLabels.includes(e.label) ? `${e.label}*` : e.label))
        .join(" ");
      console.log(`  ${scenario.key.padEnd(8)} ${labels}`);
    }
    console.log("\n  * held back by the seed — replay these for the live demo beat.");
    console.log("\nUsage: npm run replay -- priya E12");
    return;
  }

  const [key, label] = args;
  const scenario = scenarios.find((s) => s.key === key);
  if (!scenario) throw new Error(`Unknown scenario "${key}". Try --list.`);
  const event = scenario.events.find((e) => e.label.toLowerCase() === label.toLowerCase());
  if (!event) throw new Error(`Unknown event "${label}" in "${key}". Try --list.`);

  const url = `${BASE_URL}/api/v1/events`;
  console.log(`[replay] POST ${url}`);
  console.log(`[replay] ${scenario.customerName} · ${event.label} · ${event.channel} · ${event.event_type}`);
  console.log(`[replay] timestamp ${event.timestamp}\n`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.INGEST_TOKEN ? { "x-ingest-token": process.env.INGEST_TOKEN } : {}),
    },
    body: JSON.stringify(toRawEvent(event)),
  });

  const body = await response.json();
  console.log(`[replay] HTTP ${response.status}`);
  console.log(JSON.stringify(body, null, 2));

  if (body?.duplicate) {
    console.log("\n[replay] Already ingested — the pipeline is idempotent. Reseed to rehearse again.");
  }
}

main().catch((error) => {
  console.error("[replay] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
