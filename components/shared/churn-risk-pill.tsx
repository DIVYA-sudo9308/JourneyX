import {
  AlertTriangle,
  AlertCircle,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChurnRisk } from "@/lib/types/domain";

/** Churn-risk pill (DS §21): color + icon + text, so risk reads without color alone. */
const RISK_META: Record<
  ChurnRisk,
  { label: string; Icon: LucideIcon; cls: string }
> = {
  high: {
    label: "High risk",
    Icon: AlertTriangle,
    cls: "bg-danger-tint text-danger",
  },
  medium: {
    label: "Medium risk",
    Icon: AlertCircle,
    cls: "bg-warning-tint text-warning",
  },
  none: {
    label: "No signal",
    Icon: MinusCircle,
    cls: "bg-neutral-tint text-text-secondary",
  },
};

export function ChurnRiskPill({
  risk,
  className,
}: {
  risk: ChurnRisk;
  className?: string;
}) {
  const meta = RISK_META[risk];
  const Icon = meta.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium",
        meta.cls,
        className,
      )}
    >
      <Icon aria-hidden className="h-3 w-3" strokeWidth={2} />
      {meta.label}
    </span>
  );
}
