"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

/**
 * URL-param pagination (DS §33). Page and page size live in the query string
 * (`page`, `pageSize`), so the server component re-renders the right slice on
 * navigation — no client data state.
 */
export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-[13px] text-text-secondary">
        Showing{" "}
        <span className="font-mono tabular-nums text-foreground">
          {start}–{end}
        </span>{" "}
        of{" "}
        <span className="font-mono tabular-nums text-foreground">
          {total.toLocaleString("en-IN")}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <label htmlFor="page-size" className="sr-only">
          Rows per page
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) =>
            update({
              pageSize:
                Number(e.target.value) === DEFAULT_PAGE_SIZE
                  ? null
                  : e.target.value,
              page: null,
            })
          }
          className="h-8 rounded-sm border border-input bg-surface px-2 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => update({ page: page - 1 <= 1 ? null : String(page - 1) })}
        >
          <ChevronLeft />
        </Button>
        <span className="text-[13px] tabular-nums text-text-secondary">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => update({ page: String(page + 1) })}
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
