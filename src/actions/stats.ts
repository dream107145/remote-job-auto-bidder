import { createServiceClient } from "@/lib/supabase/server";

export interface PlatformStats {
  jobSitesCount: number;
  usersCount: number;
  successfulBidsCount: number;
  successRate: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = createServiceClient();

  const [
    { count: jobSitesCount },
    { count: usersCount },
    { count: successfulBidsCount },
    { count: totalBidsCount },
  ] = await Promise.all([
    supabase
      .from("job_sources")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted"),
    supabase.from("bids").select("*", { count: "exact", head: true }),
  ]);

  const total = totalBidsCount ?? 0;
  const successful = successfulBidsCount ?? 0;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

  return {
    jobSitesCount: jobSitesCount ?? 0,
    usersCount: usersCount ?? 0,
    successfulBidsCount: successful,
    successRate,
  };
}
