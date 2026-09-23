import { requireUser } from "@/lib/api/auth";
import { ok, readJson, serverError } from "@/lib/api/http";
import { markNotificationsRead } from "@/lib/queries/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `POST /api/v1/notifications/read` — mark one notification read, or all.
 * Called by the bell in a signed-in browser, so it is authorized by the user's
 * session; the ingest token is for machine producers and never reaches the
 * browser.
 */
export async function POST(request: Request): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  const body = (await readJson(request)) as { id?: string } | null;
  try {
    const updated = await markNotificationsRead(
      typeof body?.id === "string" ? body.id : undefined,
    );
    return ok({ updated });
  } catch (error) {
    return serverError("notifications.read", error);
  }
}
