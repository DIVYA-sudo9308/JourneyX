"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { CHANNELS, CHANNEL_LABEL, type Channel } from "@/lib/types/domain";
import { ChannelIcon } from "@/components/shared/channel-badge";

type Preset = "7d" | "30d" | "90d" | "all" | "custom";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: Exclude<Preset, "custom" | "all">, today: Date) {
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const from = new Date(today.getTime() - (days - 1) * 86_400_000);
  return { dateFrom: isoDate(from), dateTo: isoDate(today) };
}

function detectPreset(dateFrom: string | null, dateTo: string | null, today: Date): Preset {
  if (!dateFrom && !dateTo) return "all";
  if (!dateFrom || !dateTo) return "custom";
  for (const p of ["7d", "30d", "90d"] as const) {
    const range = presetRange(p, today);
    if (range.dateFrom === dateFrom && range.dateTo === dateTo) return p;
  }
  return "custom";
}

/**
 * Dashboard filter bar — date range + channel (Screen Spec §3, DS §32).
 * All state lives in URL params (`dateFrom`, `dateTo`, `channel`), so the
 * filtered view is shareable and back-button-safe; the server component
 * re-fetches on navigation.
 */
export function FilterBar({ asOfIso }: { asOfIso: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const channelParam = searchParams.get("channel");
  const selectedChannels = React.useMemo(
    () => (channelParam ? (channelParam.split(",") as Channel[]) : []),
    [channelParam],
  );
  const [customRange, setCustomRange] = React.useState(false);
  const today = new Date(asOfIso);
  const preset = customRange ? "custom" : detectPreset(dateFrom, dateTo, today);

  function applyParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function onPresetChange(value: Preset) {
    setCustomRange(value === "custom");
    if (value === "all") {
      applyParams({ dateFrom: null, dateTo: null });
    } else if (value !== "custom") {
      const range = presetRange(value, today);
      applyParams({ dateFrom: range.dateFrom, dateTo: range.dateTo });
    }
    // "custom" leaves current values in place and reveals the date inputs.
  }

  function toggleChannel(channel: Channel) {
    const next = selectedChannels.includes(channel)
      ? selectedChannels.filter((c) => c !== channel)
      : [...selectedChannels, channel];
    applyParams({ channel: next.length > 0 ? next.join(",") : null });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="dashboard-date-preset" className="sr-only">
          Date range
        </label>
        <select
          id="dashboard-date-preset"
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as Preset)}
          className="h-9 rounded-sm border border-input bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
          <option value="custom">Custom range</option>
        </select>

        {preset === "custom" ? (
          <>
            <label htmlFor="dashboard-date-from" className="sr-only">
              From
            </label>
            <input
              id="dashboard-date-from"
              type="date"
              value={dateFrom ?? ""}
              max={dateTo ?? undefined}
              onChange={(e) => applyParams({ dateFrom: e.target.value || null })}
              className="h-9 rounded-sm border border-input bg-surface px-3 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-sm text-text-secondary" aria-hidden>
              –
            </span>
            <label htmlFor="dashboard-date-to" className="sr-only">
              To
            </label>
            <input
              id="dashboard-date-to"
              type="date"
              value={dateTo ?? ""}
              min={dateFrom ?? undefined}
              onChange={(e) => applyParams({ dateTo: e.target.value || null })}
              className="h-9 rounded-sm border border-input bg-surface px-3 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        ) : null}
      </div>

      <fieldset className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Channel</legend>
        {CHANNELS.map((channel) => {
          const active = selectedChannels.includes(channel);
          return (
            <button
              key={channel}
              type="button"
              aria-pressed={active}
              onClick={() => toggleChannel(channel)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-transparent bg-teal-tint text-foreground ring-1 ring-inset ring-accent"
                  : "border-border bg-surface text-text-secondary hover:bg-surface-alt hover:text-foreground",
              )}
            >
              <ChannelIcon channel={channel} />
              {CHANNEL_LABEL[channel]}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
