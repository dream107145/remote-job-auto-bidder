"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageLoader } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createCryptoPayment, cancelSubscription } from "@/actions/billing";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Check, Bitcoin } from "lucide-react";
import type { Plan, Subscription, Transaction } from "@/types";

async function fetchBillingData() {
  const [plansRes, subRes, txRes, usageRes] = await Promise.all([
    fetch("/api/billing/plans"),
    fetch("/api/billing/subscription"),
    fetch("/api/billing/transactions"),
    fetch("/api/billing/usage"),
  ]);

  const plans = plansRes.ok ? (await plansRes.json()).data : [];
  const subscription = subRes.ok ? (await subRes.json()).data : null;
  const transactions = txRes.ok ? (await txRes.json()).data : [];
  const usage = usageRes.ok ? (await usageRes.json()).data : null;

  return { plans, subscription, transactions, usage };
}

export default function BillingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: fetchBillingData,
  });

  async function handleCryptoPayment(planId: string, currency: "btc" | "eth" | "usdt") {
    const result = await createCryptoPayment(planId, currency);
    if (result.error) toast.error(result.error);
    else if (result.url) window.location.href = result.url;
  }

  async function handleCancel() {
    if (!confirm("Cancel subscription at end of billing period?")) return;
    const result = await cancelSubscription();
    if (result.error) toast.error(result.error);
    else toast.success("Subscription will cancel at period end");
  }

  const usage = data?.usage;
  const bidPercent =
    usage && usage.bidsLimit !== -1
      ? Math.round((usage.bidsUsed / usage.bidsLimit) * 100)
      : 0;

  return (
    <div>
      <DashboardHeader title="Billing" />

      <div className="space-y-6 p-6">
        {isLoading ? (
          <PageLoader label="Loading billing..." />
        ) : (
          <>
            {data?.subscription && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    {(data.subscription as Subscription & { plan: Plan }).plan?.name || "Free"}{" "}
                    — {data.subscription.status}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usage && (
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>
                          Bids used: {usage.bidsUsed}/
                          {usage.bidsLimit === -1 ? "∞" : usage.bidsLimit}
                        </span>
                        <span>{bidPercent}%</span>
                      </div>
                      {usage.bidsLimit !== -1 && <Progress value={bidPercent} />}
                    </div>
                  )}
                  {data.subscription.cancel_at_period_end ? (
                    <Badge variant="destructive">Cancels at period end</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Cancel Subscription
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <div>
              <h2 className="mb-4 text-lg font-semibold">Choose a Plan</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Pay securely with cryptocurrency (BTC, ETH, or USDT)
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(data?.plans as Plan[])?.map((plan) => (
                  <Card
                    key={plan.id}
                    className={
                      data?.subscription?.plan_id === plan.id
                        ? "border-primary ring-1 ring-primary"
                        : ""
                    }
                  >
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="text-3xl font-bold">
                        {formatCurrency(plan.price_cents)}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm">
                        {(plan.features as string[]).map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Bitcoin className="h-4 w-4" /> Pay with Crypto
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleCryptoPayment(plan.id, "btc")}
                        >
                          BTC
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleCryptoPayment(plan.id, "eth")}
                        >
                          ETH
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleCryptoPayment(plan.id, "usdt")}
                        >
                          USDT
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.transactions as Transaction[])?.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">No transactions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.transactions as Transaction[])?.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{formatDate(tx.created_at)}</TableCell>
                          <TableCell className="capitalize">{tx.type}</TableCell>
                          <TableCell className="capitalize">
                            {tx.payment_method.replace("_", " ")}
                          </TableCell>
                          <TableCell>{formatCurrency(tx.amount_cents, tx.currency)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={tx.status === "completed" ? "default" : "secondary"}
                            >
                              {tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
