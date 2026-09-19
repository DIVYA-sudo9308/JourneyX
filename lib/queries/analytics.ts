import { asOf } from "@/lib/shared/clock";
import { CHANNELS, type Channel } from "@/lib/types/domain";
import type { AnalyticsSummary, DashboardFilters } from "@/lib/types/analytics";
import { getMockAnalyticsSummary } from "@/lib/mock/dashboard";

export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryError";
  }
}

function parseDate(value: string | undefined, field: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new QueryError(`"${field}" is not a valid date: "${value}".`);
  }
  return date;
}

function parseChannels(value: Channel[] | undefined): Channel[] | undefined {
  if (!value || value.length === 0) return undefined;
  const invalid = value.filter((c) => !CHANNELS.includes(c));
  if (invalid.length > 0) {
    throw new QueryError(`Unknown channel(s): ${invalid.join(", ")}.`);
  }
  return value;
}

/**
 * Server-side analytics query (SoT D-34: Server Components call `lib/queries/*`
 * directly, never their own API route). Milestone 2 has no database, so this
 * reads the approved mock fixture (`lib/mock/dashboard.ts`) — the return shape
 * is the real `GET /api/v1/analytics/summary` contract (SoT §4.9), so a later
 * milestone swaps the body for a Prisma query without touching any caller.
 */
export async function getAnalyticsSummary(
  filters: DashboardFilters,
): Promise<AnalyticsSummary> {
  const dateFrom = parseDate(filters.dateFrom, "dateFrom");
  const dateTo = parseDate(filters.dateTo, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new QueryError('"dateFrom" must not be after "dateTo".');
  }
  const channels = parseChannels(filters.channel);

  // Simulated network/DB latency so the route's loading skeleton is real,
  // not merely present in markup.
  await new Promise((resolve) => setTimeout(resolve, 400));

  return getMockAnalyticsSummary({
    asOf: asOf(),
    dateFrom,
    dateTo,
    channels,
  });
}
