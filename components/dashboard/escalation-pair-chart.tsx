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

import type { EscalationPair } from "@/lib/types/analytics";
import { CHANNEL_LABEL } from "@/lib/types/domain";
import { ChartTooltip } from "./chart-tooltip";

/** Escalations by channel pair, horizontal bar (DS §34.3). */
export function EscalationPairChart({ data }: { data: EscalationPair[] }) {
  const chartData = data.map((e) => ({
    id: e.id,
    label: `${CHANNEL_LABEL[e.source]} → ${CHANNEL_LABEL[e.destination]}`,
    count: e.count,
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
          width={150}
          tick={{ fontSize: 12, fill: "var(--jx-color-text-secondary)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--jx-color-surface-alt)" }}
          content={<ChartTooltip formatter={(value) => `${value} escalations`} />}
        />
        <Bar
          dataKey="count"
          name="Escalations"
          fill="var(--jx-color-warning)"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
