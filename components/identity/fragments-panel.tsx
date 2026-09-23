import { Link2 } from "lucide-react";

import { ChannelIcon } from "@/components/shared/channel-badge";
import type { IdentityFragment } from "@/lib/types/customer";
import { CHANNEL_LABEL } from "@/lib/types/domain";
import { formatDateIST } from "@/lib/shared/format";

const IDENTIFIER_LABEL: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  loyalty_id: "Loyalty ID",
  device_id: "Device ID",
  cookie_id: "Cookie ID",
  name: "Name",
};

/**
 * The "before" picture (Screen Spec S-05): what each source system knew on its
 * own. Every card here is one channel's isolated record of this person —
 * separate customers, as far as those systems are concerned.
 */
export function FragmentsPanel({
  fragments,
  totalEvents,
}: {
  fragments: IdentityFragment[];
  totalEvents: number;
}) {
  const systems = new Set(fragments.map((f) => f.channel)).size;

  return (
    <section
      aria-labelledby="fragments-heading"
      className="rounded-md border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="fragments-heading" className="text-[15px] font-semibold text-foreground">
          Source fragments
        </h2>
        <p className="text-[13px] text-text-secondary">
          {systems} {systems === 1 ? "system" : "systems"} ·{" "}
          {fragments.length} {fragments.length === 1 ? "identifier" : "identifiers"} ·{" "}
          {totalEvents} events
        </p>
      </div>
      <p className="mt-1 text-[13px] text-text-secondary">
        Before resolution these look like different customers. Each card is one
        channel system&rsquo;s own record.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fragments.map((fragment) => (
          <li
            key={`${fragment.channel}-${fragment.identifierType}-${fragment.value}`}
            className="rounded-sm border border-border bg-surface-alt p-3"
          >
            <div className="flex items-center gap-2">
              <ChannelIcon channel={fragment.channel} />
              <span className="text-sm font-medium text-foreground">
                {CHANNEL_LABEL[fragment.channel]}
              </span>
            </div>
            <dl className="mt-2 flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-[0.03em] text-text-secondary">
                  {IDENTIFIER_LABEL[fragment.identifierType] ?? fragment.identifierType}
                </dt>
                <dd className="break-all font-mono text-[12px] text-foreground">
                  {fragment.value}
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-[0.03em] text-text-secondary">
                  Events
                </dt>
                <dd className="font-mono text-[12px] tabular-nums text-foreground">
                  {fragment.eventCount}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-text-muted">
              {formatDateIST(fragment.firstSeenIso)} → {formatDateIST(fragment.lastSeenIso)}
            </p>
          </li>
        ))}
      </ul>

      {fragments.length > 1 ? (
        <p className="mt-4 flex items-center gap-2 rounded-sm bg-accent-tint px-3 py-2 text-[13px] text-foreground">
          <Link2 aria-hidden className="h-4 w-4 shrink-0 text-accent" />
          JourneyX resolved these {fragments.length} fragments into one customer.
        </p>
      ) : null}
    </section>
  );
}
