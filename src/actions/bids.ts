"use server";

import { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/utils";
import { bidFilterSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import type { BidFilterInput } from "@/lib/validations";

async function getAuthUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function getBids(filters: Partial<BidFilterInput> = {}) {
  const { supabase, userId } = await getAuthUserId();

  const parsed = bidFilterSchema.parse({
    ...filters,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    sortBy: filters.sortBy ?? "created_at",
    sortOrder: filters.sortOrder ?? "desc",
  });
  const { page, pageSize, sortBy, sortOrder, status, bidType, profileId, search, dateFrom, dateTo } =
    parsed;

  let query = supabase
    .from("bids")
    .select("*, profile:profiles(name)", { count: "exact" })
    .eq("user_id", userId);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (bidType === "manual") {
    query = query.contains("application_data", { manual_bid: true });
  } else if (bidType === "auto") {
    query = query.contains("application_data", { auto_generated: true });
  }
  if (profileId) {
    query = query.eq("profile_id", profileId);
  }
  if (search) {
    query = query.or(`job_title.ilike.%${search}%,company.ilike.%${search}%`);
  }
  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

export async function updateBidStatus(bidId: string, status: string) {
  const { supabase, userId } = await getAuthUserId();

  const { data, error } = await supabase
    .from("bids")
    .update({ status })
    .eq("id", bidId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/bids");
  return { success: true, data };
}

export async function createBid(params: {
  profileId: string;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  coverLetter?: string;
  matchScore?: number;
}) {
  const { supabase, userId } = await getAuthUserId();

  const { data: user } = await supabase
    .from("users")
    .select("bids_used")
    .eq("id", userId)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan:plans(bid_limit)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();

  const plan = unwrapRelation(subscription?.plan);
  const bidLimit = plan?.bid_limit ?? 50;
  if (bidLimit !== -1 && (user?.bids_used ?? 0) >= bidLimit) {
    return { error: "Bid limit reached. Upgrade your plan." };
  }

  const { data: bid, error } = await supabase
    .from("bids")
    .insert({
      user_id: userId,
      profile_id: params.profileId,
      job_title: params.jobTitle,
      company: params.company,
      job_url: params.jobUrl || null,
      cover_letter: params.coverLetter || null,
      match_score: params.matchScore || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("users")
    .update({ bids_used: (user?.bids_used ?? 0) + 1 })
    .eq("id", userId);

  revalidatePath("/dashboard/bids");
  return { success: true, data: bid };
}

export async function getAnalytics() {
  const { supabase, userId } = await getAuthUserId();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: bids } = await supabase
    .from("bids")
    .select("*, profile:profiles(name)")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (!bids) return { successRate: [], dailyVolume: [], topCompanies: [], profilePerformance: [] };

  const dailyMap = new Map<string, { total: number; accepted: number; count: number }>();
  const companyMap = new Map<string, number>();
  const profileMap = new Map<string, { submitted: number; interview: number; accepted: number }>();

  for (const bid of bids) {
    const date = bid.created_at.split("T")[0];
    const existing = dailyMap.get(date) || { total: 0, accepted: 0, count: 0 };
    existing.count++;
    if (bid.status === "accepted") existing.accepted++;
    dailyMap.set(date, existing);

    companyMap.set(bid.company, (companyMap.get(bid.company) || 0) + 1);

    const profileName = unwrapRelation(bid.profile)?.name || "Unknown";
    const perf = profileMap.get(profileName) || { submitted: 0, interview: 0, accepted: 0 };
    if (bid.status === "submitted") perf.submitted++;
    if (bid.status === "interview") perf.interview++;
    if (bid.status === "accepted") perf.accepted++;
    profileMap.set(profileName, perf);
  }

  const successRate = Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    rate: stats.count > 0 ? Math.round((stats.accepted / stats.count) * 100) : 0,
  }));

  const dailyVolume = Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    count: stats.count,
  }));

  const topCompanies = Array.from(companyMap.entries())
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const profilePerformance = Array.from(profileMap.entries()).map(([profile, stats]) => ({
    profile,
    ...stats,
  }));

  return { successRate, dailyVolume, topCompanies, profilePerformance };
}
