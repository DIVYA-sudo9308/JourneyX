import { cn } from "@/lib/utils";

/** Layout-preserving skeleton block (Design System §29). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-surface-alt", className)}
      {...props}
    />
  );
}

export { Skeleton };
