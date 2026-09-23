import { fail, ok } from "@/lib/api/http";
import { getServiceHealth } from "@/lib/queries/pipeline";
import { asOf } from "@/lib/shared/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `GET /api/v1/health` — liveness plus a database round trip. */
export async function GET(): Promise<Response> {
  try {
    const health = await getServiceHealth();
    return ok({ status: "ok", asOf: asOf().toISOString(), ...health });
  } catch (error) {
    console.error("[api:health]", error);
    return fail(503, "unavailable", "The database is not reachable.");
  }
}
