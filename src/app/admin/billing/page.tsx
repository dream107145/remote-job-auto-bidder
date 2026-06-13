"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { AdminHeader } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLoader, Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

const RevenueChart = dynamic(
  () => import("@/components/analytics/daily-volume-chart"),
  { loading: () => <ChartLoader />, ssr: false }
);

async function fetchAdminBilling() {
  const res = await fetch("/api/admin/billing");
  if (!res.ok) throw new Error("Failed to fetch billing data");
  return res.json();
}

export default function AdminBillingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-billing"],
    queryFn: fetchAdminBilling,
  });

  return (
    <div>
      <AdminHeader title="Billing Overview" />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Spinner size="sm" /> : formatCurrency(data?.mrr || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Spinner size="sm" /> : formatCurrency(data?.totalRevenue || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Spinner size="sm" /> : data?.activeSubscriptions || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoader />
            ) : (
              <RevenueChart data={data?.revenueOverTime || []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.transactions as Transaction[])?.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.created_at)}</TableCell>
                    <TableCell>{tx.user_id.slice(0, 8)}...</TableCell>
                    <TableCell className="capitalize">{tx.type}</TableCell>
                    <TableCell>{formatCurrency(tx.amount_cents)}</TableCell>
                    <TableCell>
                      <Badge>{tx.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
