import type { NextRequest } from "next/server";

import { notFound, ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { getCustomerIdentity } from "@/lib/queries/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/customers/:id/identity` — the identifier graph, the source-system
 * fragments it unified, and the resolution chain with its evidence.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/v1/customers/[id]/identity">,
): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const graph = await getCustomerIdentity(id);
    if (!graph) return notFound(`No customer with id "${id}".`);
    return ok(graph);
  } catch (error) {
    return serverError("customers.identity", error);
  }
}
