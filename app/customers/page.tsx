import type { Metadata } from "next";
import Link from "next/link";

import { getCustomers } from "@/lib/queries/customers";
import {
  CHANNEL_LABEL,
  PATTERN_LABEL,
  type Channel,
  type ChurnRisk,
} from "@/lib/types/domain";
import type {
  CustomerListFilters,
  CustomerPattern,
  CustomerSortKey,
  SortOrder,
} from "@/lib/types/customer";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, CodeHint } from "@/components/shared/empty-state";
import { FilterChips, type ChipItem } from "@/components/shared/filter-chips";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { FilterRail } from "@/components/customers/filter-rail";
import { CustomerTable } from "@/components/customers/customer-table";

export const metadata: Metadata = { title: "Customers" };

const FILTER_PARAMS = [
  "pattern",
  "channel",
  "churnRisk",
  "minConfidence",
  "dateFrom",
  "dateTo",
];

const CHURN_LABEL: Record<ChurnRisk, string> = {
  high: "High",
  medium: "Medium",
  none: "None",
};

type SearchParams = Record<string, string | string[] | undefined>;

function str(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseFilters(params: SearchParams): CustomerListFilters {
  const csv = <T extends string>(key: string): T[] | undefined => {
    const v = str(params, key);
    return v ? (v.split(",") as T[]) : undefined;
  };
  const pageRaw = str(params, "page");
  const pageSizeRaw = str(params, "pageSize");
  const minConfRaw = str(params, "minConfidence");

  return {
    page: pageRaw ? Math.max(1, parseInt(pageRaw, 10) || 1) : undefined,
    pageSize: pageSizeRaw ? parseInt(pageSizeRaw, 10) || undefined : undefined,
    pattern: csv<CustomerPattern>("pattern"),
    channel: csv<Channel>("channel"),
    churnRisk: csv<ChurnRisk>("churnRisk"),
    minConfidence: minConfRaw ? Number(minConfRaw) : undefined,
    dateFrom: str(params, "dateFrom"),
    dateTo: str(params, "dateTo"),
    sortBy: str(params, "sortBy") as CustomerSortKey | undefined,
    sortOrder: str(params, "sortOrder") as SortOrder | undefined,
  };
}

function buildChips(filters: CustomerListFilters): ChipItem[] {
  const chips: ChipItem[] = [];
  filters.pattern?.forEach((p) =>
    chips.push({ param: "pattern", value: p, label: `Pattern: ${PATTERN_LABEL[p]}` }),
  );
  filters.channel?.forEach((c) =>
    chips.push({ param: "channel", value: c, label: `Channel: ${CHANNEL_LABEL[c]}` }),
  );
  filters.churnRisk?.forEach((r) =>
    chips.push({ param: "churnRisk", value: r, label: `Churn: ${CHURN_LABEL[r]}` }),
  );
  if (filters.minConfidence !== undefined && filters.minConfidence > 0) {
    chips.push({
      param: "minConfidence",
      value: String(filters.minConfidence),
      label: `Min confidence ${filters.minConfidence.toFixed(2)}`,
    });
  }
  if (filters.dateFrom)
    chips.push({ param: "dateFrom", value: filters.dateFrom, label: `From ${filters.dateFrom}` });
  if (filters.dateTo)
    chips.push({ param: "dateTo", value: filters.dateTo, label: `To ${filters.dateTo}` });
  return chips;
}

/** Canonical query string (minus page) used to build sort links. */
function buildQuery(filters: CustomerListFilters): string {
  const params = new URLSearchParams();
  if (filters.pattern) params.set("pattern", filters.pattern.join(","));
  if (filters.channel) params.set("channel", filters.channel.join(","));
  if (filters.churnRisk) params.set("churnRisk", filters.churnRisk.join(","));
  if (filters.minConfidence !== undefined)
    params.set("minConfidence", String(filters.minConfidence));
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  return params.toString();
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const result = await getCustomers(filters);

  const asOf = new Date(result.asOfIso);
  const chips = buildChips(filters);
  const query = buildQuery(filters);
  const sortBy: CustomerSortKey = filters.sortBy ?? "lastActive";
  const sortOrder: SortOrder = filters.sortOrder ?? "desc";

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Customers"
        subtitle="Browse, filter, and investigate unified customer profiles."
      />

      <div className="lg:grid lg:grid-cols-[248px_1fr] lg:gap-8">
        <FilterRail />

        <div className="mt-4 flex min-w-0 flex-col gap-4 lg:mt-0">
          {chips.length > 0 ? (
            <FilterChips items={chips} filterParams={FILTER_PARAMS} />
          ) : null}

          {result.totalUnfiltered === 0 ? (
            <EmptyState
              title="No customer profiles yet."
              description="Ingest events to create unified profiles."
              action={<CodeHint>npm run seed</CodeHint>}
            />
          ) : result.total === 0 ? (
            <EmptyState
              title="No customers match these filters."
              description="Try widening the date range or removing a channel."
              action={
                <Button asChild variant="secondary">
                  <Link href="/customers">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <CustomerTable
                items={result.items}
                asOf={asOf}
                query={query}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
              <Pagination
                page={result.page}
                pageSize={result.pageSize}
                total={result.total}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
