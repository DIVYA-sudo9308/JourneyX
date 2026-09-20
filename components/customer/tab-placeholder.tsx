/**
 * Content stub for the Journey (S-04) and Identity (S-05) tabs, which are built
 * in later milestones. The shell + summary around it are fully functional.
 */
export function TabPlaceholder({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-12 text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-text-secondary">{note}</p>
      <p className="font-mono text-xs text-text-muted">
        Implemented in a later milestone
      </p>
    </div>
  );
}
