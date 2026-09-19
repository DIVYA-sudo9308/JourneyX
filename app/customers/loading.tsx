import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level Suspense fallback while the customer query resolves (DS §29):
 * the filter rail stays visible; the results area shows 10 skeleton rows.
 */
export default function CustomersLoading() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>

      <div className="lg:grid lg:grid-cols-[248px_1fr] lg:gap-8">
        <div className="hidden lg:block">
          <Skeleton className="mb-4 h-5 w-16" />
          <div className="flex flex-col gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex min-w-0 flex-col gap-3 lg:mt-0">
          <div className="rounded-md border border-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-border px-3 py-3.5 last:border-0"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-4 w-10" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
