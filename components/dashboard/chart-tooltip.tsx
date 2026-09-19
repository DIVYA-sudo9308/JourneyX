"use client";

/**
 * Shared Recharts tooltip surface: dark, white text, radius-xs (DS §22, §34.2).
 *
 * Recharts injects `active` / `payload` / `label` into a custom `content`
 * element at runtime; its exported `TooltipProps` no longer types those fields
 * (v3), so we describe the runtime shape explicitly here.
 */
export interface ChartTooltipPayloadEntry {
  value?: number | string;
  name?: string | number;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipContentProps {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipPayloadEntry[];
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: ChartTooltipContentProps & {
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="max-w-[260px] rounded-xs bg-ink px-2 py-1.5 text-xs text-white shadow-jx-md">
      {label ? <p className="font-semibold">{label}</p> : null}
      {payload.map((entry, i) => (
        <p key={i} className="font-mono tabular-nums text-white/90">
          {formatter
            ? formatter(Number(entry.value), String(entry.name ?? ""))
            : `${entry.name}: ${entry.value}`}
        </p>
      ))}
    </div>
  );
}
