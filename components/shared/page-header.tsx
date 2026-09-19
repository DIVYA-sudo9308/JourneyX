import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Screen-level H1 + optional subtitle + trailing actions (DS §4.1, §6). */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
