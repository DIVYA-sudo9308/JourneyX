import type { CustomerDetail } from "@/lib/types/customer";
import { IdentityCard } from "./identity-card";
import { ChurnBanner } from "./churn-banner";
import { ConflictAlert } from "./conflict-alert";

/**
 * Persistent customer context (Screen Spec S-03) shown alongside every tab:
 * conflict notice (if any) → identity → churn. Journey statistics live in the
 * Overview tab to avoid duplicating them here.
 */
export function CustomerSummary({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="flex flex-col gap-4">
      {customer.hasConflict ? <ConflictAlert id={customer.id} /> : null}
      <IdentityCard customer={customer} />
      <ChurnBanner risk={customer.churnRisk} signals={customer.churnSignals} />
    </div>
  );
}
