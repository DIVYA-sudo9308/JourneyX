import { Equal, Flag, GitMerge, Sigma, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LinkMethod } from "@/lib/types/customer";

/** Identity-resolution method badge (DS §21): color + icon + text. */
const METHOD_META: Record<
  LinkMethod,
  { label: string; Icon: LucideIcon; cls: string }
> = {
  deterministic: { label: "Deterministic", Icon: Equal, cls: "bg-neutral-tint text-text-secondary" },
  probabilistic: { label: "Probabilistic", Icon: Sigma, cls: "bg-info-tint text-info" },
  origin: { label: "Origin", Icon: Flag, cls: "bg-neutral-tint text-text-secondary" },
  conflict: { label: "Conflict", Icon: GitMerge, cls: "bg-warning-tint text-warning" },
};

export function MethodBadge({
  method,
  className,
}: {
  method: LinkMethod;
  className?: string;
}) {
  const meta = METHOD_META[method];
  const Icon = meta.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[11px] font-medium",
        meta.cls,
        className,
      )}
    >
      <Icon aria-hidden className="h-3 w-3" strokeWidth={2} />
      {meta.label}
    </span>
  );
}
