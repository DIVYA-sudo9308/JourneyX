import {
  CHANNELS,
  CHANNEL_LABEL,
  type Channel,
  type ChurnRisk,
} from "@/lib/types/domain";
import type {
  CustomerDetail,
  CustomerIdentifier,
  CustomerJourney,
  CustomerListFilters,
  CustomerListItem,
  CustomerListResult,
  CustomerPattern,
  ChurnSignal,
  EventCategory,
  IdentifierType,
  JourneyEvent,
  JourneyEventPattern,
  LinkMethod,
} from "@/lib/types/customer";

/**
 * Synthetic customer population standing in for `scripts/seed.ts` output
 * (SoT §7.5, D-45/D-46). Milestone 3 has no database yet, so this deterministic
 * fixture is the approved mock/fixture strategy — the query in
 * `lib/queries/customers.ts` filters/sorts/paginates it exactly as the real
 * `GET /api/v1/customers` would, so a later Prisma swap needs no component
 * change. Distributions echo the M2 dashboard aggregates (≈305 customers,
 * 31 high / 52 medium churn, etc.). No raw PII is ever stored — only masked
 * values (SoT D-12).
 */
const POPULATION_SIZE = 305;
const ANONYMOUS_COUNT = 41;
const CHURN_HIGH_COUNT = 31;
const CHURN_MEDIUM_COUNT = 52;
const SEED_WINDOW_DAYS = 90;

