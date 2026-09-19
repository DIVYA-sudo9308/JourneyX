"use client";

import { useEffect } from "react";

import { ErrorDisplay } from "@/components/shared/error-display";

/**
 * Screen-level error boundary (DS §30): keeps the shell, offers Retry.
 * Triggered by real query failures (e.g. an invalid date filter); no stack
 * trace reaches the UI (PRD NFR-008).
 */
export default function CustomersError({
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
        title="Couldn't load customers"
        message={error.message || "The customer list failed to load."}
        requestId={error.digest}
        onRetry={reset}
      />
    </div>
  );
}
