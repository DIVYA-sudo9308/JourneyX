"use client";

import { useEffect } from "react";

import { ErrorDisplay } from "@/components/shared/error-display";

/** Detail-screen error boundary (DS §30): keeps the shell, offers Retry. */
export default function CustomerDetailError({
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
        title="Couldn't load this customer"
        message={error.message || "The customer profile failed to load."}
        requestId={error.digest}
        onRetry={reset}
      />
    </div>
  );
}
