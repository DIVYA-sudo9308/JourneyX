"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

/** One active filter value. Multi-value params (csv) remove only this value. */
export interface ChipItem {
  param: string;
  value: string;
  label: string;
}

/**
 * Active-filter chips + "Clear all" (DS §32). Removing a chip edits the URL
 * (server re-renders); pagination resets so results stay consistent.
 */
export function FilterChips({
  items,
  filterParams,
}: {
  items: ChipItem[];
  filterParams: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (items.length === 0) return null;

  function apply(params: URLSearchParams) {
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function remove(item: ChipItem) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(item.param);
    if (current && current.includes(",")) {
      const next = current.split(",").filter((v) => v !== item.value);
      if (next.length > 0) params.set(item.param, next.join(","));
      else params.delete(item.param);
    } else {
      params.delete(item.param);
    }
    apply(params);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const param of filterParams) params.delete(param);
    apply(params);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <button
          key={`${item.param}:${item.value}`}
          type="button"
          onClick={() => remove(item)}
          className="inline-flex items-center gap-1 rounded-pill border border-border bg-surface px-2.5 py-1 text-[13px] text-text-secondary transition-colors hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {item.label}
          <X aria-hidden className="h-3 w-3" />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="rounded-sm px-1 text-[13px] font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Clear all
      </button>
    </div>
  );
}