/** Deterministic PRNG so the population is identical on every render. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Priya", "Rajesh", "Anita", "Vikram", "Sneha", "Arjun", "Kavya", "Rohan",
  "Meera", "Karan", "Divya", "Aditya", "Pooja", "Sanjay", "Nisha", "Amit",
  "Ritu", "Vivek", "Neha", "Suresh", "Anjali", "Manish", "Deepa", "Rahul",
  "Shreya", "Nikhil", "Isha", "Gaurav", "Tara", "Varun",
];
const LAST_NAMES = [
  "Sharma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Mehta", "Singh",
  "Desai", "Rao", "Joshi", "Kumar", "Shah", "Verma", "Menon", "Bose",
  "Chopra", "Pillai", "Sethi", "Bhat",
];
const EMAIL_DOMAINS = ["example.com", "example.in", "mail.example.com"];
const LIST_PATTERNS: CustomerPattern[] = [
  "drop_off",
  "escalation",
  "repeat_contact",
  "unresolved_issue",
];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Fisher–Yates over indices with a seeded RNG. */
function shuffledIndices(n: number, rng: () => number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildPopulation(asOf: Date): CustomerListItem[] {
  const rng = mulberry32(20260919);

  // Assign churn and anonymity by construction so totals are stable.
  const order = shuffledIndices(POPULATION_SIZE, rng);
  const churnById = new Map<number, ChurnRisk>();
  order.forEach((id, rank) => {
    if (rank < CHURN_HIGH_COUNT) churnById.set(id, "high");
    else if (rank < CHURN_HIGH_COUNT + CHURN_MEDIUM_COUNT)
      churnById.set(id, "medium");
    else churnById.set(id, "none");
  });
  // Anonymous customers are drawn only from the "none" churn group.
  const noneIds = order.slice(CHURN_HIGH_COUNT + CHURN_MEDIUM_COUNT);
  const anonymousIds = new Set(noneIds.slice(0, ANONYMOUS_COUNT));

  const items: CustomerListItem[] = [];
  for (let i = 0; i < POPULATION_SIZE; i++) {
    const churnRisk = churnById.get(i) ?? "none";
    const isAnonymous = anonymousIds.has(i);

    // Channels: anonymous customers are seen on 1–2 low-tier channels.
    const channelCount = isAnonymous
      ? 1 + Math.floor(rng() * 2)
      : 1 + Math.floor(rng() * 4);
    const channels = [...CHANNELS]
      .sort(() => rng() - 0.5)
      .slice(0, channelCount)
      .sort((a, b) => CHANNELS.indexOf(a) - CHANNELS.indexOf(b));

    // Confidence: known customers cluster at deterministic 1.00, with some
    // session-bridge (0.80) and low (0.72) links; anonymous are origin-only.
    let identityConfidence: number;
    if (isAnonymous) {
      identityConfidence = Number((0.3 + rng() * 0.35).toFixed(2)); // < 0.70
    } else {
      const roll = rng();
      identityConfidence =
        roll < 0.55 ? 1.0 : roll < 0.75 ? 0.8 : roll < 0.88 ? 0.72 : 0.94;
    }

    // Patterns: more for higher churn risk. Churn customers never anonymous.
    const patternBudget =
      churnRisk === "high"
        ? 2 + Math.floor(rng() * 2)
        : churnRisk === "medium"
          ? 1 + Math.floor(rng() * 2)
          : rng() < 0.25
            ? 1
            : 0;
    const patterns = [...LIST_PATTERNS]
      .sort(() => rng() - 0.5)
      .slice(0, Math.min(patternBudget, LIST_PATTERNS.length))
      .sort((a, b) => LIST_PATTERNS.indexOf(a) - LIST_PATTERNS.indexOf(b));

    // Last active: high-churn customers have gone quiet (14–45d); others recent.
    const daysAgo =
      churnRisk === "high"
        ? 14 + Math.floor(rng() * 31)
        : Math.floor(rng() * SEED_WINDOW_DAYS);
    const lastActive = new Date(asOf.getTime() - daysAgo * 86_400_000);

    const eventCount = isAnonymous
      ? 2 + Math.floor(rng() * 8)
      : 4 + Math.floor(rng() * 56);

    let displayName: string | null = null;
    let maskedEmail: string | null = null;
    if (!isAnonymous) {
      const first = pick(rng, FIRST_NAMES);
      const last = pick(rng, LAST_NAMES);
      displayName = `${first} ${last}`;
      maskedEmail = `${first[0].toLowerCase()}***@${pick(rng, EMAIL_DOMAINS)}`;
    }

    items.push({
      id: `cust_${(i + 1).toString().padStart(4, "0")}`,
      displayName,
      maskedEmail,
      isAnonymous,
      channels,
      eventCount,
      lastActiveIso: lastActive.toISOString(),
      identityConfidence,
      patterns,
      churnRisk,
    });
  }

  return items;
}

const CHURN_ORDER: Record<ChurnRisk, number> = { high: 3, medium: 2, none: 1 };

export interface MockCustomerFilters extends CustomerListFilters {
  asOf: Date;
}

export function getMockCustomers(
  filters: MockCustomerFilters,
): CustomerListResult {
  const { asOf } = filters;
  const population = buildPopulation(asOf);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 25;

  const patternSet = filters.pattern && filters.pattern.length > 0 ? new Set(filters.pattern) : null;
  const channelSet = filters.channel && filters.channel.length > 0 ? new Set(filters.channel) : null;
  const churnSet = filters.churnRisk && filters.churnRisk.length > 0 ? new Set(filters.churnRisk) : null;
  const minConfidence = filters.minConfidence;
  const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : null;

  const filtered = population.filter((c) => {
    if (patternSet && !c.patterns.some((p) => patternSet.has(p))) return false;
    if (channelSet && !c.channels.some((ch: Channel) => channelSet.has(ch)))
      return false;
    if (churnSet && !churnSet.has(c.churnRisk)) return false;
    if (minConfidence !== undefined && c.identityConfidence < minConfidence)
      return false;
    const last = new Date(c.lastActiveIso);
    if (from && last < from) return false;
    if (to && last > to) return false;
    return true;
  });

  const sortBy = filters.sortBy ?? "lastActive";
  const sortOrder = filters.sortOrder ?? "desc";
  const dir = sortOrder === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "eventCount") cmp = a.eventCount - b.eventCount;
    else if (sortBy === "churnRisk")
      cmp = CHURN_ORDER[a.churnRisk] - CHURN_ORDER[b.churnRisk];
    else
      cmp =
        new Date(a.lastActiveIso).getTime() -
        new Date(b.lastActiveIso).getTime();
    if (cmp === 0) cmp = a.id.localeCompare(b.id); // stable tiebreak
    return cmp * dir;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    totalUnfiltered: population.length,
    page,
    pageSize,
    asOfIso: asOf.toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Customer detail (S-03). Derived from the same population so a row and
 * its detail always agree, using a per-id sub-RNG so the list output is
 * untouched. Identifier VALUES are full here (SoT D-12); the list stays
 * masked. All values are synthetic (SoT §7.5).
 * ------------------------------------------------------------------ */

const DAY = 86_400_000;

function idSeed(id: string): number {
  const n = Number(id.replace(/\D/g, "")) || 1;
  return n * 7919;
}

function digits(rng: () => number, count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) out += Math.floor(rng() * 10);
  return out;
}

