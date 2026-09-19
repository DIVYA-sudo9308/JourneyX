"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FrictionPoint } from "@/lib/types/analytics";
import { CHANNEL_LABEL } from "@/lib/types/domain";
import { ChartTooltip } from "./chart-tooltip";

/**
 * Top friction points, ranked by affected customers (DS §34.3, Screen Spec
 * S-01). Single-hue bars (Warning) — this is a ranked metric, not a
 * categorical series, so DS chart rule 1 (max 6 series) doesn't apply here.
 */
export function FrictionRanking({ data }: { data: FrictionPoint[] }) {
  const chartData = data.slice(0, 5).map((f) => ({
    id: f.id,
    label: `${CHANNEL_LABEL[f.channel]} · ${f.reason.replace(/_/g, " ")}`,
    affectedCustomers: f.affectedCustomers,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
      >
        <CartesianGrid
          horizontal={false}
          stroke="var(--jx-color-border)"
          strokeOpacity={0.5}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "var(--jx-color-text-muted)" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={180}
          tick={{ fontSize: 12, fill: "var(--jx-color-text-secondary)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--jx-color-surface-alt)" }}
          content={
            <ChartTooltip
              formatter={(value) => `${value} customers affected`}
            />
          }
        />
        <Bar
          dataKey="affectedCustomers"
          name="Affected customers"
          fill="var(--jx-color-warning)"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
