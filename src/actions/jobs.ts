"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { unwrapRelation } from "@/lib/utils";
import { generateCoverLetter, calculateMatchScore } from "@/lib/ai/cover-letter";
import type { Job } from "@/types";

async function getAuthUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export interface JobSearchParams {
  search?: string;
  skills?: string[];
  minSalary?: number;
  maxSalary?: number;
  page?: number;
  pageSize?: number;
}

export async function searchJobs(params: JobSearchParams = {}) {
  const { supabase, userId } = await getAuthUserId();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: existingBids } = await supabase
    .from("bids")
    .select("job_id, job_title, company")
    .eq("user_id", userId);

  const bidJobIds = new Set(
    (existingBids ?? []).map((b) => b.job_id).filter(Boolean) as string[]
  );
  const bidKeys = new Set(
    (existingBids ?? []).map((b) => `${b.job_title}::${b.company}`)
  );

  let query = supabase
    .from("jobs")
    .select("*, source:job_sources(name, slug)", { count: "exact" })
    .order("posted_at", { ascending: false, nullsFirst: false });

  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,company.ilike.%${params.search}%,description.ilike.%${params.search}%`
    );
  }
  if (params.minSalary != null) {
    query = query.gte("salary_min", params.minSalary);
  }
  if (params.maxSalary != null) {
    query = query.lte("salary_max", params.maxSalary);
  }
  if (params.skills?.length) {
    query = query.overlaps("skills", params.skills);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  const filtered = (data ?? []).filter((job) => {
    if (job.id && bidJobIds.has(job.id)) return false;
    if (bidKeys.has(`${job.title}::${job.company}`)) return false;
    return true;
  });

  return {
    data: filtered as (Job & { source?: { name: string; slug: string } })[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

export async function submitManualBid(jobId: string, profileId: string) {
  const { supabase, userId } = await getAuthUserId();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { error: "Job not found" };
  }

  const { data: existingBid } = await supabase
    .from("bids")
    .select("id")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingBid) {
    return { error: "Already applied to this job" };
  }

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

  try {
    const matchScore = await calculateMatchScore(
      profile.skills,
      job.skills ?? [],
      job.description || ""
    );

    const coverLetter = await generateCoverLetter({
      profile,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description || "",
    });

    const { data: bid, error: bidError } = await supabase
      .from("bids")
      .insert({
        user_id: userId,
        profile_id: profileId,
        job_id: jobId,
        job_title: job.title,
        company: job.company,
        job_url: job.url,
        cover_letter: coverLetter,
        match_score: matchScore,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        application_data: {
          manual_bid: true,
          match_score: matchScore,
          submitted_via: "manual_bid_page",
        },
      })
      .select()
      .single();

    if (bidError) {
      return { error: bidError.message };
    }

    await supabase
      .from("users")
      .update({ bids_used: (user?.bids_used ?? 0) + 1 })
      .eq("id", userId);

    revalidatePath("/dashboard/bids");
    revalidatePath("/dashboard/manual-bid");

    return {
      success: true,
      data: {
        bidId: bid.id,
        jobTitle: job.title,
        company: job.company,
        matchScore,
        coverLetter,
      },
    };
  } catch (err) {
    return { error: (err as Error).message || "Failed to submit bid" };
  }
}
