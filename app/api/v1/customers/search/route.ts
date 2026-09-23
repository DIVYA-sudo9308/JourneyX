import { badRequest, ok, serverError } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import { SEARCH_MIN_LENGTH, searchCustomers } from "@/lib/queries/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/customers/search?q=` — powers the persistent search bar.
 * Matches exactly on strong identifiers and by prefix/substring elsewhere;
 * returned identifier values are masked (SoT D-12).
 */
export async function GET(request: Request): Promise<Response> {
  const denied = await requireUser();
  if (denied) return denied;

  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < SEARCH_MIN_LENGTH) {
    return badRequest(`"q" must be at least ${SEARCH_MIN_LENGTH} characters.`);
  }
  try {
    return ok(await searchCustomers(q));
  } catch (error) {
    return serverError("customers.search", error);
  }
}
