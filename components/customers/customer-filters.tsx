"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ChannelIcon } from "@/components/shared/channel-badge";
import {
  CHANNELS,
  CHANNEL_LABEL,
  PATTERN_LABEL,
  type ChurnRisk,
} from "@/lib/types/domain";
import type { CustomerPattern } from "@/lib/types/customer";

const PATTERNS: CustomerPattern[] = [
  "drop_off",
  "escalation",
  "repeat_contact",
  "unresolved_issue",
];
const CHURN_OPTIONS: { value: ChurnRisk; label: string }[] = [
  { value: "high", label: "High risk" },
  { value: "medium", label: "Medium risk" },
  { value: "none", label: "No signal" },
];

/**
 * Customer List filters (Screen Spec S-02, DS §32). Every control writes to the
 * URL (`pattern`, `channel`, `churnRisk`, `minConfidence`, `dateFrom`,
 * `dateTo`) and resets pagination, so the server component re-renders the right
 * results — no client-side data state.
 */
export function CustomerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const apply = React.useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const csv = (param: string): string[] => {
    const value = searchParams.get(param);
    return value ? value.split(",") : [];
  };

  const toggleCsv = (param: string, value: string) => {
    const current = csv(param);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    apply({ [param]: next.length > 0 ? next.join(",") : null });
  };

  const selectedPatterns = csv("pattern");
  const selectedChannels = csv("channel");
  const selectedChurn = csv("churnRisk");

  const rawConfidence = Number(searchParams.get("minConfidence") ?? "0");
  const urlConfidence = Number.isFinite(rawConfidence)
    ? Math.min(1, Math.max(0, rawConfidence)) : 0;
  const idPrefix = React.useId();
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  return (
    <div className="flex flex-col gap-6">
      <FilterGroup label="Detected pattern">
        {PATTERNS.map((pattern) => (
          <CheckRow
            key={pattern}
            id={`${idPrefix}-pattern-${pattern}`}
            checked={selectedPatterns.includes(pattern)}
            onChange={() => toggleCsv("pattern", pattern)}
            label={PATTERN_LABEL[pattern]}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Channel">
        {CHANNELS.map((channel) => (
          <CheckRow
            key={channel}
            id={`${idPrefix}-channel-${channel}`}
            checked={selectedChannels.includes(channel)}
            onChange={() => toggleCsv("channel", channel)}
            label={
              <span className="inline-flex items-center gap-1.5">
                <ChannelIcon channel={channel} />
                {CHANNEL_LABEL[channel]}
              </span>
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Churn risk">
        {CHURN_OPTIONS.map((option) => (
          <CheckRow
            key={option.value}
            id={`${idPrefix}-churn-${option.value}`}
            checked={selectedChurn.includes(option.value)}
            onChange={() => toggleCsv("churnRisk", option.value)}
            label={option.label}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Minimum identity confidence">
        {/* Keyed by the URL value so an external change (Clear all / chip
            removal) remounts and reinitializes — no effect-driven setState. */}
        <ConfidenceControl
          key={urlConfidence}
          initial={urlConfidence}
          onCommit={(v) =>
            apply({ minConfidence: v > 0 ? String(Number(v.toFixed(2))) : null })
          }
        />
      </FilterGroup>

      <FilterGroup label="Active between">
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between gap-2 text-[13px] text-text-secondary">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => apply({ dateFrom: e.target.value || null })}
              className="h-8 rounded-sm border border-input bg-surface px-2 font-mono text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-[13px] text-text-secondary">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => apply({ dateTo: e.target.value || null })}
              className="h-8 rounded-sm border border-input bg-surface px-2 font-mono text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      </FilterGroup>
    </div>
  );
}

/** Slider whose live thumb/value is local; commits to the URL on release. */
function ConfidenceControl({
  initial,
  onCommit,
}: {
  initial: number;
  onCommit: (value: number) => void;
}) {
  const [value, setValue] = React.useState(initial);
  return (
    <div className="flex items-center gap-3">
      <Slider
        aria-label="Minimum identity confidence"
        min={0}
        max={1}
        step={0.05}
        value={[value]}
        onValueChange={([v]) => setValue(v)}
        onValueCommit={([v]) => onCommit(v)}
        className="flex-1"
      />
      <span className="w-10 shrink-0 text-right font-mono text-[13px] tabular-nums text-foreground">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function CheckRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <label htmlFor={id} className="cursor-pointer text-sm text-foreground">
        {label}
      </label>
    </div>
  );
}
