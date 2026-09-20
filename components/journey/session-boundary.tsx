import { formatGap } from "@/lib/shared/format";

/** Session boundary — a >30m same-context gap (SoT §4.7). Subtle inline note. */
export function SessionBoundary({ gapMinutes }: { gapMinutes: number }) {
  return (
    <p className="mb-1.5 text-[11px] text-text-muted">
      Session break · {formatGap(gapMinutes)} gap
    </p>
  );
}
