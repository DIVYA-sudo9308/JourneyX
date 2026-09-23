import type { NextRequest } from "next/server";

import { notFound, ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { getCustomerJourney } from "@/lib/queries/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/customers/:id/journey` — the stitched, chronological timeline
 * with sessions, journeys, channel transitions, the resolution behind each
 * event and the patterns anchored to them (SoT §4.7).
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/v1/customers/[id]/journey">,
): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const journey = await getCustomerJourney(id);
    if (!journey) return notFound(`No customer with id "${id}".`);
    return ok(journey);
  } catch (error) {
    return serverError("customers.journey", error);
  }
}
