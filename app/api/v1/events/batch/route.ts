import { badRequest, ok, readJson, requireIngestToken, serverError } from "@/lib/api/http";
import { presentFailure, presentResult } from "@/lib/api/present";
import { processBatch } from "@/lib/pipeline/ingest";
import type { PipelineSuccess } from "@/lib/pipeline/types";
import { validateBatch } from "@/lib/pipeline/validate";
import { pipelineStore } from "@/lib/queries/store";
import { asOf } from "@/lib/shared/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `POST /api/v1/events/batch` — up to 50 events, processed sequentially
 * (SoT D-20). Partial success is allowed: each event gets its own result, so
 * one malformed record never discards the rest of the batch.
 */
export async function POST(request: Request): Promise<Response> {
  const denied = requireIngestToken(request);
  if (denied) return denied;

  const body = await readJson(request);
  if (body === null) return badRequest("The request body must be valid JSON.");

  const validation = validateBatch(body);
  if (!validation.ok) {
    return badRequest("The batch failed schema validation.", validation.errors);
  }

  try {
    const results = await processBatch(pipelineStore(), validation.value.events, {
      asOf: asOf(),
      source: "api",
    });

    const accepted = results.filter((r) => r.ok && !r.duplicate).length;
    const duplicates = results.filter((r) => r.ok && r.duplicate).length;

    return ok(
      {
        received: results.length,
        accepted,
        duplicates,
        rejected: results.filter((r) => !r.ok).length,
        results: results.map((result) =>
          result.ok ? presentResult(result as PipelineSuccess) : presentFailure(result),
        ),
      },
      202,
    );
  } catch (error) {
    return serverError("events.batch", error);
  }
}
