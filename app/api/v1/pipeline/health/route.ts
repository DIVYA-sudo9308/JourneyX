import { ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { getPipelineHealth } from "@/lib/queries/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/pipeline/health` — ingestion counters, per-stage latency and
 * recent errors, read from `ingestion_log` (one row per attempt).
 */
export async function GET(): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  try {
    return ok(await getPipelineHealth());
  } catch (error) {
    return serverError("pipeline.health", error);
  }
}
