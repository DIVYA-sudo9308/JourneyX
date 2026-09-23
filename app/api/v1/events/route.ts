import { badRequest, ok, readJson, requireIngestToken, serverError } from "@/lib/api/http";
import { presentResult } from "@/lib/api/present";
import { processEvent } from "@/lib/pipeline/ingest";
import { pipelineStore } from "@/lib/queries/store";
import { asOf } from "@/lib/shared/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `POST /api/v1/events` — the ingestion boundary (SoT §4.4 route #1).
 *
 * The response carries everything the caller (or the demo) needs to see what
 * the event actually did: the resolved customer, how it was resolved, the
 * evidence behind that decision, the identifiers it contributed, and the
 * patterns that hold for the customer afterwards.
 */
export async function POST(request: Request): Promise<Response> {
  const denied = requireIngestToken(request);
  if (denied) return denied;

  const body = await readJson(request);
  if (body === null) return badRequest("The request body must be valid JSON.");

  try {
    const result = await processEvent(pipelineStore(), body, {
      asOf: asOf(),
      source: "api",
    });
    if (!result.ok) {
      return result.code === "validation_error"
        ? badRequest(result.message, result.details)
        : serverError("events.post", new Error(result.message));
    }
    return ok(presentResult(result), 202);
  } catch (error) {
    return serverError("events.post", error);
  }
}
