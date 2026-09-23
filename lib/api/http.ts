import { timingSafeEqual } from "node:crypto";

import { QueryError } from "@/lib/queries/shared";

/** Canonical error envelope (SoT §4.4): `{ error: { code, message, details? } }`. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function ok<T>(body: T, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiErrorBody = { error: { code, message, ...(details ? { details } : {}) } };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const badRequest = (message: string, details?: unknown) =>
  fail(400, "validation_error", message, details);
export const notFound = (message = "Not found.") => fail(404, "not_found", message);
export const unauthorized = (message = "A valid ingest token is required.") =>
  fail(401, "unauthorized", message);

/**
 * Turns an unexpected failure into a safe response. Internal messages, stack
 * traces and database details stay on the server; the client gets a code it
 * can act on and nothing that leaks schema or credentials.
 */
export function serverError(scope: string, error: unknown): Response {
  console.error(`[api:${scope}]`, error);
  if (error instanceof QueryError) {
    // Query errors are our own validation of URL params, safe to surface.
    return badRequest(error.message);
  }
  return fail(500, "internal_error", "The request could not be completed.");
}

/**
 * Ingestion endpoints require `x-ingest-token` matching `INGEST_TOKEN`
 * (SoT D-21). In development an unset token leaves ingestion open for the
 * demo replay; in a production build it disables ingestion instead, so a
 * deployment that forgot the variable never accepts anonymous writes.
 */
export function requireIngestToken(request: Request): Response | null {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) {
    return process.env.NODE_ENV === "production"
      ? fail(503, "ingestion_disabled", "Ingestion is disabled: INGEST_TOKEN is not configured.")
      : null;
  }
  const provided = request.headers.get("x-ingest-token") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return unauthorized();
  return null;
}

/** Parses a JSON body, returning null when it is absent or malformed. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Repeatable list params: `?channel=web,mobile` or `?channel=web&channel=mobile`. */
export function listParam(params: URLSearchParams, key: string): string[] | undefined {
  const values = params.getAll(key).flatMap((v) => v.split(",")).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
