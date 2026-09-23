import { listParam, ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { getAnalyticsSummary } from "@/lib/queries/analytics";
import type { Channel } from "@/lib/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/analytics/summary` — every dashboard KPI and chart, computed
 * live from the database (SoT §4.9). Nothing here is precomputed or fixed:
 * change the data and the numbers change with it.
 */
export async function GET(request: Request): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  try {
    const summary = await getAnalyticsSummary({
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      channel: listParam(params, "channel") as Channel[] | undefined,
    });
    return ok(summary);
  } catch (error) {
    return serverError("analytics.summary", error);
  }
}
