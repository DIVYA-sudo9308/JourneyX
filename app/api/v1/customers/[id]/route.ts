import type { NextRequest } from "next/server";

import { notFound, ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { getCustomer } from "@/lib/queries/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `GET /api/v1/customers/:id` — the unified profile (SoT §4.4 route #5). */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/v1/customers/[id]">,
): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const customer = await getCustomer(id);
    if (!customer) return notFound(`No customer with id "${id}".`);
    return ok(customer);
  } catch (error) {
    return serverError("customers.detail", error);
  }
}
