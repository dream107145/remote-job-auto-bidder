"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminHeader } from "@/components/layout/admin-sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { BID_STATUS_LABELS, BID_STATUS_COLORS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Activity } from "lucide-react";
import type { Bid } from "@/types";

async function fetchRecentBids(): Promise<Bid[]> {
  const res = await fetch("/api/admin/monitoring");
  if (!res.ok) throw new Error("Failed to fetch monitoring data");
  return (await res.json()).data;
}

export default function AdminMonitoringPage() {
  const { data: bids, isLoading } = useQuery({
    queryKey: ["admin-monitoring"],
    queryFn: fetchRecentBids,
    refetchInterval: 10000,
  });

  return (
    <div>
      <AdminHeader title="Bid Monitoring">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-pulse text-green-500" />
          Live feed
        </div>
      </AdminHeader>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bid Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PageLoader label="Loading activity..." />
            ) : bids?.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No recent bid activity</p>
            ) : (
              <div className="space-y-3">
                {bids?.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{bid.job_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {bid.company} · User {bid.user_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(bid.created_at)}
                      </span>
                      <Badge className={BID_STATUS_COLORS[bid.status]}>
                        {BID_STATUS_LABELS[bid.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
