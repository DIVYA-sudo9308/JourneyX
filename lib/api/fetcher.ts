/**
 * Client-side API fetcher for SWR (Design System / SoT §4.1: only the search
 * dropdown and notification bell fetch on the client; everything else is
 * server-rendered from URL params). Server Components read `lib/queries/*`
 * directly in later milestones — they do not use this fetcher.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Build an absolute API path from a relative endpoint (leading slash optional). */
export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${clean}`;
}

/**
 * SWR-compatible fetcher. Accepts an endpoint path (resolved against
 * API_BASE_URL) and returns parsed JSON, throwing ApiError on non-2xx per the
 * canonical error envelope `{ error: { code, message, details? } }`.
 */
export async function fetcher<T = unknown>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    let code: string | undefined;
    let message = `Request failed (${res.status})`;
    let details: unknown;
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code;
        message = body.error.message ?? message;
        details = body.error.details;
      }
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(res.status, message, code, details);
  }

  return res.json() as Promise<T>;
}
