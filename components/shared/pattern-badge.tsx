import {
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PatternType } from "@/lib/types/domain";

/** Patterns shown as list badges — churn is a profile-level banner, not a badge (SoT D-31). */
export type ListPattern = Exclude<PatternType, "churn_signal">;

/**
 * Detected-pattern tag badge (DS §38). Icon + label + tint carry the meaning
 * together; escalation and repeat share the Warning family intentionally and
 * are told apart by glyph + label (never color alone).
 */
const PATTERN_META: Record<
  ListPattern,
  { label: string; Icon: LucideIcon; cls: string }
> = {
  drop_off: {
    label: "Drop-off",
    Icon: TrendingDown,
    cls: "bg-danger-tint text-danger",
  },
  escalation: {
    label: "Escalation",
    Icon: ArrowUpRight,
    cls: "bg-warning-tint text-warning",
  },
  repeat_contact: {
    label: "Repeat",
    Icon: RefreshCw,
    cls: "bg-warning-tint text-warning",
  },
  unresolved_issue: {
    label: "Unresolved",
    Icon: AlertCircle,
    cls: "bg-info-tint text-info",
  },
};

export function PatternBadge({
  pattern,
  className,
}: {
  pattern: ListPattern;
  className?: string;
}) {
  const meta = PATTERN_META[pattern];
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
