import type { RawEvent } from "@/lib/pipeline/types";

/**
 * Canonical demo fixtures (SoT §7.3 and §7.4). The seeder, the replay script
 * and the end-to-end test all build their events from here, so the golden
 * assertions and the demo are guaranteed to describe the same journeys.
 *
 * Times are expressed in IST (the demo's timezone) relative to `asOf`.
 */

const IST_OFFSET = "+05:30";
const DAY_MS = 86_400_000;

/** Builds an ISO timestamp for `day` at `hh:mm` IST, `daysBefore` days before asOf. */
function at(asOf: Date, daysBeforeAsOf: number, hhmm: string): string {
  const day = new Date(asOf.getTime() - daysBeforeAsOf * DAY_MS);
  const date = day.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${date}T${hhmm}:00.000${IST_OFFSET}`).toISOString();
}

/** A fixture event plus the stable label (E1…E14) used to replay it. */
export type LabelledEvent = RawEvent & { label: string };

export interface DemoScenario {
  key: string;
  customerName: string;
  events: LabelledEvent[];
  /** Events the seeder deliberately skips, replayed live during the demo. */
  deferredLabels: string[];
}

/** The label is fixture bookkeeping — the ingestion API rejects unknown keys. */
export function toRawEvent({ label, ...event }: LabelledEvent): RawEvent {
  void label;
  return event;
}

const PRIYA = {
  cookie: "ck_priya_01",
  email: "priya.sharma@example.com",
  name: "Priya Sharma",
  device: "dev_priya_m1",
  phone: "+91 98765 43210",
};

/**
 * "Frustrated Shopper" — three channel systems see three strangers until
 * JourneyX unifies them: a web cookie, an app device, a call-center phone
 * number. D0 is 19 days before `asOf`, which puts the customer 14.6 days into
 * silence after an escalation (churn rule R2).
 */
export function priyaScenario(asOf: Date): DemoScenario {
  const D0 = 19;
  const events: LabelledEvent[] = [
    {
      label: "E1",
      event_id: "priya-e1",
      channel: "web",
      event_type: "page_view",
      timestamp: at(asOf, D0, "10:00"),
      identifiers: { cookie_id: PRIYA.cookie },
      metadata: { path: "/products/running-shoes-pro" },
    },
    {
      label: "E2",
      event_id: "priya-e2",
      channel: "web",
      event_type: "product_view",
      timestamp: at(asOf, D0, "10:04"),
      identifiers: { cookie_id: PRIYA.cookie },
      metadata: { sku: "SKU-1234", product: "Running Shoes Pro", price: 4999 },
    },
    {
      label: "E3",
      event_id: "priya-e3",
      channel: "web",
      event_type: "add_to_cart",
      timestamp: at(asOf, D0, "10:07"),
      identifiers: { cookie_id: PRIYA.cookie },
      metadata: { cart_value: 4999, sku: "SKU-1234" },
    },
    {
      label: "E4",
      event_id: "priya-e4",
      channel: "web",
      event_type: "login",
      timestamp: at(asOf, D0, "10:15"),
      identifiers: { cookie_id: PRIYA.cookie, email: PRIYA.email, name: PRIYA.name },
      metadata: { method: "password" },
    },
    {
      label: "E5",
      event_id: "priya-e5",
      channel: "web",
      event_type: "checkout_start",
      timestamp: at(asOf, D0, "10:20"),
      identifiers: { cookie_id: PRIYA.cookie, email: PRIYA.email },
      metadata: { cart_value: 4999, sku: "SKU-1234" },
    },
    {
      label: "E6",
      event_id: "priya-e6",
      channel: "web",
      event_type: "payment_attempt",
      timestamp: at(asOf, D0, "10:24"),
      identifiers: { cookie_id: PRIYA.cookie, email: PRIYA.email },
      metadata: { error_code: "card_declined", cart_value: 4999 },
    },
    {
      label: "E7",
      event_id: "priya-e7",
      channel: "mobile",
      event_type: "login",
      timestamp: at(asOf, D0, "11:05"),
      identifiers: { device_id: PRIYA.device, email: PRIYA.email },
      metadata: { app_version: "4.2.1" },
    },
    {
      label: "E8",
      event_id: "priya-e8",
      channel: "mobile",
      event_type: "payment_attempt",
      timestamp: at(asOf, D0, "11:08"),
      identifiers: { device_id: PRIYA.device, email: PRIYA.email },
      metadata: { error_code: "card_declined", cart_value: 4999 },
    },
    {
      label: "E9",
      event_id: "priya-e9",
      channel: "call_center",
      event_type: "call_started",
      timestamp: at(asOf, D0, "13:00"),
      identifiers: { phone: PRIYA.phone, email: PRIYA.email },
      metadata: { reason: "payment_failure", wait_seconds: 240 },
    },
    {
      label: "E10",
      event_id: "priya-e10",
      channel: "call_center",
      event_type: "ticket_created",
      timestamp: at(asOf, D0, "13:09"),
      identifiers: { phone: PRIYA.phone },
      metadata: { ticket_id: "TKT-8891", reason: "payment_failure" },
    },
    {
      label: "E11",
      event_id: "priya-e11",
      channel: "call_center",
      event_type: "call_ended",
      timestamp: at(asOf, D0, "13:12"),
      identifiers: { phone: PRIYA.phone },
      metadata: { disposition: "pending", ticket_id: "TKT-8891" },
    },
    {
      label: "E12",
      event_id: "priya-e12",
      channel: "call_center",
      event_type: "call_started",
      timestamp: at(asOf, D0 - 3, "14:00"),
      identifiers: { phone: PRIYA.phone },
      metadata: { reason: "ticket_followup", ticket_id: "TKT-8891" },
    },
    {
      label: "E13",
      event_id: "priya-e13",
      channel: "call_center",
      event_type: "call_ended",
      timestamp: at(asOf, D0 - 3, "14:15"),
      identifiers: { phone: PRIYA.phone },
      metadata: { disposition: "unresolved", ticket_id: "TKT-8891" },
    },
    {
      label: "E14",
      event_id: "priya-e14",
      channel: "web",
      event_type: "page_view",
      timestamp: at(asOf, D0 - 4, "19:30"),
      identifiers: { cookie_id: PRIYA.cookie, email: PRIYA.email },
      metadata: { path: "/account/orders" },
    },
  ];

  return {
    key: "priya",
    customerName: PRIYA.name,
    events,
    // E12 arrives live during the demo, three days late, to show stitching and
    // the repeat-contact pattern appearing as a result (SoT §7.6).
    deferredLabels: ["E12"],
  };
}

const RAJESH = {
  email: "rajesh.patel@example.in",
  name: "Rajesh Patel",
  loyalty: "LYL-RP-4410",
  phone: "+91 98123 45678",
  cookie: "ck_rajesh_77",
};

/**
 * "Support Loop, resolved" — the deliberate contrast to Priya: he escalated
 * too, but the issue was closed in three days and he came back to buy, so his
 * churn risk is none.
 */
export function rajeshScenario(asOf: Date): DemoScenario {
  const events: LabelledEvent[] = [
    {
      label: "R1",
      event_id: "rajesh-r1",
      channel: "email",
      event_type: "email_sent",
      timestamp: at(asOf, 12, "18:00"),
      identifiers: { email: RAJESH.email, name: RAJESH.name },
      metadata: { subject: "Return request", direction: "inbound" },
    },
    {
      label: "R2",
      event_id: "rajesh-r2",
      channel: "email",
      event_type: "ticket_created",
      timestamp: at(asOf, 12, "18:02"),
      identifiers: { email: RAJESH.email },
      metadata: { ticket_id: "TKT-7702", reason: "return_refund" },
    },
    {
      label: "R3",
      event_id: "rajesh-r3",
      channel: "chat",
      event_type: "chat_started",
      timestamp: at(asOf, 10, "11:00"),
      identifiers: { email: RAJESH.email },
      metadata: { ticket_id: "TKT-7702", reason: "return_status" },
    },
    {
      label: "R4",
      event_id: "rajesh-r4",
      channel: "in_store",
      event_type: "store_visit",
      timestamp: at(asOf, 9, "17:30"),
      identifiers: { loyalty_id: RAJESH.loyalty, phone: RAJESH.phone, email: RAJESH.email },
      metadata: { purpose: "return", store: "Ahmedabad-01" },
    },
    {
      label: "R5",
      event_id: "rajesh-r5",
      channel: "in_store",
      event_type: "return_processed",
      timestamp: at(asOf, 9, "17:45"),
      identifiers: { loyalty_id: RAJESH.loyalty },
      metadata: { ticket_id: "TKT-7702", refund_value: 2499 },
    },
    {
      label: "R6",
      event_id: "rajesh-r6",
      channel: "email",
      event_type: "ticket_resolved",
      timestamp: at(asOf, 9, "17:50"),
      identifiers: { email: RAJESH.email },
      metadata: { ticket_id: "TKT-7702", resolution: "refunded" },
    },
    {
      label: "R7",
      event_id: "rajesh-r7",
      channel: "web",
      event_type: "purchase_complete",
      timestamp: at(asOf, 2, "12:00"),
      identifiers: { email: RAJESH.email, cookie_id: RAJESH.cookie },
      metadata: { order_value: 3299, sku: "SKU-9911" },
    },
  ];

  return { key: "rajesh", customerName: RAJESH.name, events, deferredLabels: [] };
}

export function demoScenarios(asOf: Date): DemoScenario[] {
  return [priyaScenario(asOf), rajeshScenario(asOf)];
}
