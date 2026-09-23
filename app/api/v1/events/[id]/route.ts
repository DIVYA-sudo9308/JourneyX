import type { NextRequest } from "next/server";

import { notFound, ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { getEvent } from "@/lib/queries/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `GET /api/v1/events/:id` — one event with its resolution audit record. */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/v1/events/[id]">,
): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const event = await getEvent(id);
    if (!event) return notFound(`No event with id "${id}".`);
    return ok(event);
  } catch (error) {
    return serverError("events.detail", error);
  }
}
