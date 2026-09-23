import type { RawEvent } from "@/lib/pipeline/types";
import type { Channel } from "@/lib/types/domain";

/**
 * Deterministic synthetic population generator (SoT §7.5). Produces ~300
 * customers over the 90 days before `asOf`, across all six channels, with the
 * situations the resolver and detectors are supposed to handle:
 *
 *   - anonymous browsers who never log in
 *   - logins that bridge a cookie to an email mid-session
 *   - households sharing one device (so the contradiction filter fires)
 *   - deliberate strong-identifier conflicts
 *   - near-miss names, for the Jaro-Winkler path
 *   - card-decline checkout journeys that lead to support and churn
 *
 * The generator emits *events only*. Every profile, identifier, pattern and
 * churn signal in the database is produced by the pipeline from these events —
 * nothing here writes a conclusion.
 */

/** mulberry32 — small, fast, and identical across runs for a given seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Ishita", "Kabir", "Meera",
  "Rohan", "Saanvi", "Aditya", "Kavya", "Nikhil", "Tara", "Yash", "Riya",
  "Dev", "Neha", "Karan", "Pooja", "Siddharth", "Anjali", "Vikram", "Sneha",
];
const LAST_NAMES = [
  "Sharma", "Patel", "Kumar", "Reddy", "Nair", "Iyer", "Desai", "Mehta",
  "Gupta", "Singh", "Joshi", "Rao", "Chauhan", "Verma", "Banerjee", "Shah",
];
const PRODUCTS = [
  { sku: "SKU-1101", name: "Running Shoes Pro", price: 4999 },
  { sku: "SKU-2204", name: "Trail Jacket", price: 6499 },
  { sku: "SKU-3307", name: "Yoga Mat Elite", price: 1899 },
  { sku: "SKU-4410", name: "Smart Water Bottle", price: 1299 },
  { sku: "SKU-5513", name: "Training Shorts", price: 2199 },
];
const DECLINE_REASONS = [
  "card_declined",
  "otp_timeout",
  "insufficient_funds",
  "address_validation_failed",
];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface Person {
  name: string;
  email: string;
  phone: string;
  cookie: string;
  device: string;
  loyalty: string;
}

function makePerson(random: () => number, index: number): Person {
  const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
  const slug = `${first}.${last}`.toLowerCase();
  return {
    name: `${first} ${last}`,
    email: `${slug}.${index}@example.in`,
    phone: `+9198${String(10_000_000 + Math.floor(random() * 89_999_999))}`,
    cookie: `ck_${index}_${Math.floor(random() * 1e6).toString(36)}`,
    device: `dev_${index}_${Math.floor(random() * 1e6).toString(36)}`,
    loyalty: `LYL-${String(index).padStart(5, "0")}`,
  };
}

interface Ctx {
  random: () => number;
  asOf: Date;
  seq: { n: number };
}

function event(
  ctx: Ctx,
  channel: Channel,
  eventType: string,
  at: number,
  identifiers: RawEvent["identifiers"],
  metadata: Record<string, unknown> = {},
): RawEvent {
  ctx.seq.n += 1;
  return {
    event_id: `gen-${ctx.seq.n}`,
    channel,
    event_type: eventType,
    timestamp: new Date(at).toISOString(),
    identifiers,
    metadata,
  };
}

function pick<T>(random: () => number, items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** A browsing session on web, keyed by cookie only. */
function browseSession(ctx: Ctx, person: Person, start: number, steps: number): RawEvent[] {
  const out: RawEvent[] = [];
  const product = pick(ctx.random, PRODUCTS);
  let t = start;
  out.push(event(ctx, "web", "page_view", t, { cookie_id: person.cookie }, { path: "/" }));
  for (let i = 0; i < steps; i += 1) {
    t += (2 + Math.floor(ctx.random() * 8)) * MINUTE;
    out.push(
      event(ctx, "web", i % 2 === 0 ? "product_view" : "search", t, { cookie_id: person.cookie }, {
        sku: product.sku,
        product: product.name,
      }),
    );
  }
  return out;
}

/**
 * A recent, logged-in browsing session. The identifiers carry the email, so
 * this resolves deterministically onto the existing profile — a cookie alone,
 * days later, would correctly be treated as a new anonymous visitor.
 */
