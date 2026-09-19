import { BrandMark } from "./brand-mark";

/**
 * Temporary route scaffold for the shell milestone. Business screens replace
 * these in their own milestones (Dashboard = M2, Customers = M3, etc.). Kept
 * deliberately minimal so it introduces no business logic or new components.
 */
export function PagePlaceholder({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <BrandMark className="h-12 w-12 opacity-90" />
      <h2 className="text-xl font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      <p className="max-w-md text-sm text-text-secondary">{note}</p>
      <p className="font-mono text-xs text-text-muted">
        Milestone 1 · application shell
      </p>
    </div>
  );
}
