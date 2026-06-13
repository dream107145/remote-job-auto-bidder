import * as cheerio from "cheerio";
import type { FetchedJob } from "@/lib/jobs/fetcher";
import { extractSkills } from "@/lib/jobs/skills";

const INDEED_HOSTS: Record<string, string> = {
  us: "https://www.indeed.com",
  uk: "https://uk.indeed.com",
  ca: "https://ca.indeed.com",
};

const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export interface IndeedScraperConfig {
  searchQuery?: string;
  location?: string;
  country?: string;
  maxPages?: number;
  fetchDescriptions?: boolean;
}

interface IndeedListing {
  externalId: string;
  title: string;
  company: string;
  url: string;
  location: string | null;
  salaryText: string | null;
  snippet: string;
}

function getHost(country: string) {
  return INDEED_HOSTS[country] || INDEED_HOSTS.us;
}

function buildSearchUrl(
  host: string,
  query: string,
  location: string,
  start: number
): string {
  const params = new URLSearchParams({
    q: query,
    l: location,
    fromage: "14",
    sort: "date",
  });
  if (start > 0) params.set("start", String(start));
  return `${host}/jobs?${params.toString()}`;
}

function parseSalary(text: string | null): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const numbers = text.match(/[\d,]+(?:\.\d+)?/g)?.map((n) => Number(n.replace(/,/g, "")));
  if (!numbers?.length) return { min: null, max: null };
  if (numbers.length >= 2) return { min: numbers[0], max: numbers[1] };
  return { min: numbers[0], max: null };
}

function parseListingsFromHtml(html: string, host: string): IndeedListing[] {
  const $ = cheerio.load(html);
  const listings: IndeedListing[] = [];
  const seen = new Set<string>();

  $("div.job_seen_beacon, div.slider_item, div[data-testid='slider_item']").each((_, el) => {
    const card = $(el);
    const jk =
      card.attr("data-jk") ||
      card.find("[data-jk]").first().attr("data-jk") ||
      card.find("a[href*='jk=']").first().attr("href")?.match(/[?&]jk=([^&]+)/)?.[1];

    if (!jk || seen.has(jk)) return;
    seen.add(jk);

    const title =
      card.find("h2.jobTitle span").first().text().trim() ||
      card.find("a[data-jk]").first().text().trim() ||
      card.find("h2 a").first().text().trim();

    const company =
      card.find("[data-testid='company-name']").text().trim() ||
      card.find("span.companyName").text().trim() ||
      "Unknown";

    const location =
      card.find("[data-testid='text-location']").text().trim() ||
      card.find("div.companyLocation").text().trim() ||
      null;

    const salaryText =
      card.find("[data-testid='attribute_snippet_testid']").text().trim() ||
      card.find(".salary-snippet").text().trim() ||
      null;

    const snippet =
      card.find(".job-snippet").text().trim() ||
      card.find("[data-testid='job-snippet']").text().trim() ||
      "";

    const url = `${host}/viewjob?jk=${jk}`;

    if (title) {
      listings.push({
        externalId: jk,
        title,
        company,
        url,
        location,
        salaryText: salaryText || null,
        snippet,
      });
    }
  });

  if (listings.length === 0) {
    const scriptMatch = html.match(/window\.mosaic\.providerData\s*=\s*(\{[\s\S]*?\});/);
    if (scriptMatch) {
      try {
        const data = JSON.parse(scriptMatch[1]) as Record<string, unknown>;
        const jobCards = data["mosaic-provider-jobcards"] as
          | { metaData?: { mosaicProviderJobCardsModel?: { results?: Array<Record<string, unknown>> } } }
          | undefined;
        const results = jobCards?.metaData?.mosaicProviderJobCardsModel?.results ?? [];
        for (const job of results) {
          const jk = String(job.jobkey || job.jobKey || "");
          if (!jk || seen.has(jk)) continue;
          seen.add(jk);
          listings.push({
            externalId: jk,
            title: String(job.title || job.displayTitle || "Untitled"),
            company: String(job.company || job.companyName || "Unknown"),
            url: `${host}/viewjob?jk=${jk}`,
            location: job.formattedLocation ? String(job.formattedLocation) : null,
            salaryText: job.salarySnippet ? String(job.salarySnippet) : null,
            snippet: job.snippet ? String(job.snippet) : "",
          });
        }
      } catch {
        // fall through
      }
    }
  }

  return listings;
}

async function fetchJobDescription(host: string, jk: string): Promise<string> {
  try {
    const res = await fetch(`${host}/viewjob?jk=${jk}`, {
      headers: SCRAPE_HEADERS,
      next: { revalidate: 0 },
    });
    if (!res.ok) return "";
    const html = await res.text();
    const $ = cheerio.load(html);
    const description =
      $("#jobDescriptionText").text().trim() ||
      $(".jobsearch-JobComponent-description").text().trim() ||
      $('[id*="jobDescription"]').text().trim();
    return description.slice(0, 5000);
  } catch {
    return "";
  }
}

export async function scrapeIndeedJobs(
  sourceId: string,
  config: IndeedScraperConfig = {}
): Promise<FetchedJob[]> {
  const query = config.searchQuery || "remote software engineer";
  const location = config.location || "remote";
  const country = config.country || "us";
  const maxPages = Math.min(config.maxPages ?? 2, 5);
  const fetchDescriptions = config.fetchDescriptions !== false;
  const host = getHost(country);

  const allListings: IndeedListing[] = [];
  const seenIds = new Set<string>();

  for (let page = 0; page < maxPages; page++) {
    const url = buildSearchUrl(host, query, location, page * 10);
    const res = await fetch(url, { headers: SCRAPE_HEADERS, next: { revalidate: 0 } });

    if (!res.ok) {
      throw new Error(`Indeed search failed (${res.status})`);
    }

    const html = await res.text();
    const listings = parseListingsFromHtml(html, host);

    if (listings.length === 0 && page === 0) {
      throw new Error("No Indeed jobs found — page structure may have changed or request was blocked");
    }

    for (const listing of listings) {
      if (!seenIds.has(listing.externalId)) {
        seenIds.add(listing.externalId);
        allListings.push(listing);
      }
    }

    if (listings.length < 10) break;
  }

  const jobs: FetchedJob[] = [];

  for (const listing of allListings.slice(0, 100)) {
    const description = fetchDescriptions
      ? await fetchJobDescription(host, listing.externalId)
      : listing.snippet;
    const fullText = `${description} ${listing.snippet} ${listing.title}`;
    const { min, max } = parseSalary(listing.salaryText);

    jobs.push({
      sourceId,
      externalId: listing.externalId,
      title: listing.title,
      company: listing.company,
      description: description || listing.snippet,
      url: listing.url,
      salaryMin: min,
      salaryMax: max,
      jobType: listing.location?.toLowerCase().includes("remote") ? "remote" : "full-time",
      skills: extractSkills(fullText),
      location: listing.location || "Remote",
      postedAt: new Date().toISOString(),
      rawData: {
        jk: listing.externalId,
        salaryText: listing.salaryText,
        source: "indeed",
        country,
      },
    });
  }

  return jobs;
}