function recentBrowse(ctx: Ctx, person: Person, start: number, steps: number): RawEvent[] {
  const product = pick(ctx.random, PRODUCTS);
  const out: RawEvent[] = [
    event(ctx, "web", "login", start, {
      cookie_id: person.cookie,
      email: person.email,
      name: person.name,
    }, { method: "session" }),
  ];
  let t = start;
  for (let i = 0; i < steps; i += 1) {
    t += (3 + Math.floor(ctx.random() * 7)) * MINUTE;
    out.push(
      event(ctx, "web", "product_view", t, { cookie_id: person.cookie, email: person.email }, {
        sku: product.sku,
        product: product.name,
      }),
    );
  }
  return out;
}

/** Web login: the moment an anonymous cookie becomes a known person. */
function login(ctx: Ctx, person: Person, at: number): RawEvent {
  return event(
    ctx,
    "web",
    "login",
    at,
    { cookie_id: person.cookie, email: person.email, name: person.name },
    { method: "password" },
  );
}

/** Checkout that fails and is never completed — the drop-off archetype. */
function failedCheckout(ctx: Ctx, person: Person, start: number): RawEvent[] {
  const product = pick(ctx.random, PRODUCTS);
  const reason = pick(ctx.random, DECLINE_REASONS);
  return [
    event(ctx, "web", "add_to_cart", start, { cookie_id: person.cookie, email: person.email }, {
      sku: product.sku,
      cart_value: product.price,
    }),
    event(ctx, "web", "checkout_start", start + 4 * MINUTE, {
      cookie_id: person.cookie,
      email: person.email,
    }, { sku: product.sku, cart_value: product.price }),
    event(ctx, "web", "payment_attempt", start + 8 * MINUTE, {
      cookie_id: person.cookie,
      email: person.email,
    }, { error_code: reason, cart_value: product.price }),
  ];
}

function successfulCheckout(ctx: Ctx, person: Person, start: number): RawEvent[] {
  const product = pick(ctx.random, PRODUCTS);
  return [
    event(ctx, "web", "add_to_cart", start, { cookie_id: person.cookie, email: person.email }, {
      sku: product.sku,
      cart_value: product.price,
    }),
    event(ctx, "web", "checkout_start", start + 3 * MINUTE, {
      cookie_id: person.cookie,
      email: person.email,
    }, { sku: product.sku, cart_value: product.price }),
    event(ctx, "web", "purchase_complete", start + 9 * MINUTE, {
      cookie_id: person.cookie,
      email: person.email,
    }, { sku: product.sku, order_value: product.price }),
  ];
}

/** A support episode; `resolve` decides whether the ticket is ever closed. */
function supportEpisode(
  ctx: Ctx,
  person: Person,
  start: number,
  channel: Channel,
  ticketId: string,
  resolve: boolean,
): RawEvent[] {
  const out: RawEvent[] = [];
  const reason = pick(ctx.random, ["payment_failure", "delivery_delay", "return_refund", "product_issue"]);
  if (channel === "call_center") {
    out.push(event(ctx, channel, "call_started", start, { phone: person.phone, email: person.email }, {
      reason,
      wait_seconds: 60 + Math.floor(ctx.random() * 400),
    }));
    out.push(event(ctx, channel, "ticket_created", start + 8 * MINUTE, { phone: person.phone }, {
      ticket_id: ticketId,
      reason,
    }));
    out.push(event(ctx, channel, "call_ended", start + 12 * MINUTE, { phone: person.phone }, {
      disposition: resolve ? "resolved" : "pending",
      ticket_id: ticketId,
    }));
  } else {
    out.push(event(ctx, channel, channel === "chat" ? "chat_started" : "email_sent", start, {
      email: person.email,
    }, { reason, ticket_id: ticketId }));
    out.push(event(ctx, channel, "ticket_created", start + 5 * MINUTE, { email: person.email }, {
      ticket_id: ticketId,
      reason,
    }));
  }
  if (resolve) {
    out.push(
      event(ctx, "email", "ticket_resolved", start + 2 * DAY, { email: person.email }, {
        ticket_id: ticketId,
        resolution: "refunded",
      }),
    );
  }
  return out;
}

export interface GeneratedPopulation {
  events: RawEvent[];
  /** Counts the seeder prints; the *outcomes* are the pipeline's to decide. */
  stats: {
    people: number;
    anonymousOnly: number;
    sharedDevices: number;
    plantedConflicts: number;
  };
}

