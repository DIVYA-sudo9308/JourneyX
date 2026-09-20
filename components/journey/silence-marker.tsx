/**
 * End-of-thread silence tail (DS §35, SoT D-31): the churn "route exits the
 * main path" cue. Rendered after the last event when the customer has gone
 * quiet.
 */
export function SilenceMarker({ days }: { days: number }) {
  if (days <= 0) return null;
  return (
    <li className="flex gap-3">
      <div className="flex w-8 flex-col items-center">
        <span className="h-8 w-px border-l border-dashed border-text-muted" />
      </div>
      <p className="pt-1 text-[13px] text-text-muted">
        Silent for{" "}
        <span className="font-medium text-foreground">{days} days</span> — no
        activity since the last event.
      </p>
    </li>
  );
}
