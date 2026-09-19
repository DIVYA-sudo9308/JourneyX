"use client";

import { useEffect } from "react";

import { ErrorDisplay } from "@/components/shared/error-display";

/**
 * Screen-level error boundary (DS §30): preserves the shell (rail + top bar
 * stay, per the root layout) and offers Retry. Triggered by real query
 * failures from `getAnalyticsSummary` (e.g. an invalid date filter) — no
 * stack trace reaches the UI (PRD NFR-008).
 */
export default function DashboardError({
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
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-6">
      <ErrorDisplay
        title="Couldn't load the dashboard"
        message={error.message || "The analytics summary failed to load."}
        requestId={error.digest}
        onRetry={reset}
      />
    </div>
  );
}