/**
 * Builds the synthetic population. `count` people over the 90 days before
 * `asOf`. Everything is derived from `seed`, so two runs produce identical
 * data and the demo numbers stay stable.
 */
export function generatePopulation(
  asOf: Date,
  count = 300,
  seed = 20260922,
): GeneratedPopulation {
  const random = rng(seed);
  const ctx: Ctx = { random, asOf, seq: { n: 0 } };
  const events: RawEvent[] = [];
  const windowStart = asOf.getTime() - 90 * DAY;

  let anonymousOnly = 0;
  let sharedDevices = 0;
  let plantedConflicts = 0;

  const people: Person[] = [];
  /** People who logged in, so they own an email — conflicts need two of these. */
  const knownPeople: Person[] = [];
  /** People still active recently, so churn risk is not uniformly high. */
  const recentTail: { person: Person; kind: "browse" | "buy" }[] = [];

  for (let i = 0; i < count; i += 1) {
    const person = makePerson(random, i);
    people.push(person);
    const start = windowStart + Math.floor(random() * 70 * DAY);
    const roll = random();

    if (roll < 0.1) {
      /* Anonymous browser: a cookie and nothing else, so the profile stays
         anonymous and identity confidence comes only from its origin link. */
      anonymousOnly += 1;
      events.push(...browseSession(ctx, person, start, 2 + Math.floor(random() * 4)));
      if (random() < 0.4) {
        events.push(...browseSession(ctx, person, start + 3 * DAY, 2));
      }
      continue;
    }

    /* Everyone else browses, logs in, and then follows an archetype. */
    knownPeople.push(person);
    events.push(...browseSession(ctx, person, start, 1 + Math.floor(random() * 3)));
    events.push(login(ctx, person, start + 20 * MINUTE));

    // Roughly half of the population is still active in the last fortnight.
    // Without this, every customer looks silent and the churn rules that key
    // on silence (R2, R3) would fire for almost everyone.
    if (random() < 0.45) {
      recentTail.push({ person, kind: random() < 0.45 ? "buy" : "browse" });
    }

    if (roll < 0.42) {
      /* Frustrated shopper: declined payment, support, often no recovery. */
      const checkoutAt = start + 30 * MINUTE;
      events.push(...failedCheckout(ctx, person, checkoutAt));
      if (random() < 0.7) {
        events.push(
          event(ctx, "mobile", "login", checkoutAt + 50 * MINUTE, {
            device_id: person.device,
            email: person.email,
          }, { app_version: "4.2.1" }),
          event(ctx, "mobile", "payment_attempt", checkoutAt + 55 * MINUTE, {
            device_id: person.device,
            email: person.email,
          }, { error_code: pick(random, DECLINE_REASONS) }),
        );
      }
      const resolved = random() < 0.35;
      events.push(
        ...supportEpisode(ctx, person, checkoutAt + 3 * HOUR, "call_center", `TKT-${9000 + i}`, resolved),
      );
      if (!resolved && random() < 0.6) {
        // Comes back days later, still unresolved — a repeat contact.
        events.push(
          ...supportEpisode(ctx, person, checkoutAt + 3 * DAY, "call_center", `TKT-${9000 + i}`, false),
        );
      }
      if (resolved && random() < 0.5) {
        events.push(...successfulCheckout(ctx, person, checkoutAt + 5 * DAY));
      }
      continue;
    }

    if (roll < 0.68) {
      /* Happy buyer: browses, buys, occasionally comes back. */
      events.push(...successfulCheckout(ctx, person, start + 35 * MINUTE));
      if (random() < 0.5) {
        events.push(
          event(ctx, "email", "email_campaign_opened", start + 10 * DAY, { email: person.email }, {
            campaign: "autumn_sale",
          }),
        );
      }
      if (random() < 0.4) {
        events.push(...successfulCheckout(ctx, person, asOf.getTime() - Math.floor(random() * 10 * DAY)));
      }
      continue;
    }

    if (roll < 0.8) {
      /* Support loop, resolved in store: escalation without churn. */
      const ticket = `TKT-${7000 + i}`;
      events.push(...supportEpisode(ctx, person, start + 1 * DAY, "email", ticket, false));
      events.push(
        event(ctx, "chat", "chat_started", start + 3 * DAY, { email: person.email }, {
          ticket_id: ticket,
          reason: "return_status",
        }),
        event(ctx, "in_store", "store_visit", start + 4 * DAY, {
          loyalty_id: person.loyalty,
          phone: person.phone,
          email: person.email,
        }, { purpose: "return", store: "Ahmedabad-01" }),
        event(ctx, "in_store", "return_processed", start + 4 * DAY + 20 * MINUTE, {
          loyalty_id: person.loyalty,
        }, { ticket_id: ticket, refund_value: 2499 }),
        event(ctx, "email", "ticket_resolved", start + 4 * DAY + 30 * MINUTE, {
          email: person.email,
        }, { ticket_id: ticket, resolution: "refunded" }),
      );
      if (random() < 0.6) {
        events.push(...successfulCheckout(ctx, person, asOf.getTime() - Math.floor(random() * 6 * DAY)));
      }
      continue;
    }

    if (roll < 0.9) {
      /* Repeat contacter: three or more separate contacts in a month. */
      const ticket = `TKT-${6000 + i}`;
      events.push(...supportEpisode(ctx, person, start + 1 * DAY, "chat", ticket, false));
      events.push(...supportEpisode(ctx, person, start + 5 * DAY, "call_center", ticket, false));
      events.push(...supportEpisode(ctx, person, start + 11 * DAY, "call_center", ticket, random() < 0.3));
      continue;
    }

    /* Onboarding dropout: signs up and never does anything else. */
    events.push(
      event(ctx, "mobile", "signup", start + 25 * MINUTE, {
        device_id: person.device,
        email: person.email,
        name: person.name,
      }, { source: "app_store" }),
    );
  }

  /* -------- Shared-device households -------- */
  // Two people on one tablet: the contradiction filter must keep them apart
  // because each owns a different email.
  for (let i = 0; i < 6 && i * 2 + 1 < people.length; i += 1) {
    const [a, b] = [people[i * 2], people[i * 2 + 1]];
    const sharedDevice = `dev_household_${i}`;
    const at = windowStart + Math.floor(random() * 60 * DAY);
    sharedDevices += 1;
    events.push(
      event(ctx, "mobile", "login", at, { device_id: sharedDevice, email: a.email }, {
        household: true,
      }),
      event(ctx, "mobile", "product_view", at + 20 * MINUTE, { device_id: sharedDevice }, {}),
      event(ctx, "mobile", "login", at + 3 * HOUR, { device_id: sharedDevice, email: b.email }, {
        household: true,
      }),
    );
  }

  /* -------- Deliberate strong-identifier conflicts -------- */
  // A support agent types the wrong number against an existing email: two
  // profiles each own one strong identifier, and one event carries both.
  for (let i = 0; i < 3 && i * 2 + 1 < knownPeople.length; i += 1) {
    const a = knownPeople[i * 2];
    const b = knownPeople[knownPeople.length - 1 - i * 2];
    const at = asOf.getTime() - (20 + i * 3) * DAY;
    plantedConflicts += 1;
    events.push(
      event(ctx, "chat", "chat_started", at, { email: a.email, phone: b.phone }, {
        reason: "mis_keyed_contact",
      }),
    );
  }

  /* -------- Near-miss names on a shared device -------- */
  // "Prya" vs "Priya": close enough for the name signal, on top of a device
  // match, to reach the probabilistic threshold.
  for (let i = 0; i < 4 && i + 30 < people.length; i += 1) {
    const person = people[i + 30];
    const typo = person.name.replace(/^(\w)(\w)/, "$1");
    const at = asOf.getTime() - (30 + i) * DAY;
    events.push(
      event(ctx, "mobile", "login", at, {
        device_id: person.device,
        name: person.name,
      }, {}),
      event(ctx, "mobile", "product_view", at + 2 * DAY, {
        device_id: person.device,
        name: typo,
      }, {}),
    );
  }

  /* -------- Recent activity -------- */
  for (const { person, kind } of recentTail) {
    const at = asOf.getTime() - Math.floor(random() * 13 * DAY) - 2 * HOUR;
    if (kind === "buy") {
      events.push(...successfulCheckout(ctx, person, at));
    } else {
      events.push(...recentBrowse(ctx, person, at, 1 + Math.floor(random() * 3)));
    }
  }

  // Chronological arrival makes the seeded history realistic; the pipeline
  // handles out-of-order events too (see the late-arrival test).
  events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  return {
    events,
    stats: { people: people.length, anonymousOnly, sharedDevices, plantedConflicts },
  };
}
