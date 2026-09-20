"use client";

import { useEffect } from "react";

import { ErrorDisplay } from "@/components/shared/error-display";

/** Journey tab error boundary (DS §30): keeps the shell, offers Retry. */
export default function CustomerJourneyError({
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
    <ErrorDisplay
      title="Couldn't load the journey"
      message={error.message || "The customer journey failed to load."}
      requestId={error.digest}
      onRetry={reset}
    />
  );
}
