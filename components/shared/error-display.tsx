import { AlertOctagon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Screen-level error block (DS §30): state what happened, then what to do.
 * Never "Error 500" — the human message is required; a technical id is
 * optional and rendered in mono so it can be copied into a bug report.
 */
export function ErrorDisplay({
  title = "Couldn't load this page",
  message,
  requestId,
  onRetry,
}: {
  title?: string;
  message: string;
  requestId?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <AlertOctagon aria-hidden className="h-8 w-8 text-text-muted" />
      <h3 className="text-lg font-semibold tracking-[-0.005em] text-foreground">
        {title}
      </h3>
      <p className="max-w-md text-sm text-text-secondary">{message}</p>
      {requestId ? (
        <p className="font-mono text-xs text-text-muted">{requestId}</p>
      ) : null}
      {onRetry ? (
        <Button variant="primary" size="md" onClick={onRetry} className="mt-1">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
