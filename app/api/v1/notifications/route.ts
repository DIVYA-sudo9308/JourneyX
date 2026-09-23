import { ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { getNotifications } from "@/lib/queries/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `GET /api/v1/notifications` — the bell's feed, polled by SWR. */
export async function GET(): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  try {
    return ok(await getNotifications());
  } catch (error) {
    return serverError("notifications.list", error);
  }
}
