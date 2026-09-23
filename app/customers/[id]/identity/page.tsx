import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { ConvergenceGraph } from "@/components/identity/convergence-graph";
import { FragmentsPanel } from "@/components/identity/fragments-panel";
import { ResolutionChain } from "@/components/identity/resolution-chain";
import { EmptyState } from "@/components/shared/empty-state";
import { getCustomerIdentity } from "@/lib/queries/customers";

export const dynamic = "force-dynamic";

/**
 * Identity tab (Screen Spec S-05). Three panels, all read from the database:
 * what each source system saw on its own, the identifier graph that unified
 * them, and the decision-by-decision record of how it happened.
 */
export default async function CustomerIdentityPage({
  params,
}: PageProps<"/customers/[id]/identity">) {
  const { id } = await params;
  const graph = await getCustomerIdentity(id);
  if (!graph) notFound();

  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        title="No identifiers linked yet"
        description="This profile has no identifiers on record. Ingest an event carrying an identifier to start the graph."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {graph.conflicts.length > 0 ? (
        <section
          aria-labelledby="conflict-heading"
          className="rounded-md border border-warning bg-warning-tint p-4"
        >
          <h2
            id="conflict-heading"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <AlertTriangle aria-hidden className="h-4 w-4 text-warning" />
            Identity conflict
          </h2>
          <p className="mt-1 text-[13px] text-foreground">
            An event carried strong identifiers belonging to different customers.
            JourneyX records the conflict instead of merging the profiles, so no
            data is silently combined.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {graph.conflicts.map((conflict) => (
              <li key={conflict.eventId} className="text-[13px] text-foreground">
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {conflict.identifiers.map((identifier, i) => (
                    <li key={i} className="font-mono text-[12px]">
                      {identifier.type} {identifier.maskedValue} →{" "}
                      <Link
                        href={`/customers/${identifier.customerId}/identity`}
                        className="underline underline-offset-2 hover:text-accent"
                      >
                        {identifier.customerId}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FragmentsPanel fragments={graph.fragments} totalEvents={graph.totalEvents} />

      <ConvergenceGraph
        nodes={graph.nodes}
        displayName={graph.displayName}
        identityConfidence={graph.identityConfidence}
      />

      <p className="rounded-sm border border-border bg-surface-alt px-4 py-3 text-[13px] text-text-secondary">
        <span className="font-medium text-foreground">Weakest link:</span>{" "}
        {graph.weakestLink.explanation} A profile is only as certain as its least
        certain link ({graph.weakestLink.confidence.toFixed(2)}).
      </p>

      <ResolutionChain chain={graph.chain} />
    </div>
  );
}
