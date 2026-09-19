import { CHANNELS, type Channel, type ChurnRisk } from "@/lib/types/domain";
import type {
  CustomerListFilters,
  CustomerListItem,
  CustomerListResult,
  CustomerPattern,
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