function fullEmail(displayName: string, maskedEmail: string | null): string {
  const domain = maskedEmail?.split("@")[1] ?? "example.com";
  const parts = displayName.toLowerCase().split(" ");
  const first = parts[0] ?? "customer";
  const last = parts[1] ?? "user";
  return `${first}.${last}@${domain}`;
}

/** Which identifier types a profile carries, in canonical display order. */
function identifierTypesFor(item: CustomerListItem): IdentifierType[] {
  const types: IdentifierType[] = [];
  if (item.channels.includes("web") || item.channels.includes("chat"))
    types.push("cookie_id");
  if (item.channels.includes("mobile")) types.push("device_id");
  if (!item.isAnonymous) types.push("email");
  if (item.channels.includes("call_center")) types.push("phone");
  if (item.channels.includes("in_store")) types.push("loyalty_id");
  if (!item.isAnonymous) types.push("name");
  // Guarantee at least one identifier.
  if (types.length === 0) types.push("cookie_id");
  return types;
}

/** Source channel for an identifier, drawn from the customer's own channels. */
function sourceChannelFor(type: IdentifierType, channels: Channel[]): Channel {
  const has = (c: Channel) => channels.includes(c);
  switch (type) {
    case "device_id":
      return "mobile";
    case "phone":
      return "call_center";
    case "loyalty_id":
      return "in_store";
    case "cookie_id":
      return has("web") ? "web" : "chat";
    case "email":
      return has("email")
        ? "email"
        : has("web")
          ? "web"
          : has("mobile")
            ? "mobile"
            : channels[0];
    case "name":
    default:
      return channels[0];
  }
}

function weakestLinkFor(item: CustomerListItem): {
  type: IdentifierType | null;
  explanation: string;
} {
  const conf = item.identityConfidence;
  if (item.isAnonymous)
    return {
      type: item.channels.includes("web") ? "cookie_id" : "device_id",
      explanation: "Anonymous — no strong identifier resolved yet.",
    };
  if (conf >= 0.95)
    return {
      type: null,
      explanation: "All identifiers matched on strong deterministic evidence.",
    };
  if (conf >= 0.8)
    return {
      type: "email",
      explanation:
        "Email bridged to an anonymous web session via same-session continuity.",
    };
  return {
    type: item.channels.includes("mobile") ? "device_id" : "email",
    explanation:
      "Shared device with a near-match name (low-confidence probabilistic).",
  };
}

function churnSignalsFor(
  item: CustomerListItem,
  silenceDays: number,
  repeatCount: number,
): ChurnSignal[] {
  const signals: ChurnSignal[] = [];
  if (item.churnRisk === "high") {
    if (item.patterns.includes("escalation"))
      signals.push({
        rule: "escalation_abandonment",
        evidence: `Escalation, then ${silenceDays} days of silence.`,
      });
    if (repeatCount >= 3)
      signals.push({
        rule: "repeated_frustration",
        evidence: `${repeatCount} repeat contacts within 30 days.`,
      });
    if (signals.length === 0)
      signals.push({
        rule: "escalation_abandonment",
        evidence: `High-risk pattern, then ${silenceDays} days of silence.`,
      });
  } else if (item.churnRisk === "medium") {
    if (item.patterns.includes("drop_off"))
      signals.push({
        rule: "process_abandonment",
        evidence: "Checkout drop-off with no purchase for 7+ days.",
      });
    if (item.patterns.includes("unresolved_issue"))
      signals.push({
        rule: "unresolved_complaint",
        evidence: "Open unresolved issue past the 7-day window.",
      });
    if (signals.length === 0)
      signals.push({
        rule: "process_abandonment",
        evidence: "Medium-risk journey pattern detected.",
      });
  }
  return signals;
}

