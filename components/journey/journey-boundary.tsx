import { formatGap } from "@/lib/shared/format";

/** Journey boundary — a >24h cross-channel gap starts a new journey (SoT §4.7). */
export function JourneyBoundary({ gapMinutes }: { gapMinutes: number }) {
  return (
    <div className="my-3 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary">
        New journey · {formatGap(gapMinutes)} later
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
