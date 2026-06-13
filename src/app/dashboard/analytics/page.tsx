"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLoader } from "@/components/ui/spinner";
import type { AnalyticsData } from "@/types";

const SuccessRateChart = dynamic(
  () => import("@/components/analytics/success-rate-chart"),
  { loading: () => <ChartLoader />, ssr: false }
);
const DailyVolumeChart = dynamic(
  () => import("@/components/analytics/daily-volume-chart"),
  { loading: () => <ChartLoader />, ssr: false }
);
const TopCompaniesChart = dynamic(
  () => import("@/components/analytics/top-companies-chart"),
  { loading: () => <ChartLoader />, ssr: false }
);
const ProfilePerformanceChart = dynamic(
  () => import("@/components/analytics/profile-performance-chart"),
  { loading: () => <ChartLoader />, ssr: false }
);

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/analytics");
  if (!res.ok) throw new Error("Failed to fetch analytics");
  const json = await res.json();
  return json.data;
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  return (
    <div>
      <DashboardHeader title="Analytics" />

      <div className="grid gap-6 p-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Bid Success Rate</CardTitle>
            <CardDescription>Acceptance rate over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoader />
            ) : (
              <SuccessRateChart data={data?.successRate || []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Bid Volume</CardTitle>
            <CardDescription>Number of bids per day</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoader />
            ) : (
              <DailyVolumeChart data={data?.dailyVolume || []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Companies</CardTitle>
            <CardDescription>Most applied companies</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoader />
            ) : (
              <TopCompaniesChart data={data?.topCompanies || []} />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Performance</CardTitle>
            <CardDescription>Compare profile outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoader />
            ) : (
              <ProfilePerformanceChart data={data?.profilePerformance || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
