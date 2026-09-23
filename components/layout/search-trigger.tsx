"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import useSWR from "swr";

import { ChannelIcon } from "@/components/shared/channel-badge";
import { ChurnRiskPill } from "@/components/shared/churn-risk-pill";
import { fetcher } from "@/lib/api/fetcher";
import type { CustomerSearchResult } from "@/lib/types/customer";

/** Shorter queries would match most of the dataset (SoT §4.4 route #4). */
const MIN_LENGTH = 3;
const DEBOUNCE_MS = 200;

/**
 * Global customer search (Design System §12/§15, Screen Spec S-09). Queries
 * `/api/v1/customers/search`, which matches strong identifiers exactly and
 * names and opaque IDs by prefix. Results show masked identifiers only.
 */
export function SearchTrigger() {
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const query = debounced.length >= MIN_LENGTH ? debounced : null;
  const { data, isLoading } = useSWR<CustomerSearchResult>(
    query ? `/customers/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    { keepPreviousData: true, onError: () => {} },
  );

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      // Ctrl/Cmd+K focuses search from anywhere, as the affordance advertises.
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const hits = data?.hits ?? [];
  const showPanel = open && query !== null;

  return (
    <div ref={containerRef} className="relative w-full max-w-[480px]">
      <div className="group inline-flex h-9 w-full items-center gap-2 rounded-sm border border-input bg-surface px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-surface-alt">
        <Search aria-hidden className="h-4 w-4 shrink-0 text-text-muted" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="search-results"
          aria-label="Search customers"
          placeholder="Search email, phone, name, loyalty ID…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:appearance-none"
        />
        {isLoading && query ? (
          <Loader2 aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin text-text-muted" />
        ) : (
          <kbd className="ml-auto hidden rounded-xs border border-border px-1.5 py-0.5 font-mono text-[11px] text-text-secondary sm:inline">
            Ctrl K
          </kbd>
        )}
      </div>

      {showPanel ? (
        <div
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg"
        >
          {hits.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-text-secondary">
              {isLoading ? "Searching…" : `No customer matches “${debounced}”.`}
            </p>
          ) : (
            <ul className="max-h-[380px] overflow-y-auto">
              {hits.map((hit) => (
                <li key={hit.id} role="option" aria-selected={false}>
                  <Link
                    href={`/customers/${hit.id}`}
                    onClick={() => setOpen(false)}
                    className="flex flex-col gap-1 px-4 py-2.5 transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {hit.displayName ?? "Anonymous customer"}
                      </span>
                      <ChurnRiskPill risk={hit.churnRisk} />
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-secondary">
                      {hit.matchedOn ? (
                        <span className="font-mono text-[11px]">
                          {hit.matchedOn.type}: {hit.matchedOn.maskedValue}
                        </span>
                      ) : null}
                      <span className="tabular-nums">
                        {hit.identifierCount} identifiers · {hit.eventCount} events
                      </span>
                      <span className="flex items-center gap-1">
                        {hit.channels.map((channel) => (
                          <ChannelIcon
                            key={channel}
                            channel={channel}
                            className="h-3.5 w-3.5"
                          />
                        ))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
