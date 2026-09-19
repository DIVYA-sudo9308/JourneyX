import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  CustomerListItem,
  CustomerSortKey,
  SortOrder,
} from "@/lib/types/customer";
import { CustomerRow, CustomerCard } from "./customer-row";

interface Column {
  key: string;
  label: string;
  sortKey?: CustomerSortKey;
  align?: "right";
}

const COLUMNS: Column[] = [
  { key: "customer", label: "Customer" },
  { key: "channels", label: "Channels" },
  { key: "events", label: "Events", sortKey: "eventCount", align: "right" },
  { key: "lastActive", label: "Last active", sortKey: "lastActive" },
  { key: "confidence", label: "Confidence" },
  { key: "patterns", label: "Patterns" },
  { key: "churn", label: "Churn risk", sortKey: "churnRisk" },
];

/** Sort link that toggles order on the active column, preserving other params. */
function sortHref(
  query: string,
  col: CustomerSortKey,
  sortBy: CustomerSortKey,
  sortOrder: SortOrder,
): string {
  const params = new URLSearchParams(query);
  const nextOrder: SortOrder =
    sortBy === col ? (sortOrder === "desc" ? "asc" : "desc") : "desc";
  params.set("sortBy", col);
  params.set("sortOrder", nextOrder);
  params.delete("page");
  return `?${params.toString()}`;
}

/**
 * Customer table (DS §20) — a real `<table>` on ≥md with sortable header links
 * (server-rendered; sort state stays in the URL) and stacked cards below md.
 */
export function CustomerTable({
  items,
  asOf,
  query,
  sortBy,
  sortOrder,
}: {
  items: CustomerListItem[];
  asOf: Date;
  query: string;
  sortBy: CustomerSortKey;
  sortOrder: SortOrder;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">Customer profiles</caption>
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((col) => {
                const isSorted = col.sortKey && sortBy === col.sortKey;
                const ariaSort: "ascending" | "descending" | "none" | undefined =
                  col.sortKey
                    ? isSorted
                      ? sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                    : undefined;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      "bg-surface-alt px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary",
                      col.align === "right" && "text-right",
                    )}
                  >
                    {col.sortKey ? (
                      <Link
                        href={sortHref(query, col.sortKey, sortBy, sortOrder)}
                        scroll={false}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          col.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {col.label}
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="h-3 w-3" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown
                            className="h-3 w-3 opacity-50"
                            aria-hidden
                          />
                        )}
                      </Link>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <CustomerRow key={item.id} item={item} asOf={asOf} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {items.map((item) => (
          <CustomerCard key={item.id} item={item} asOf={asOf} />
        ))}
      </ul>
    </>
  );
}
