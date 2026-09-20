import type { ReactNode } from "react";

import type { CustomerDetail } from "@/lib/types/customer";
import { ChannelBadge } from "@/components/shared/channel-badge";
import { formatDateIST } from "@/lib/shared/format";

/** Journey summary statistics for the Overview tab (Screen Spec S-03a). */
export function JourneyStats({ customer }: { customer: CustomerDetail }) {
  const stats: { label: string; value: ReactNode }[] = [
    {
      label: "Total events",
      value: (
        <span className="font-mono tabular-nums">{customer.eventCount}</span>
      ),
    },
    {
      label: "Channels",
      value: (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {customer.channels.map((channel) => (
            <ChannelBadge key={channel} channel={channel} />
          ))}
        </span>
      ),
    },
    { label: "First seen", value: formatDateIST(customer.firstSeenIso) },
    { label: "Last seen", value: formatDateIST(customer.lastSeenIso) },
    {
      label: "Active duration",
      value: `${customer.activeDurationDays} days`,
    },
    {
      label: "Silence",
      value:
        customer.silenceDays > 0 ? `${customer.silenceDays} days` : "Active",
    },
  ];

  return (
    <section
      aria-labelledby="stats-heading"
      className="rounded-md border border-border bg-surface p-5"
    >
      <h2
        id="stats-heading"
        className="text-[15px] font-semibold text-foreground"
      >
        Journey summary
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary">
              {stat.label}
            </dt>
            <dd className="mt-1 text-sm text-foreground">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
