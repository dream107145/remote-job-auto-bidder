import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { getUsageStats } from "@/actions/billing";
import { getBids } from "@/actions/bids";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BID_STATUS_LABELS, BID_STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Send, Users, TrendingUp, Clock } from "lucide-react";

export default async function DashboardPage() {
  const [usage, recentBids] = await Promise.all([
    getUsageStats(),
    getBids({ page: 1, pageSize: 5 }),
  ]);

  const bidPercent =
    usage.bidsLimit === -1 ? 0 : Math.round((usage.bidsUsed / usage.bidsLimit) * 100);
  const profilePercent =
    usage.profilesLimit === -1
      ? 0
      : Math.round((usage.profilesUsed / usage.profilesLimit) * 100);

  return (
    <div>
      <DashboardHeader title="Overview" />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bids Used</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usage.bidsUsed}
                {usage.bidsLimit !== -1 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /{usage.bidsLimit}
                  </span>
                )}
              </div>
              {usage.bidsLimit !== -1 && <Progress value={bidPercent} className="mt-2" />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Profiles</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usage.profilesUsed}
                {usage.profilesLimit !== -1 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /{usage.profilesLimit}
                  </span>
                )}
              </div>
              {usage.profilesLimit !== -1 && (
                <Progress value={profilePercent} className="mt-2" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentBids.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recentBids.data.filter((b) => b.status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting submission</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Bids</CardTitle>
            <CardDescription>Your latest job applications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentBids.data.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No bids yet. Create a profile and start auto-bidding!
              </p>
            ) : (
              <div className="space-y-4">
                {recentBids.data.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{bid.job_title}</p>
                      <p className="text-sm text-muted-foreground">{bid.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(bid.created_at)}
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
