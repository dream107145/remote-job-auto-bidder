import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { unwrapRelation } from "@/lib/utils";

async function verifyAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();

  const [{ data: transactions }, { count: activeSubs }, { data: subs }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("subscriptions")
        .select("*, plan:plans(price_cents)")
        .eq("status", "active"),
    ]);

  const totalRevenue =
    transactions?.reduce((sum, t) => sum + t.amount_cents, 0) ?? 0;

  const mrr =
    subs?.reduce((sum, s) => {
      const plan = unwrapRelation(s.plan);
      return sum + (plan?.price_cents ?? 0);
    }, 0) ?? 0;

  const revenueByDate = new Map<string, number>();
  transactions?.forEach((tx) => {
    const date = tx.created_at.split("T")[0];
    revenueByDate.set(date, (revenueByDate.get(date) || 0) + tx.amount_cents);
  });

  const revenueOverTime = Array.from(revenueByDate.entries()).map(
    ([date, amount]) => ({
      date,
      count: amount / 100,
    })
  );

  return NextResponse.json({
    success: true,
    mrr,
    totalRevenue,
    activeSubscriptions: activeSubs ?? 0,
    revenueOverTime,
    transactions: transactions ?? [],
  });
}