export function getMockCustomerById(
  id: string,
  asOf: Date,
): CustomerDetail | null {
  const item = buildPopulation(asOf).find((c) => c.id === id);
  if (!item) return null;

  const rng = mulberry32(idSeed(id));
  const lastSeen = new Date(item.lastActiveIso);
  const activeDurationDays = 12 + Math.floor(rng() * 80);
  const firstSeen = new Date(lastSeen.getTime() - activeDurationDays * DAY);
  const silenceDays = Math.max(
    0,
    Math.floor((asOf.getTime() - lastSeen.getTime()) / DAY),
  );

  const weak = weakestLinkFor(item);
  const types = identifierTypesFor(item);

  const identifiers: CustomerIdentifier[] = types.map((type, index) => {
    const isWeak = weak.type === type;
    const isOrigin = index === 0;
    let value: string;
    switch (type) {
      case "email":
        value = fullEmail(item.displayName ?? "anon user", item.maskedEmail);
        break;
      case "phone":
        value = `+91 9${digits(rng, 4)} ${digits(rng, 5)}`;
        break;
      case "loyalty_id":
        value = `LYL-${digits(rng, 5)}`;
        break;
      case "device_id":
        value = `dev_${id.slice(5)}_${digits(rng, 3)}`;
        break;
      case "name":
        value = item.displayName ?? "Unknown";
        break;
      default:
        value = `ck_${id.slice(5)}_${digits(rng, 4)}`;
    }

    let linkMethod: LinkMethod;
    let linkConfidence: number;
    if (isWeak) {
      linkMethod = isOrigin ? "origin" : "probabilistic";
      linkConfidence = item.identityConfidence;
    } else if (isOrigin) {
      linkMethod = "origin";
      linkConfidence = 1.0;
    } else if (type === "name") {
      linkMethod = "probabilistic";
      linkConfidence = 1.0;
    } else {
      linkMethod = "deterministic";
      linkConfidence = 1.0;
    }

    return {
      type,
      value,
      sourceChannel: sourceChannelFor(type, item.channels),
      linkMethod,
      linkConfidence,
      firstSeenIso: new Date(
        firstSeen.getTime() + index * Math.floor(rng() * 3) * DAY,
      ).toISOString(),
    };
  });

  const identityConfidence = identifiers.reduce(
    (min, i) => Math.min(min, i.linkConfidence),
    1,
  );

  const repeatCount = item.patterns.includes("repeat_contact")
    ? 2 + Math.floor(rng() * 2)
    : 0;
  const patternCounts: Record<CustomerPattern, number> = {
    drop_off: item.patterns.includes("drop_off") ? 1 : 0,
    escalation: item.patterns.includes("escalation") ? 1 : 0,
    repeat_contact: repeatCount,
    unresolved_issue: item.patterns.includes("unresolved_issue") ? 1 : 0,
  };

  const hasConflict = !item.isAnonymous && idSeed(id) % 97 === 0;

  return {
    id: item.id,
    displayName: item.displayName,
    isAnonymous: item.isAnonymous,
    channels: item.channels,
    eventCount: item.eventCount,
    firstSeenIso: firstSeen.toISOString(),
    lastSeenIso: lastSeen.toISOString(),
    activeDurationDays,
    silenceDays,
    identityConfidence,
    weakestLink: { confidence: identityConfidence, explanation: weak.explanation },
    identifiers,
    hasConflict,
    churnRisk: item.churnRisk,
    churnSignals: churnSignalsFor(item, silenceDays, repeatCount),
    patternCounts,
    asOfIso: asOf.toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Journey generator (S-04). Builds a coherent, deterministic event
 * stream for a customer that visibly carries their channels and detected
 * patterns, then computes sessions/journeys/transitions (SoT §4.7).
 * ------------------------------------------------------------------ */

const CATEGORY_OF: Record<string, EventCategory> = {
  page_view: "browse",
  product_view: "browse",
  search: "browse",
  category_view: "browse",
  add_to_cart: "commerce",
  checkout_start: "commerce",
  payment_attempt: "commerce",
  purchase_complete: "commerce",
  store_visit: "in_store",
  pos_transaction: "in_store",
  loyalty_scan: "in_store",
  return_processed: "in_store",
  login: "account",
  call_started: "support",
  call_ended: "support",
  ticket_created: "support",
  ticket_resolved: "support",
  chat_started: "support",
  chat_ended: "support",
  email_sent: "support",
  email_campaign_opened: "engagement",
};

const BROWSE_TYPES: Partial<Record<Channel, string[]>> = {
  web: ["page_view", "product_view", "search", "category_view"],
  mobile: ["page_view", "product_view"],
  email: ["email_campaign_opened"],
  in_store: ["store_visit"],
};

const SUPPORT_START: Partial<Record<Channel, string>> = {
  call_center: "call_started",
  chat: "chat_started",
  email: "ticket_created",
};

/** Minor browse types that the timeline may group into a single node. */
export const MINOR_BROWSE_TYPES = new Set([
  "page_view",
  "product_view",
  "search",
  "category_view",
  "email_campaign_opened",
]);

interface PlanStep {
  channel: Channel;
  type: string;
  patterns?: JourneyEventPattern[];
}

/** Channel effort tiers (SoT §4.8) — an escalation is a lower→higher tier move. */
const CHANNEL_TIER: Record<Channel, number> = {
  web: 1,
  mobile: 1,
  email: 2,
  chat: 2,
  call_center: 3,
  in_store: 4,
};

function addPattern(step: PlanStep, pattern: JourneyEventPattern): void {
  (step.patterns ??= []).push(pattern);
}

function amountInr(rng: () => number): number {
  return (5 + Math.floor(rng() * 120)) * 49; // ₹245 – ₹6,076-ish
}

function summarizeAndDetail(
  step: PlanStep,
  rng: () => number,
): { summary: string; metadata: { label: string; value: string }[] } {
  const t = step.type;
  const isDropAnchor = step.patterns?.some((p) => p.type === "drop_off") ?? false;
  switch (t) {
    case "page_view":
      return { summary: "Viewed a page", metadata: [{ label: "page_url", value: "/products" }] };
    case "product_view":
      return {
        summary: "Viewed a product",
        metadata: [{ label: "product_id", value: `SKU-${1000 + Math.floor(rng() * 8999)}` }],
      };
    case "search":
      return { summary: "Ran a search", metadata: [{ label: "query", value: "running shoes" }] };
    case "category_view":
      return { summary: "Browsed a category", metadata: [{ label: "category", value: "Footwear" }] };
    case "login":
      return { summary: "Logged in", metadata: [{ label: "method", value: "password" }] };
    case "add_to_cart": {
      const a = amountInr(rng);
      return { summary: `Added to cart · ₹${a.toLocaleString("en-IN")}`, metadata: [{ label: "amount", value: `₹${a.toLocaleString("en-IN")}` }] };
    }
    case "checkout_start": {
      const a = amountInr(rng);
      return { summary: `Started checkout · ₹${a.toLocaleString("en-IN")}`, metadata: [{ label: "cart_value", value: `₹${a.toLocaleString("en-IN")}` }] };
    }
    case "payment_attempt": {
      const a = amountInr(rng);
      return isDropAnchor
        ? {
            summary: `Payment declined · ₹${a.toLocaleString("en-IN")}`,
            metadata: [
              { label: "amount", value: `₹${a.toLocaleString("en-IN")}` },
              { label: "error_code", value: "card_declined" },
              { label: "payment_method", value: "credit_card" },
            ],
          }
        : {
            summary: `Payment · ₹${a.toLocaleString("en-IN")}`,
            metadata: [{ label: "amount", value: `₹${a.toLocaleString("en-IN")}` }],
          };
    }
    case "purchase_complete": {
      const a = amountInr(rng);
      return { summary: `Purchase complete · ₹${a.toLocaleString("en-IN")}`, metadata: [{ label: "amount", value: `₹${a.toLocaleString("en-IN")}` }] };
    }
    case "call_started":
      return {
        summary: "Call started",
        metadata: [
          { label: "reason", value: "payment_failure" },
          { label: "wait_seconds", value: String(60 + Math.floor(rng() * 300)) },
        ],
      };
    case "call_ended":
      return { summary: "Call ended", metadata: [{ label: "disposition", value: step.patterns?.length ? "unresolved" : "pending" }] };
    case "chat_started":
      return { summary: "Chat started", metadata: [{ label: "topic", value: "order_help" }] };
    case "chat_ended":
      return { summary: "Chat ended", metadata: [{ label: "disposition", value: "pending" }] };
    case "ticket_created":
      return {
        summary: "Support ticket opened",
        metadata: [
          { label: "ticket_id", value: `TKT-${1000 + Math.floor(rng() * 8999)}` },
          { label: "reason", value: "order_issue" },
          { label: "status", value: "open" },
        ],
      };
    case "ticket_resolved":
      return { summary: "Ticket resolved", metadata: [{ label: "status", value: "resolved" }] };
    case "email_sent":
      return { summary: "Support email sent", metadata: [{ label: "reason", value: "order_issue" }] };
    case "email_campaign_opened":
      return { summary: "Opened a campaign email", metadata: [{ label: "campaign", value: "autumn_sale" }] };
    case "store_visit":
      return { summary: "Visited a store", metadata: [{ label: "store", value: "Ahmedabad One" }] };
    case "pos_transaction": {
      const a = amountInr(rng);
      return { summary: `In-store purchase · ₹${a.toLocaleString("en-IN")}`, metadata: [{ label: "amount", value: `₹${a.toLocaleString("en-IN")}` }] };
    }
    case "loyalty_scan":
      return { summary: "Loyalty card scanned", metadata: [{ label: "points", value: String(10 + Math.floor(rng() * 90)) }] };
    case "return_processed":
      return { summary: "Return processed", metadata: [{ label: "status", value: "refunded" }] };
    default:
      return { summary: t.replace(/_/g, " "), metadata: [] };
  }
}

function resolutionFor(
  step: PlanStep,
  index: number,
  customer: CustomerDetail,
): JourneyEvent["resolution"] {
  if (index === 0) {
    return {
      method: "origin",
      confidence: customer.isAnonymous ? customer.identityConfidence : 1.0,
      evidence: [`New profile created from ${CHANNEL_LABEL[step.channel]} activity`],
    };
  }
  if (step.type === "login" && !customer.isAnonymous && customer.identityConfidence < 1) {
    return {
      method: "probabilistic",
      confidence: customer.identityConfidence,
      evidence: [
        "Same-session cookie continuity (+0.50)",
        "Login supplied email — bridged to the anonymous session",
      ],
    };
  }
  const strong =
    CATEGORY_OF[step.type] === "support" || CATEGORY_OF[step.type] === "in_store";
  return {
    method: "deterministic",
    confidence: 1.0,
    evidence: [strong ? "Exact match on a strong identifier" : "Linked via an existing identifier"],
  };
}

export function getMockCustomerJourney(
  customer: CustomerDetail,
  asOf: Date,
): CustomerJourney {
  const rng = mulberry32(idSeed(customer.id) + 101);
  const channels = customer.channels;
  const target = customer.eventCount;
  const commerceCh = channels.find((c) => c === "web" || c === "mobile") ?? null;
  const browseCh =
    commerceCh ?? channels.find((c) => BROWSE_TYPES[c]) ?? channels[0];
  const supportCh = channels.find((c) => SUPPORT_START[c]) ?? null;

  const steps: PlanStep[] = [];
  let groupSeq = 0;
  const newGroup = () => `${customer.id}-g${groupSeq++}`;
  const pushBrowse = (ch: Channel) => {
    const pool = BROWSE_TYPES[ch] ?? ["page_view"];
    steps.push({ channel: ch, type: pool[Math.floor(rng() * pool.length)] });
  };

  // Opening browse.
  pushBrowse(browseCh);
  pushBrowse(browseCh);
  if (!customer.isAnonymous && commerceCh)
    steps.push({ channel: commerceCh, type: "login" });

  // Drop-off: checkout that never completes.
  if (customer.patternCounts.drop_off > 0) {
    const ch = commerceCh ?? browseCh;
    const g = newGroup();
    steps.push({ channel: ch, type: "add_to_cart" });
    steps.push({ channel: ch, type: "checkout_start" });
    steps.push({
      channel: ch,
      type: "payment_attempt",
      patterns: [
        {
          type: "drop_off",
          role: "anchor",
          groupId: g,
          label: "Checkout drop-off",
          detail: "Checkout started but no purchase completed within 2 hours.",
        },
      ],
    });
  }

  // Escalation: a lower-tier self-service attempt immediately followed by an
  // assisted contact (kept adjacent so they fall inside the 48h window).
  if (customer.patternCounts.escalation > 0 && supportCh) {
    const g = newGroup();
    const lowerCh =
      channels.find(
        (c) => c !== supportCh && CHANNEL_TIER[c] < CHANNEL_TIER[supportCh],
      ) ?? null;

    if (lowerCh) {
      const srcType = BROWSE_TYPES[lowerCh]?.[0] ?? "page_view";
      steps.push({
        channel: lowerCh,
        type: srcType,
        patterns: [
          {
            type: "escalation",
            role: "related",
            groupId: g,
            label: "Escalation source",
            detail: `Self-service attempt on ${CHANNEL_LABEL[lowerCh]} before escalating.`,
          },
        ],
      });
    }
    steps.push({
      channel: supportCh,
      type: SUPPORT_START[supportCh]!,
      patterns: [
        {
          type: "escalation",
          role: "anchor",
          groupId: g,
          label: lowerCh
            ? `Escalation · ${CHANNEL_LABEL[lowerCh]} → ${CHANNEL_LABEL[supportCh]}`
            : "Escalation",
          detail: lowerCh
            ? `Escalated from ${CHANNEL_LABEL[lowerCh]} to ${CHANNEL_LABEL[supportCh]} within 48 hours.`
            : `Escalated to ${CHANNEL_LABEL[supportCh]} support.`,
        },
      ],
    });
    if (supportCh === "call_center")
      steps.push({ channel: supportCh, type: "call_ended" });
  }

  // Unresolved issue: a ticket that is never resolved.
  if (customer.patternCounts.unresolved_issue > 0) {
    const ch = supportCh === "email" ? "email" : supportCh ?? channels[0];
    const g = newGroup();
    steps.push({
      channel: ch,
      type: "ticket_created",
      patterns: [
        {
          type: "unresolved_issue",
          role: "anchor",
          groupId: g,
          label: "Unresolved issue",
          detail: "Support ticket still open past the 7-day window.",
        },
      ],
    });
  }

  // Repeat contact: a later cluster of support contacts.
  if (customer.patternCounts.repeat_contact >= 1 && supportCh) {
    const g = newGroup();
    const contacts = customer.patternCounts.repeat_contact + 1;
    const first = steps.find((s) => CATEGORY_OF[s.type] === "support");
    if (first) {
      addPattern(first, {
        type: "repeat_contact",
        role: "anchor",
        groupId: g,
        label: "Repeat contact",
        detail: `${contacts} support contacts within 7 days.`,
      });
    }
    const extra = Math.max(1, customer.patternCounts.repeat_contact);
    for (let k = 0; k < extra; k++) {
      steps.push({
        channel: supportCh,
        type: SUPPORT_START[supportCh]!,
        patterns: [
          {
            type: "repeat_contact",
            role: "related",
            groupId: g,
            label: `Contact ${k + 2} of ${contacts}`,
            detail: "Follow-up contact about the same issue.",
          },
        ],
      });
    }
  }

  // Pad with browse/engagement to reach the target count.
  let guard = 0;
  while (steps.length < target && guard++ < target + 50) {
    pushBrowse(channels[Math.floor(rng() * channels.length)]);
  }
  // Trim excess, keeping pattern-tagged steps.
  if (steps.length > target) {
    for (let i = steps.length - 1; i >= 0 && steps.length > target; i--) {
      if (!steps[i].patterns) steps.splice(i, 1);
    }
  }

  // Timestamps spanning [firstSeen, lastSeen]. Journey breaks (multi-day gaps)
  // are placed periodically but never between a pattern group's members (an
  // escalation source must stay with its contact), so patterns read coherently.
  const firstSeen = new Date(customer.firstSeenIso).getTime();
  const lastSeen = new Date(customer.lastSeenIso).getTime();
  const activeMs = Math.max(DAY, lastSeen - firstSeen);
  const n = steps.length;

  const journeyEvery = Math.max(2, Math.ceil(n / 3));
  const breakBefore = new Array<boolean>(n).fill(false);
  let sinceBreak = 0;
  for (let i = 1; i < n; i++) {
    sinceBreak += 1;
    const keepTogether = Boolean(
      steps[i - 1].patterns?.some((p) => p.role === "related") &&
        steps[i].patterns?.some((p) => p.role === "anchor"),
    );
    if (!keepTogether && sinceBreak >= journeyEvery) {
      breakBefore[i] = true;
      sinceBreak = 0;
    }
  }
  const totalBreaks = breakBefore.filter(Boolean).length;
  const dayPerBreak = totalBreaks > 0 ? activeMs / totalBreaks : 0;

  const events: JourneyEvent[] = [];
  let prevTime: number | null = null;
  let prevChannel: Channel | null = null;
  let sessionIndex = -1;
  let journeyIndex = -1;
  let t = firstSeen;

  for (let i = 0; i < n; i++) {
    const step = steps[i];
    if (i === 0) t = firstSeen;
    else if (breakBefore[i])
      t += Math.round(dayPerBreak * (0.85 + rng() * 0.3));
    else t += (4 + Math.floor(rng() * 30)) * 60_000;
    if (i === n - 1) t = Math.max(lastSeen, (prevTime ?? lastSeen) + 60_000);
    if (prevTime !== null && t <= prevTime) t = prevTime + 60_000;

    const gapMinutes =
      prevTime === null ? 0 : Math.round((t - prevTime) / 60_000);
    const isJourneyStart = i === 0 || gapMinutes > 24 * 60;
    const isTransition = prevChannel !== null && step.channel !== prevChannel;
    const isSessionStart = i === 0 || gapMinutes > 30 || isTransition;
    if (isJourneyStart) journeyIndex += 1;
    if (isSessionStart) sessionIndex += 1;

    const { summary, metadata } = summarizeAndDetail(step, rng);

    events.push({
      id: `${customer.id}-e${(i + 1).toString().padStart(3, "0")}`,
      timestampIso: new Date(t).toISOString(),
      channel: step.channel,
      eventType: step.type,
      eventCategory: CATEGORY_OF[step.type] ?? "unknown",
      summary,
      metadata,
      resolution: resolutionFor(step, i, customer),
      sessionIndex,
      journeyIndex,
      isSessionStart,
      isJourneyStart,
      isTransition,
      transitionFrom: isTransition ? prevChannel : null,
      gapMinutes,
      patterns: step.patterns ?? [],
    });

    prevTime = t;
    prevChannel = step.channel;
  }

  return {
    id: customer.id,
    displayName: customer.displayName,
    isAnonymous: customer.isAnonymous,
    events,
    channels,
    totalEvents: events.length,
    journeyCount: journeyIndex + 1,
    sessionCount: sessionIndex + 1,
    silenceDays: customer.silenceDays,
    churnRisk: customer.churnRisk,
    asOfIso: asOf.toISOString(),
  };
}
