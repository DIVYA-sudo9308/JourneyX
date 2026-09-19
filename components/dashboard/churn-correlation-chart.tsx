"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChurnCorrelationRow } from "@/lib/types/analytics";
import type { ChartTooltipContentProps } from "./chart-tooltip";

/**
 * Churn rate with vs. without each pattern, plus lift + n (SoT D-30, §4.9).
 * Two categorical series (accent = with pattern, slate = baseline) — always
 * labelled "synthetic data" since it implies a correlation about people.
 */
export function ChurnCorrelationChart({
  data,
}: {
  data: ChurnCorrelationRow[];
}) {
  const chartData = data.map((row) => ({
    pattern: row.patternLabel,
    withPattern: Math.round(row.churnRateWith * 100),
    withoutPattern: Math.round(row.churnRateWithout * 100),
    lift: row.lift,
    n: row.n,
  }));

  return (
    <div className="flex h-full flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--jx-color-border)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="pattern"
            tick={{ fontSize: 12, fill: "var(--jx-color-text-secondary)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--jx-color-text-muted)" }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ fill: "var(--jx-color-surface-alt)" }}
            content={<CorrelationTooltip />}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--jx-color-text-secondary)" }}
            formatter={(value) =>
              value === "withPattern" ? "With pattern" : "Baseline"
            }
          />
          <Bar
            dataKey="withPattern"
            name="withPattern"
            fill="var(--jx-color-accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="withoutPattern"
            name="withoutPattern"
            fill="var(--jx-color-secondary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-text-muted">
        Synthetic data — churn rate with vs. without each pattern.
      </p>
    </div>
  );
}

function CorrelationTooltip({
  active,
  payload,
  label,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as
    | { lift: number; n: number; withPattern: number; withoutPattern: number }
    | undefined;
  if (!row) return null;

  return (
    <div className="max-w-[260px] rounded-xs bg-ink px-2 py-1.5 text-xs text-white shadow-jx-md">
      <p className="font-semibold">{label}</p>
      <p className="font-mono tabular-nums text-white/90">
        With: {row.withPattern}% · Baseline: {row.withoutPattern}%
      </p>
      <p className="font-mono tabular-nums text-white/90">
        Lift {row.lift.toFixed(1)}× · n={row.n}
      </p>
    </div>
  );
}
