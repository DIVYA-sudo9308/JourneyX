import { z } from "zod";

import { CHANNELS } from "@/lib/types/domain";

import type { RawEvent } from "./types";

/** Batch ceiling (SoT D-20) — batches run sequentially in-process. */
export const MAX_BATCH_SIZE = 50;

const identifierValue = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .nullish()
  .transform((v) => v ?? undefined);

const identifiersSchema = z
  .object({
    email: identifierValue,
    phone: identifierValue,
    loyalty_id: identifierValue,
    customer_id: identifierValue,
    device_id: identifierValue,
    cookie_id: identifierValue,
    name: identifierValue,
  })
  .strict();

/**
 * Wire schema for `POST /api/v1/events` (SoT §4.5). Unknown *event types* are
 * accepted and filed as `unknown` (D-16); unknown *channels* are rejected,
 * because every downstream grouping is keyed on the channel set.
 */
export const eventSchema = z
  .object({
    event_id: z.string().trim().min(1).max(200).nullish(),
    channel: z.enum(CHANNELS, {
      message: `channel must be one of: ${CHANNELS.join(", ")}`,
    }),
    event_type: z
      .string({ message: "event_type is required" })
      .trim()
      .min(1, "event_type must not be empty")
      .max(100),
    timestamp: z
      .string({ message: "timestamp is required and must be an ISO-8601 string" })
      .trim()
      .min(1),
    identifiers: identifiersSchema.optional().transform((v) => v ?? {}),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const batchSchema = z
  .object({
    events: z
      .array(eventSchema)
      .min(1, "events must contain at least one event")
      .max(MAX_BATCH_SIZE, `batches are limited to ${MAX_BATCH_SIZE} events`),
  })
  .strict();

export interface FieldError {
  field: string;
  message: string;
}

export type ValidationOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldError[] };

function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "(body)",
    message: issue.message,
  }));
}

/**
 * Stage 1: structural validation. An event with no usable identifier at all is
 * rejected here — it could only ever create an orphan profile.
 */
export function validateEvent(input: unknown): ValidationOutcome<RawEvent> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) };

  const identifiers = parsed.data.identifiers;
  const hasAny = Object.values(identifiers).some(
    (value) => typeof value === "string" && value.length > 0,
  );
  if (!hasAny) {
    return {
      ok: false,
      errors: [
        {
          field: "identifiers",
          message:
            "At least one identifier is required (email, phone, loyalty_id, customer_id, device_id or cookie_id).",
        },
      ],
    };
  }

  return { ok: true, value: parsed.data as RawEvent };
}

export function validateBatch(input: unknown): ValidationOutcome<{ events: RawEvent[] }> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) };
  return { ok: true, value: parsed.data as { events: RawEvent[] } };
}
