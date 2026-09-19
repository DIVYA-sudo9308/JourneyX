import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/layout/brand-mark";

/**
 * Forward-looking empty state (DS §28): glyph → headline → guidance → action.
 * The Convergent Thread mark stands in for the "fragmented dots resolving to
 * a line" motif the design system calls for on primary no-data states.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-4 py-12 text-center",
        className,
      )}
    >
      <BrandMark className="h-8 w-8 opacity-50" />
      <h3 className="text-lg font-semibold tracking-[-0.005em] text-foreground">
        {title}
      </h3>
      {description ? (
        <div className="max-w-md text-sm text-text-secondary">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Mono code block for CLI hints (e.g. "npm run seed") — no UI seed button (SoT D-42). */
export function CodeHint({ children }: { children: ReactNode }) {
  return (
    <code className="inline-block rounded-sm bg-surface-alt px-3 py-1.5 font-mono text-xs text-foreground">
      {children}
    </code>
  );
}
