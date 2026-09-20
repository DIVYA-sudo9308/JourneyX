import { Skeleton } from "@/components/ui/skeleton";

/** Journey tab loading (DS §29): filter bar + skeleton nodes on a thread. */
export default function CustomerJourneyLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-3 w-64 max-w-full" />
      </div>
      <Skeleton className="h-8 w-full max-w-md" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Skeleton className="h-8 w-8 rounded-pill" />
              <span aria-hidden className="mt-1 h-10 w-px bg-border" />
            </div>
            <div className="min-w-0 flex-1">
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
