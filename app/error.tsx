"use client";

import { useEffect } from "react";

import { ErrorDisplay } from "@/components/shared/error-display";

/**
 * Root error boundary. `/dashboard`, `/customers` and the customer tabs each
 * own a more specific boundary; this one catches everything else — notably
 * `/pipeline`, whose `ingestion_log` read fails outright until migration
 * `0003_intelligence.sql` has been applied. Without it such a failure escapes
 * to Next's global error page and the whole shell disappears.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <ErrorDisplay
        title="Something went wrong"
        message={error.message || "This page failed to load."}
        requestId={error.digest}
        onRetry={reset}
      />
    </div>
  );
}
