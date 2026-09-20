"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { CHANNEL_LABEL, type Channel } from "@/lib/types/domain";
import { ChannelIcon } from "@/components/shared/channel-badge";

/**
 * Journey channel filter (Screen Spec S-04, DS §32). Channel selection lives in
 * the URL (`channel`), so the filtered view is shareable and server-rendered.
 */
export function TimelineFilterBar({
  channels,
  total,
  visible,
}: {
  channels: Channel[];
  total: number;
  visible: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("channel") ?? "")
    .split(",")
    .filter(Boolean) as Channel[];

  function apply(next: Channel[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set("channel", next.join(","));
    else params.delete("channel");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const toggle = (channel: Channel) =>
    apply(
      active.includes(channel)
        ? active.filter((c) => c !== channel)
        : [...active, channel],
    );

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Filter events by channel</legend>
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary">
          Channels
        </span>
        {channels.map((channel) => {
          const on = active.includes(channel);
          return (
            <button
              key={channel}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(channel)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on
                  ? "border-transparent bg-teal-tint text-foreground ring-1 ring-inset ring-accent"
                  : "border-border bg-surface text-text-secondary hover:bg-surface-alt hover:text-foreground",
              )}
            >
              <ChannelIcon channel={channel} />
              {CHANNEL_LABEL[channel]}
            </button>
          );
        })}
        {active.length > 0 ? (
          <button
            type="button"
            onClick={() => apply([])}
            className="ml-1 rounded-sm px-1 text-[13px] font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear
          </button>
        ) : null}
      </fieldset>
      <p className="text-[13px] text-text-secondary" aria-live="polite">
        Showing{" "}
        <span className="font-mono tabular-nums text-foreground">{visible}</span>{" "}
        of{" "}
        <span className="font-mono tabular-nums text-foreground">{total}</span>{" "}
        events
      </p>
    </div>
  );
}
