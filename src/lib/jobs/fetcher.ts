import { createServiceClient } from "@/lib/supabase/server";

export interface FetchedJob {
  sourceId: string;
  externalId: string;
  title: string;
  company: string;
  description: string;
  url: string;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string | null;
  skills: string[];
  location: string | null;
  postedAt: string | null;
  rawData: Record<string, unknown>;
}

async function fetchWeWorkRemotely(sourceId: string): Promise<FetchedJob[]> {
  try {
    const res = await fetch("https://weworkremotely.com/categories/remote-programming-jobs.rss");
    const text = await res.text();

    const jobs: FetchedJob[] = [];
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];

    for (const item of items) {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || "";
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1] || "";
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

      const parts = title.split(": ");
      const company = parts[0] || "Unknown";
      const jobTitle = parts.slice(1).join(": ") || title;

      jobs.push({
        sourceId,
        externalId: link,
        title: jobTitle,
        company,
        description: description.replace(/<[^>]*>/g, "").slice(0, 5000),
        url: link,
        salaryMin: null,
        salaryMax: null,
        jobType: "full-time",
        skills: extractSkills(description),
        location: "Remote",
        postedAt: pubDate ? new Date(pubDate).toISOString() : null,
        rawData: { title, link },
      });
    }

    return jobs;
  } catch (error) {
    console.error("WeWorkRemotely fetch error:", error);
    return [];
  }
}

async function fetchRemoteOK(sourceId: string): Promise<FetchedJob[]> {
  try {
    const res = await fetch("https://remoteok.com/api");
    const data = await res.json();

    if (!Array.isArray(data)) return [];

    return data
      .filter((job: Record<string, unknown>) => job.id && job.position)
      .map((job: Record<string, unknown>) => ({
        sourceId,
        externalId: String(job.id),
        title: String(job.position),
        company: String(job.company || "Unknown"),
        description: String(job.description || "").slice(0, 5000),
        url: String(job.url || `https://remoteok.com/remote-jobs/${job.id}`),
        salaryMin: job.salary_min ? Number(job.salary_min) : null,
        salaryMax: job.salary_max ? Number(job.salary_max) : null,
        jobType: String(job.job_type || "full-time"),
        skills: (job.tags as string[]) || [],
        location: String(job.location || "Remote"),
        postedAt: job.date ? new Date(String(job.date)).toISOString() : null,
        rawData: job as Record<string, unknown>,
      }));
  } catch (error) {
    console.error("RemoteOK fetch error:", error);
    return [];
  }
}

function extractSkills(text: string): string[] {
  const commonSkills = [
    "JavaScript", "TypeScript", "Python", "React", "Node.js", "Go", "Rust",
    "Java", "Ruby", "PHP", "Swift", "Kotlin", "AWS", "Docker", "Kubernetes",
    "PostgreSQL", "MongoDB", "GraphQL", "Next.js", "Vue", "Angular", "Django",
    "Flask", "Rails", "Laravel", "Terraform", "CI/CD", "Git",
  ];

  const lower = text.toLowerCase();
  return commonSkills.filter((skill) => lower.includes(skill.toLowerCase()));
}

export async function fetchJobsFromSources(sourceId?: string): Promise<FetchedJob[]> {
  const supabase = createServiceClient();

  let query = supabase.from("job_sources").select("*").eq("status", "active");
  if (sourceId) {
    query = query.eq("id", sourceId);
  }

  const { data: sources } = await query;

  if (!sources?.length) return [];

  const allJobs: FetchedJob[] = [];

  for (const source of sources) {
    let jobs: FetchedJob[] = [];

    switch (source.slug) {
      case "weworkremotely":
        jobs = await fetchWeWorkRemotely(source.id);
        break;
      case "remoteok":
        jobs = await fetchRemoteOK(source.id);
        break;
      default:
        break;
    }

    allJobs.push(...jobs);

    await supabase
      .from("job_sources")
      .update({ last_sync_at: new Date().toISOString(), last_error: null })
      .eq("id", source.id);
  }

  return allJobs;
}
