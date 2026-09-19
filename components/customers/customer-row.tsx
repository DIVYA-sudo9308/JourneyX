import Link from "next/link";

import { cn } from "@/lib/utils";
import { CHANNEL_LABEL, type Channel } from "@/lib/types/domain";
import type { CustomerListItem } from "@/lib/types/customer";
import { ChannelIcon } from "@/components/shared/channel-badge";
import { ConfidenceMeter } from "@/components/shared/confidence-meter";
import { PatternBadge } from "@/components/shared/pattern-badge";
import { ChurnRiskPill } from "@/components/shared/churn-risk-pill";

/** Relative time vs. the demo `asOf` clock (SoT §4.8). */
export function relativeTime(iso: string, asOf: Date): string {
  const days = Math.floor((asOf.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}

export function absoluteIST(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function displayFor(item: CustomerListItem): { name: string; sub: string | null } {
  const name = item.displayName ?? item.maskedEmail ?? "Anonymous";
  const sub = item.displayName
    ? item.maskedEmail
    : item.isAnonymous
      ? "Anonymous visitor"
      : null;
  return { name, sub };
}

function ChannelCluster({ channels }: { channels: Channel[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {channels.map((channel) => (
        <ChannelIcon key={channel} channel={channel} />
      ))}
      <span className="sr-only">
        {channels.map((c) => CHANNEL_LABEL[c]).join(", ")}
      </span>
    </span>
  );
}

/** A `<tr>`; the name link's ::after overlay makes the whole row clickable. */
export function CustomerRow({
  item,
  asOf,
}: {
  item: CustomerListItem;
  asOf: Date;
}) {
  const { name, sub } = displayFor(item);
  return (
    <tr className="relative border-b border-border transition-colors last:border-0 hover:bg-surface-alt focus-within:bg-surface-alt">
      <td className="px-3 py-3 align-middle">
        <Link
          href={`/customers/${item.id}`}
          prefetch={false}
          className="rounded-sm font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {name}
        </Link>
        {sub ? (
          <div className="font-mono text-xs text-text-secondary">{sub}</div>
        ) : null}
      </td>
      <td className="px-3 py-3 align-middle">
        <ChannelCluster channels={item.channels} />
      </td>
      <td className="px-3 py-3 text-right align-middle font-mono text-[13px] tabular-nums text-foreground">
        {item.eventCount}
      </td>
      <td
        className="whitespace-nowrap px-3 py-3 align-middle text-[13px] text-text-secondary"
        title={absoluteIST(item.lastActiveIso)}
      >
        {relativeTime(item.lastActiveIso, asOf)}
      </td>
      <td className="px-3 py-3 align-middle">
        <ConfidenceMeter confidence={item.identityConfidence} />
      </td>
      <td className="px-3 py-3 align-middle">
        {item.patterns.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.patterns.map((pattern) => (
              <PatternBadge key={pattern} pattern={pattern} />
            ))}
          </div>
        ) : (
          <span className="text-[13px] text-text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle">
        <ChurnRiskPill risk={item.churnRisk} />
      </td>
    </tr>
  );
}

/** Stacked card used below md (DS §43). */
export function CustomerCard({
  item,
  asOf,
}: {
  item: CustomerListItem;
  asOf: Date;
}) {
  const { name, sub } = displayFor(item);
  return (
    <li className={cn("relative rounded-md border border-border bg-surface p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/customers/${item.id}`}
            prefetch={false}
            className="rounded-sm font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {name}
          </Link>
          {sub ? (
            <div className="font-mono text-xs text-text-secondary">{sub}</div>
          ) : null}
        </div>
        <ChurnRiskPill risk={item.churnRisk} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-text-secondary">
        <ChannelCluster channels={item.channels} />
        <span className="font-mono tabular-nums">{item.eventCount} events</span>
        <span title={absoluteIST(item.lastActiveIso)}>
          {relativeTime(item.lastActiveIso, asOf)}
        </span>
        <ConfidenceMeter confidence={item.identityConfidence} />
      </div>
      {item.patterns.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.patterns.map((pattern) => (
            <PatternBadge key={pattern} pattern={pattern} />
          ))}
        </div>
      ) : null}
    </li>
  );
}
