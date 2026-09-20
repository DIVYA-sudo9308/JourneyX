import { cache } from "react";

import { asOf } from "@/lib/shared/clock";
import {
  CHANNELS,
  CHURN_RISK_LEVELS,
  type Channel,
  type ChurnRisk,
} from "@/lib/types/domain";
import type {
  CustomerDetail,
  CustomerListFilters,
  CustomerListResult,
  CustomerPattern,
  CustomerSortKey,
  SortOrder,
} from "@/lib/types/customer";
import { getMockCustomers, getMockCustomerById } from "@/lib/mock/customers";

export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryError";
  }
}

const LIST_PATTERNS: CustomerPattern[] = [
  "drop_off",
  "escalation",
  "repeat_contact",
  "unresolved_issue",
];
const SORT_KEYS: CustomerSortKey[] = ["lastActive", "eventCount", "churnRisk"];

/**
 * Server-side customer query (SoT D-34: Server Components call `lib/queries/*`
 * directly). Validates the URL-param filters, then reads the approved mock
 * fixture. The return shape is the real `GET /api/v1/customers` contract
 * (SoT §4.4) so swapping in Prisma later touches nothing above this layer.
 */
export async function getCustomers(
  filters: CustomerListFilters,
): Promise<CustomerListResult> {
  const patterns = filters.pattern?.filter((p): p is CustomerPattern =>
    LIST_PATTERNS.includes(p),
  );
  const channels = filters.channel?.filter((c): c is Channel =>
    CHANNELS.includes(c),
  );
  const churnRisk = filters.churnRisk?.filter((r): r is ChurnRisk =>
    CHURN_RISK_LEVELS.includes(r),
  );

  const sortBy: CustomerSortKey | undefined =
    filters.sortBy && SORT_KEYS.includes(filters.sortBy)
      ? filters.sortBy
      : undefined;
  const sortOrder: SortOrder | undefined =
    filters.sortOrder === "asc" || filters.sortOrder === "desc"
      ? filters.sortOrder
      : undefined;

  const minConfidence =
    filters.minConfidence !== undefined && !Number.isNaN(filters.minConfidence)
      ? Math.min(1, Math.max(0, filters.minConfidence))
      : undefined;

  if (filters.dateFrom && filters.dateTo) {
    if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
      throw new QueryError('"dateFrom" must not be after "dateTo".');
    }
  }

  // Simulated latency so the route's loading skeleton is real.
  await new Promise((resolve) => setTimeout(resolve, 400));

  return getMockCustomers({
    asOf: asOf(),
    page: filters.page,
    pageSize: filters.pageSize,
    pattern: patterns,
    channel: channels,
    churnRisk,
    minConfidence,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy,
    sortOrder,
  });
}

/**
 * Single customer detail (S-03). `cache()` dedupes the lookup so the shell
 * layout and the Overview page share one read per request. Returns null for an
 * unknown id, which the route turns into a 404 (not-found). Swaps to Prisma
 * later without touching callers (SoT D-34).
 */
export const getCustomer = cache(
  async (id: string): Promise<CustomerDetail | null> => {
    return getMockCustomerById(id, asOf());
  },
);
