import { cn } from "@/lib/utils";

/**
 * Identity-confidence meter (DS §37). Four segments; the filled count and the
 * numeric score both carry meaning, so the band is legible without color
 * (P4 / not-color-alone). Bands per SoT D-09:
 *   High 0.95–1.00 (4) · Medium 0.80–0.94 (3) · Low 0.70–0.79 (2) · Origin <0.70 (1).
 */
export interface ConfidenceBand {
  label: string;
  filled: number;
  colorClass: string;
}

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.95) return { label: "High", filled: 4, colorClass: "bg-success" };
  if (confidence >= 0.8) return { label: "Medium", filled: 3, colorClass: "bg-teal" };
  if (confidence >= 0.7) return { label: "Low", filled: 2, colorClass: "bg-warning" };
  return { label: "Origin", filled: 1, colorClass: "bg-text-muted" };
}

export function ConfidenceMeter({
  confidence,
  showLabel = false,
  className,
}: {
  confidence: number;
  showLabel?: boolean;
  className?: string;
}) {
  const band = confidenceBand(confidence);
  const score = confidence.toFixed(2);

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={`${band.label} · ${score}`}
      aria-label={`Identity confidence ${band.label}, ${score}`}
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-1 rounded-[1px]",
              i < band.filled ? band.colorClass : "bg-border",
            )}
          />
        ))}
      </span>
      <span
        className="font-mono text-[13px] tabular-nums text-foreground"
        aria-hidden
      >
        {score}
      </span>
      {showLabel ? (
        <span className="text-[13px] text-text-secondary" aria-hidden>
          {band.label}
        </span>
      ) : null}
    </span>
  );
}
