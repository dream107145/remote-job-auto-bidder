"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; rate: number }[];
}

export default function SuccessRateChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis unit="%" className="text-xs" tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
