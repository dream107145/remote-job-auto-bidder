import { AdminHeader } from "@/components/layout/admin-sidebar";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Send, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [
    { count: userCount },
    { count: bidCount },
    { data: transactions },
    { count: activeSubs },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("bids").select("*", { count: "exact", head: true }),
    supabase.from("transactions").select("amount_cents").eq("status", "completed"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const totalRevenue =
    transactions?.reduce((sum, t) => sum + t.amount_cents, 0) ?? 0;

  return (
    <div>
      <AdminHeader title="Admin Overview" />
      <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bidCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubs ?? 0}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
