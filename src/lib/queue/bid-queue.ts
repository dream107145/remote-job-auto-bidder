import { Queue, Worker, type Job } from "bullmq";
import { getRedisConnectionOptions } from "@/lib/redis";
import { createServiceClient } from "@/lib/supabase/server";
import { generateCoverLetter } from "@/lib/ai/cover-letter";
import { fetchJobsFromSources } from "@/lib/jobs/fetcher";
import { getResend } from "@/lib/resend";

export interface BidJobData {
  userId: string;
  profileId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  jobDescription: string;
}

let bidQueueInstance: Queue<BidJobData> | null = null;

export function getBidQueue() {
  if (!bidQueueInstance) {
    bidQueueInstance = new Queue<BidJobData>("bid-processing", {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return bidQueueInstance;
}

async function processBid(job: Job<BidJobData>) {
  const { userId, profileId, jobTitle, company, jobUrl, jobDescription } = job.data;
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!profile) throw new Error("Profile not found");

  const coverLetter = await generateCoverLetter({
    profile,
    jobTitle,
    company,
    jobDescription,
  });

  const { data: bid, error } = await supabase
    .from("bids")
    .insert({
      user_id: userId,
      profile_id: profileId,
      job_title: jobTitle,
      company,
      job_url: jobUrl,
      cover_letter: coverLetter,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      application_data: { auto_generated: true },
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { data: user } = await supabase
    .from("users")
    .select("email, bids_used")
    .eq("id", userId)
    .single();

  if (user) {
    await supabase
      .from("users")
      .update({ bids_used: (user.bids_used ?? 0) + 1 })
      .eq("id", userId);

    await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: user.email,
      subject: `Bid submitted: ${jobTitle} at ${company}`,
      html: `<p>Your auto-bid for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been submitted.</p>`,
    });
  }

  return bid;
}

export function startBidWorker() {
  const worker = new Worker<BidJobData>("bid-processing", processBid, {
    connection: getRedisConnectionOptions(),
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    console.log(`Bid job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Bid job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export async function scheduleJobSync(sourceId?: string) {
  const jobs = await fetchJobsFromSources(sourceId);
  const supabase = createServiceClient();

  for (const job of jobs) {
    await supabase.from("jobs").upsert(
      {
        source_id: job.sourceId,
        external_id: job.externalId,
        title: job.title,
        company: job.company,
        description: job.description,
        url: job.url,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        job_type: job.jobType,
        skills: job.skills,
        location: job.location,
        posted_at: job.postedAt,
        raw_data: job.rawData,
      },
      { onConflict: "source_id,external_id" }
    );
  }

  return jobs.length;
}

export async function processAutoBids() {
  const supabase = createServiceClient();

  const { data: settings } = await supabase
    .from("auto_bid_settings")
    .select("*, profile:profiles(*)")
    .eq("is_enabled", true);

  if (!settings) return 0;

  let queued = 0;

  for (const setting of settings) {
    const profile = setting.profile as Record<string, unknown>;
    if (!profile) continue;

    let jobsQuery = supabase
      .from("jobs")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(setting.daily_bid_limit);

    if (setting.min_salary) {
      jobsQuery = jobsQuery.gte("salary_min", setting.min_salary);
    }
    if (setting.max_salary) {
      jobsQuery = jobsQuery.lte("salary_max", setting.max_salary);
    }

    const { data: jobs } = await jobsQuery;

    if (!jobs) continue;

    for (const job of jobs) {
      if (setting.excluded_companies?.includes(job.company)) continue;

      if (setting.required_skills?.length) {
        const hasSkills = setting.required_skills.some((s: string) =>
          job.skills?.includes(s)
        );
        if (!hasSkills) continue;
      }

      const { data: existingBid } = await supabase
        .from("bids")
        .select("id")
        .eq("user_id", setting.user_id)
        .eq("job_title", job.title)
        .eq("company", job.company)
        .maybeSingle();

      if (existingBid) continue;

      await getBidQueue().add("process-bid", {
        userId: setting.user_id,
        profileId: setting.profile_id!,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        jobUrl: job.url,
        jobDescription: job.description || "",
      });

      queued++;
    }
  }

  return queued;
}
