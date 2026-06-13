"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { profile: string; submitted: number; interview: number; accepted: number }[];
}

export default function ProfilePerformanceChart({ data }: Props) {
  const chartData = data.map((d) => ({
    profile: d.profile,
    Submitted: d.submitted,
    Interview: d.interview,
    Accepted: d.accepted,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={chartData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="profile" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis />
        <Radar
          name="Submitted"
          dataKey="Submitted"
          stroke="hsl(var(--chart-1))"
          fill="hsl(var(--chart-1))"
          fillOpacity={0.3}
        />
        <Radar
          name="Interview"
          dataKey="Interview"
          stroke="hsl(var(--chart-2))"
          fill="hsl(var(--chart-2))"
          fillOpacity={0.3}
        />
        <Radar
          name="Accepted"
          dataKey="Accepted"
          stroke="hsl(var(--chart-3))"
          fill="hsl(var(--chart-3))"
          fillOpacity={0.3}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
