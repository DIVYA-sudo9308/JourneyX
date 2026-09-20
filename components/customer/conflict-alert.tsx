import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

/**
 * Identity-conflict notice (Screen Spec S-03, APP_FLOW FLOW 07). Persistent
 * (not dismissible); deep-links to the Identity tab where the conflict is
 * detailed. No merge/split action in the MVP (SoT DO-NOT-BUILD).
 */
export function ConflictAlert({ id }: { id: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-warning border-l-[3px] bg-warning-tint p-3 text-[13px]"
    >
      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-foreground">
        This customer has an identity conflict.{" "}
        <Link
          href={`/customers/${id}/identity`}
          className="inline-flex items-center gap-0.5 rounded-sm font-medium text-warning hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Review
          <ArrowRight aria-hidden className="h-3 w-3" />
        </Link>
      </p>
    </div>
  );
}
