"use client";

import { Search } from "lucide-react";

/**
 * Global search trigger (Design System §12/§15). This renders the shell
 * affordance; the type-ahead dropdown (S-09) and its SWR query are wired in a
 * later milestone. Kept keyboard-focusable and labelled.
 */
export function SearchTrigger() {
  return (
    <button
      type="button"
      aria-label="Search customers"
      className="group inline-flex h-9 w-full max-w-[480px] items-center gap-2 rounded-sm border border-input bg-surface px-3 text-sm text-text-muted transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="truncate">
        Search email, phone, name, loyalty ID…
      </span>
      <kbd className="ml-auto hidden rounded-xs border border-border px-1.5 py-0.5 font-mono text-[11px] text-text-secondary sm:inline">
        Ctrl K
      </kbd>
    </button>
  );
}
