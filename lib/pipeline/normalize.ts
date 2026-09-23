import { createHash } from "node:crypto";

import type { IdentifierType } from "@/lib/types/customer";
import type { Channel } from "@/lib/types/domain";

import { categoryFor } from "./taxonomy";
import type {
  NormalizedEvent,
  NormalizedIdentifier,
  RawEvent,
  RawIdentifiers,
} from "./types";

/** Accepted clock skew for producer timestamps (SoT §4.5). */
export const MAX_FUTURE_SKEW_MS = 60 * 60 * 1000;

/** Default country for bare national phone numbers (SoT §4.5: E.164, IN). */
const DEFAULT_COUNTRY_CODE = "91";
const NATIONAL_NUMBER_LENGTH = 10;

export class NormalizationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "NormalizationError";
    this.field = field;
  }
}

/** `" PRIYA@Example.COM "` → `"priya@example.com"`. */
export function normalizeEmail(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value.includes("@")) return null;
  const [local, domain] = value.split("@");
  if (!local || !domain || !domain.includes(".")) return null;
  return `${local}@${domain}`;
}

/**
 * `"+91 98765 43210"` / `"098765 43210"` → `"+919876543210"`. Numbers that
 * already carry a `+` keep their country code; bare 10-digit numbers get the
 * India default; a leading trunk `0` is dropped.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (!hasPlus) {
    if (digits.length > NATIONAL_NUMBER_LENGTH && digits.startsWith("0")) {
      digits = digits.replace(/^0+/, "");
    }
    if (digits.length === NATIONAL_NUMBER_LENGTH) {
      digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
    }
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/** Loyalty and producer customer IDs are case-insensitive keys. */
export function normalizeLoyaltyId(raw: string): string | null {
  const value = raw.trim().toUpperCase().replace(/\s+/g, "");
  return value.length > 0 ? value : null;
}

/** Device and cookie IDs are opaque and case-sensitive — trim only. */
export function normalizeOpaqueId(raw: string): string | null {
  const value = raw.trim();
  return value.length > 0 ? value : null;
}

/** `"  priya   sharma "` → `"Priya Sharma"`. */
export function normalizeName(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return null;
  return value
    .split(" ")
    .map((part) =>
      part.length <= 1
        ? part.toUpperCase()
        : part[0].toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}

/**
 * Extracts and normalizes every identifier on an event. `customer_id` is a
 * producer-side customer key and is normalized into a `loyalty_id` identifier
 * so it participates in strong deterministic matching (SoT §4.6 step 1).
 * Values that cannot be normalized are dropped rather than matched on garbage.
 */
export function normalizeIdentifiers(raw: RawIdentifiers): NormalizedIdentifier[] {
  const out: NormalizedIdentifier[] = [];
  const push = (type: IdentifierType, value: string | null) => {
    if (value && !out.some((i) => i.type === type && i.value === value)) {
      out.push({ type, value });
    }
  };

  if (raw.email) push("email", normalizeEmail(raw.email));
  if (raw.phone) push("phone", normalizePhone(raw.phone));
  if (raw.loyalty_id) push("loyalty_id", normalizeLoyaltyId(raw.loyalty_id));
  if (raw.customer_id) push("loyalty_id", normalizeLoyaltyId(raw.customer_id));
  if (raw.device_id) push("device_id", normalizeOpaqueId(raw.device_id));
  if (raw.cookie_id) push("cookie_id", normalizeOpaqueId(raw.cookie_id));
  if (raw.name) push("name", normalizeName(raw.name));

  return out;
}

/** Parses a producer timestamp to UTC, rejecting unparseable or future times. */
export function normalizeTimestamp(raw: string, asOf: Date): string {
  const parsed = new Date(raw);
  const time = parsed.getTime();
  if (!Number.isFinite(time)) {
    throw new NormalizationError("timestamp", "Timestamp is not a valid date.");
  }
  if (time > asOf.getTime() + MAX_FUTURE_SKEW_MS) {
    throw new NormalizationError(
      "timestamp",
      "Timestamp is more than 1 hour in the future.",
    );
  }
  return parsed.toISOString();
}

/**
 * Deduplication key (SoT D-15). With a producer `event_id` the key is
 * `sha256(channel|source_event_id)`; otherwise it is a hash of the fully
 * normalized event, so a replayed payload collapses onto the same key while
 * two genuine page views a second apart do not.
 */
export function buildDedupKey(
  parts: Pick<
    NormalizedEvent,
    "sourceEventId" | "channel" | "eventType" | "timestampIso" | "identifiers" | "metadata"
  >,
): string {
  if (parts.sourceEventId) {
    return sha256(`${parts.channel}|${parts.sourceEventId}`);
  }
  const identifiers = [...parts.identifiers]
    .map((i) => `${i.type}=${i.value}`)
    .sort()
    .join(",");
  return sha256(
    [
      parts.channel,
      parts.eventType,
      parts.timestampIso,
      identifiers,
      canonicalJson(parts.metadata),
    ].join("|"),
  );
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Key-sorted JSON so metadata key order cannot change the dedup key. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/**
 * Stage 2 of the pipeline: a validated request becomes the canonical event
 * every later stage reads. Normalization always runs before identity matching
 * so that `" PRIYA@EXAMPLE.COM "` and `"priya@example.com"` resolve together.
 */
export function normalizeEvent(raw: RawEvent, asOf: Date): NormalizedEvent {
  const eventType = raw.event_type.trim().toLowerCase();
  const channel = raw.channel.trim().toLowerCase() as Channel;
  const timestampIso = normalizeTimestamp(raw.timestamp, asOf);
  const identifiers = normalizeIdentifiers(raw.identifiers);
  const metadata = raw.metadata ?? {};
  const sourceEventId = raw.event_id?.trim() || null;

  const base = {
    sourceEventId,
    channel,
    eventType,
    eventCategory: categoryFor(eventType),
    timestampIso,
    identifiers,
    metadata,
  };

  return {
    ...base,
    raw: raw as unknown as Record<string, unknown>,
    dedupKey: buildDedupKey(base),
  };
}

/** Masks an identifier for logs, notifications and list views (SoT D-12). */
export function maskIdentifier(type: IdentifierType, value: string): string {
  if (type === "email") {
    const [local, domain] = value.split("@");
    if (!local || !domain) return "***";
    return `${local.slice(0, 1)}***@${domain}`;
  }
  if (type === "phone") return `***${value.slice(-4)}`;
  if (type === "name") return value.slice(0, 1) + "***";
  return value.length <= 6 ? "***" : `${value.slice(0, 4)}***${value.slice(-2)}`;
}
