import { UserX } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CustomerDetail, IdentifierType } from "@/lib/types/customer";
import { ChannelBadge } from "@/components/shared/channel-badge";
import { ConfidenceMeter } from "@/components/shared/confidence-meter";

const IDENTIFIER_LABEL: Record<IdentifierType, string> = {
  email: "Email",
  phone: "Phone",
  loyalty_id: "Loyalty ID",
  device_id: "Device ID",
  cookie_id: "Cookie ID",
  name: "Name",
};

/**
 * Identity summary (Screen Spec S-03): linked identifiers with source channel,
 * the profile identity-confidence meter (weakest link, SoT D-10) and its
 * explanation. Values are shown in FULL — permitted on the detail screen
 * (SoT D-12); the list stays masked.
 */
export function IdentityCard({ customer }: { customer: CustomerDetail }) {
  return (
    <section
      aria-labelledby="identity-heading"
      className="rounded-md border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="identity-heading"
          className="text-[15px] font-semibold text-foreground"
        >
          Identity
        </h2>
        {customer.isAnonymous ? (
          <span className="inline-flex items-center gap-1 rounded-pill bg-neutral-tint px-2 py-0.5 text-[11px] font-medium text-text-secondary">
            <UserX aria-hidden className="h-3 w-3" />
            Anonymous
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <ConfidenceMeter confidence={customer.identityConfidence} showLabel />
        <p className="mt-1.5 text-[13px] text-text-secondary">
          {customer.weakestLink.explanation}
        </p>
      </div>

      <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
        {customer.identifiers.map((idf, index) => (
          <div key={`${idf.type}-${index}`} className="flex flex-col gap-1">
            <dt className="text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary">
              {IDENTIFIER_LABEL[idf.type]}
            </dt>
            <dd className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={cn(
                  idf.type === "name"
                    ? "text-sm text-foreground"
                    : "break-all font-mono text-[13px] text-foreground",
                )}
              >
                {idf.value}
              </span>
              <ChannelBadge
                channel={idf.sourceChannel}
                className="shrink-0 text-text-secondary"
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
