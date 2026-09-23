import { listParam, numberParam, ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { getCustomers } from "@/lib/queries/customers";
import type {
  ChurnRisk,
  Channel,
} from "@/lib/types/domain";
import type { CustomerPattern, CustomerSortKey, SortOrder } from "@/lib/types/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `GET /api/v1/customers` — the filtered customer list (SoT §4.4 route #3). */
export async function GET(request: Request): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  try {
    const result = await getCustomers({
      page: numberParam(params, "page"),
      pageSize: numberParam(params, "pageSize"),
      pattern: listParam(params, "pattern") as CustomerPattern[] | undefined,
      channel: listParam(params, "channel") as Channel[] | undefined,
      churnRisk: listParam(params, "churnRisk") as ChurnRisk[] | undefined,
      minConfidence: numberParam(params, "minConfidence"),
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      sortBy: (params.get("sortBy") as CustomerSortKey | null) ?? undefined,
      sortOrder: (params.get("sortOrder") as SortOrder | null) ?? undefined,
    });
    return ok(result);
  } catch (error) {
    return serverError("customers.list", error);
  }
}
