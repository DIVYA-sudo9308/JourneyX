import { Skeleton } from "@/components/ui/skeleton";

/** Shell loading skeleton (DS §29): summary card + tabs + tab content. */
export default function CustomerDetailLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <Skeleton className="mb-4 h-4 w-24" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />

      <div className="mt-6 lg:grid lg:grid-cols-[340px_1fr] lg:gap-8">
        <div className="hidden lg:block">
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-border bg-surface p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-4 h-4 w-40" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-4 w-5/6" />
            </div>
          </div>
        </div>

        <div className="mt-4 min-w-0 lg:mt-0">
          <Skeleton className="h-10 w-64" />
          <div className="mt-6 flex flex-col gap-6">
            <Skeleton className="h-9 w-56" />
            <div className="rounded-md border border-border bg-surface p-5">
              <Skeleton className="h-4 w-32" />
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
