"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { unwrapRelation } from "@/lib/utils";
import { autoBidSettingsSchema, type AutoBidSettingsInput } from "@/lib/validations";

async function getAuthUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function getPlans() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getSubscription() {
  const { supabase, userId } = await getAuthUserId();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTransactions() {
  const { supabase, userId } = await getAuthUserId();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createCryptoPayment(planId: string, currency: "btc" | "eth" | "usdt") {
  const { supabase, userId } = await getAuthUserId();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    return { error: "Plan not found" };
  }

  const response = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: {
      "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: plan.price_cents / 100,
      price_currency: "usd",
      pay_currency: currency,
      order_id: `${userId}-${planId}-${Date.now()}`,
      order_description: `${plan.name} Plan Subscription`,
      ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/crypto/webhook`,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
    }),
  });

  if (!response.ok) {
    return { error: "Failed to create crypto payment" };
  }

  const invoice = await response.json();

  await supabase.from("transactions").insert({
    user_id: userId,
    type: "crypto",
    status: "pending",
    payment_method: `crypto_${currency}` as "crypto_btc" | "crypto_eth" | "crypto_usdt",
    amount_cents: plan.price_cents,
    metadata: { invoice_id: invoice.id, plan_id: planId },
  });

  return { url: invoice.invoice_url };
}

export async function cancelSubscription() {
  const { supabase, userId } = await getAuthUserId();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!subscription) {
    return { error: "No active subscription" };
  }

  await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("id", subscription.id);

  revalidatePath("/dashboard/billing");
  return { success: true };
}

export async function getUsageStats() {
  const { supabase, userId } = await getAuthUserId();

  const { data: user } = await supabase
    .from("users")
    .select("bids_used, profiles_used")
    .eq("id", userId)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan:plans(bid_limit, profile_limit)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();

  const plan = unwrapRelation(subscription?.plan);

  return {
    bidsUsed: user?.bids_used ?? 0,
    bidsLimit: plan?.bid_limit ?? 50,
    profilesUsed: user?.profiles_used ?? 0,
    profilesLimit: plan?.profile_limit ?? 1,
  };
}

export async function saveAutoBidSettings(data: AutoBidSettingsInput) {
  const { supabase, userId } = await getAuthUserId();

  const parsed = autoBidSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: settings, error } = await supabase
    .from("auto_bid_settings")
    .upsert(
      {
        user_id: userId,
        profile_id: parsed.data.profileId,
        is_enabled: parsed.data.isEnabled,
        min_salary: parsed.data.minSalary ?? null,
        max_salary: parsed.data.maxSalary ?? null,
        job_types: parsed.data.jobTypes || [],
        required_skills: parsed.data.requiredSkills || [],
        excluded_companies: parsed.data.excludedCompanies || [],
        daily_bid_limit: parsed.data.dailyBidLimit,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/auto-bid");
  return { success: true, data: settings };
}

export async function getAutoBidSettings() {
  const { supabase, userId } = await getAuthUserId();

  const { data, error } = await supabase
    .from("auto_bid_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
