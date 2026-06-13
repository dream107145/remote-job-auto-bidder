"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { DataPagination } from "@/components/data-pagination";
import { BidHistoryTable } from "@/components/bids/bid-history-table";
import { DEFAULT_PAGE_SIZE, MANUAL_BID_HISTORY_PAGE_SIZE } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { submitManualBid } from "@/actions/jobs";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Hand,
  History,
} from "lucide-react";
import type { Bid, Profile, Job } from "@/types";

interface JobWithSource extends Job {
  source?: { name: string; slug: string };
}

interface JobsResponse {
  data: JobWithSource[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type BidProgressItem = {
  jobId: string;
  jobTitle: string;
  company: string;
  status: "pending" | "processing" | "success" | "error";
  message?: string;
  matchScore?: number;
};

async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch("/api/profiles");
  if (!res.ok) throw new Error("Failed to fetch profiles");
  return (await res.json()).data;
}

async function fetchJobs(params: Record<string, string>): Promise<JobsResponse> {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`/api/jobs?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

async function fetchManualBidHistory(
  page: number,
  profileId?: string
): Promise<{
  data: Bid[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({
    bidType: "manual",
    page: String(page),
    pageSize: String(MANUAL_BID_HISTORY_PAGE_SIZE),
    sortBy: "created_at",
    sortOrder: "desc",
  });
  if (profileId) params.set("profileId", profileId);
  const res = await fetch(`/api/bids?${params}`);
  if (!res.ok) throw new Error("Failed to fetch manual bid history");
  return res.json();
}

export default function ManualBidPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [profileId, setProfileId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBidding, setIsBidding] = useState(false);
  const [bidProgress, setBidProgress] = useState<BidProgressItem[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });

  const { data: manualHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["manual-bids", historyPage, profileId],
    queryFn: () => fetchManualBidHistory(historyPage, profileId || undefined),
  });

  const queryKey = ["manual-jobs", search, skillFilter, minSalary, maxSalary, page];

  const { data: jobsData, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchJobs({
        search,
        skills: skillFilter,
        minSalary,
        maxSalary,
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      }),
    enabled: !!profileId,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey });
  }

  function toggleJob(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!jobsData?.data) return;
    const allSelected = jobsData.data.every((j) => selectedIds.has(j.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobsData.data.map((j) => j.id)));
    }
  }

  async function handleStartBidding() {
    if (!profileId) {
      toast.error("Select a profile first");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Select at least one job");
      return;
    }

    const selectedJobs = jobsData?.data.filter((j) => selectedIds.has(j.id)) ?? [];

    const initial: BidProgressItem[] = selectedJobs.map((j) => ({
      jobId: j.id,
      jobTitle: j.title,
      company: j.company,
      status: "pending",
    }));

    setBidProgress(initial);
    setProgressPercent(0);
    setIsBidding(true);

    let completed = 0;
    let successCount = 0;
    const total = selectedJobs.length;

    for (const job of selectedJobs) {
      setBidProgress((prev) =>
        prev.map((p) => (p.jobId === job.id ? { ...p, status: "processing" } : p))
      );

      const result = await submitManualBid(job.id, profileId);

      completed++;
      if (result.success) successCount++;
      setProgressPercent(Math.round((completed / total) * 100));

      setBidProgress((prev) =>
        prev.map((p) =>
          p.jobId === job.id
            ? {
                ...p,
                status: result.success ? "success" : "error",
                message: result.error,
                matchScore: result.data?.matchScore,
              }
            : p
        )
      );

      if (result.error?.includes("Bid limit reached")) {
        toast.error(result.error);
        break;
      }
    }

    setIsBidding(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["bids"] });
    queryClient.invalidateQueries({ queryKey: ["manual-bids"] });

    toast.success(`Submitted ${successCount} of ${total} applications`);
  }

  const jobs = jobsData?.data ?? [];
  const allOnPageSelected = jobs.length > 0 && jobs.every((j) => selectedIds.has(j.id));

  if (profilesLoading) {
    return (
      <div>
        <DashboardHeader title="Manual Bid" />
        <PageLoader label="Loading profiles..." />
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Manual Bid" />

      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5" /> Manual Bid Mode
            </CardTitle>
            <CardDescription>
              Search synced remote jobs, select the ones you want, and apply with AI-generated
              cover letters. Job listings are synced by admins in the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bidding Profile</Label>
              <Select
                value={profileId}
                onValueChange={(value) => {
                  setProfileId(value);
                  setHistoryPage(1);
                }}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select a profile to bid with" />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.skills.slice(0, 3).join(", ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search title, company, description..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Input
                placeholder="Skills (comma-separated)"
                className="w-48"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Min salary"
                className="w-32"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Max salary"
                className="w-32"
                value={maxSalary}
                onChange={(e) => setMaxSalary(e.target.value)}
              />
              <Button type="submit" disabled={!profileId || isFetching}>
                {isFetching ? (
                  <>
                    <Spinner size="sm" className="mr-2" /> Searching...
                  </>
                ) : (
                  "Search"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {(isBidding || bidProgress.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bidding Progress</CardTitle>
              <CardDescription>
                {isBidding
                  ? "Generating cover letters and submitting applications..."
                  : "Last batch complete"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progressPercent}% complete</span>
                  <span>
                    {bidProgress.filter((p) => p.status === "success").length} /{" "}
                    {bidProgress.length} succeeded
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {bidProgress.map((item) => (
                  <div
                    key={item.jobId}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{item.jobTitle}</span>
                      <span className="text-muted-foreground"> at {item.company}</span>
                      {item.matchScore != null && (
                        <Badge variant="secondary" className="ml-2">
                          {item.matchScore}% match
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === "processing" && <Spinner size="sm" />}
                      {item.status === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === "error" && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-4 w-4" />
                          {item.message}
                        </span>
                      )}
                      {item.status === "pending" && (
                        <span className="text-muted-foreground">Waiting</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Available Jobs</CardTitle>
                <CardDescription>
                  {!profileId
                    ? "Select a profile to search jobs"
                    : `${jobsData?.total ?? 0} jobs found · ${selectedIds.size} selected`}
                </CardDescription>
              </div>
              <Button
                onClick={handleStartBidding}
                disabled={!profileId || selectedIds.size === 0 || isBidding}
                className="gap-2"
              >
                {isBidding ? (
                  <>
                    <Spinner size="sm" /> Bidding...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Apply to Selected ({selectedIds.size})
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!profileId ? (
              <p className="py-12 text-center text-muted-foreground">
                Choose a profile above to browse and bid on jobs.
              </p>
            ) : isLoading || isFetching ? (
              <PageLoader label="Loading jobs..." />
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
                  No jobs found. Ask an admin to sync job listings, or adjust your filters.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleAll}
                          disabled={isBidding}
                          className="h-4 w-4 rounded border-input"
                        />
                      </TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className={selectedIds.has(job.id) ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(job.id)}
                            onChange={() => toggleJob(job.id)}
                            disabled={isBidding}
                            className="h-4 w-4 rounded border-input"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{job.company}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              (job as JobWithSource).source?.slug === "indeed"
                                ? "border-blue-500 text-blue-700 dark:text-blue-400"
                                : ""
                            }
                          >
                            {(job as JobWithSource).source?.name || "Remote"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {job.salary_min || job.salary_max
                            ? `$${job.salary_min?.toLocaleString() ?? "?"} – $${job.salary_max?.toLocaleString() ?? "?"}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[180px] flex-wrap gap-1">
                            {(job.skills ?? []).slice(0, 3).map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                            {(job.skills?.length ?? 0) > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{job.skills!.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {job.posted_at ? formatDate(job.posted_at) : "—"}
                        </TableCell>
                        <TableCell>
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {jobsData && (
                  <DataPagination
                    className="px-4 pb-4"
                    page={page}
                    totalPages={jobsData.totalPages}
                    total={jobsData.total}
                    pageSize={DEFAULT_PAGE_SIZE}
                    onPageChange={setPage}
                    disabled={isBidding}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Manual Bid History
            </CardTitle>
            <CardDescription>
              Saved applications from manual bidding
              {profileId && manualHistory?.total != null
                ? ` · ${manualHistory.total} total`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <BidHistoryTable
              bids={manualHistory?.data ?? []}
              total={manualHistory?.total ?? 0}
              page={historyPage}
              pageSize={MANUAL_BID_HISTORY_PAGE_SIZE}
              totalPages={manualHistory?.totalPages ?? 0}
              isLoading={historyLoading}
              onPageChange={setHistoryPage}
              emptyMessage="No manual bids yet. Select jobs above and apply to build your history."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
