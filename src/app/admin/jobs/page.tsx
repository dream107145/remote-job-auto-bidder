"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminHeader } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { DataPagination } from "@/components/data-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Briefcase,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  Pencil,
  Database,
} from "lucide-react";
import type { Job, JobSource } from "@/types";

interface JobWithSource extends Job {
  source?: { name: string; slug: string };
}

interface JobsResponse {
  data: JobWithSource[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    totalJobs: number;
    activeSources: number;
    lastSyncAt: string | null;
  };
  sources: Pick<JobSource, "id" | "name" | "last_sync_at" | "status">[];
}

async function fetchJobs(params: Record<string, string>): Promise<JobsResponse> {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`/api/admin/jobs?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export default function AdminJobsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [editJob, setEditJob] = useState<JobWithSource | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    company: "",
    description: "",
    url: "",
    salary_min: "",
    salary_max: "",
    location: "",
    skills: "",
  });
  const [saving, setSaving] = useState(false);

  const queryKey = ["admin-jobs", search, sourceFilter, page];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchJobs({
        search,
        sourceId: sourceFilter === "all" ? "" : sourceFilter,
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      }),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey });
  }

  async function syncAll() {
    setSyncingAll(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-all" }),
      });
      const json = await res.json();
      if (!res.ok) toast.error(json.error || "Sync failed");
      else {
        toast.success(`Synced ${json.synced} jobs from all active sources`);
        queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["admin-job-sources"] });
      }
    } finally {
      setSyncingAll(false);
    }
  }

  async function syncSource(sourceId: string) {
    setSyncingSourceId(sourceId);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", sourceId }),
      });
      const json = await res.json();
      if (!res.ok) toast.error(json.error || "Sync failed");
      else {
        toast.success(`Synced ${json.synced} jobs`);
        queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["admin-job-sources"] });
      }
    } finally {
      setSyncingSourceId(null);
    }
  }

  function toggleJob(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    const jobs = data?.data ?? [];
    const allSelected = jobs.every((j) => selectedIds.has(j.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  }

  async function deleteJobs(ids: string[]) {
    if (!confirm(`Delete ${ids.length} job${ids.length > 1 ? "s" : ""}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: ids }),
      });
      const json = await res.json();
      if (!res.ok) toast.error(json.error || "Delete failed");
      else {
        toast.success(`Deleted ${json.deleted} job${json.deleted > 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      }
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(job: JobWithSource) {
    setEditJob(job);
    setEditForm({
      title: job.title,
      company: job.company,
      description: job.description || "",
      url: job.url,
      salary_min: job.salary_min?.toString() ?? "",
      salary_max: job.salary_max?.toString() ?? "",
      location: job.location || "",
      skills: (job.skills ?? []).join(", "),
    });
  }

  async function saveEdit() {
    if (!editJob) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: editJob.id,
          title: editForm.title,
          company: editForm.company,
          description: editForm.description,
          url: editForm.url,
          salary_min: editForm.salary_min ? Number(editForm.salary_min) : null,
          salary_max: editForm.salary_max ? Number(editForm.salary_max) : null,
          location: editForm.location || null,
          skills: editForm.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) toast.error(json.error || "Update failed");
      else {
        toast.success("Job updated");
        setEditJob(null);
        queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      }
    } finally {
      setSaving(false);
    }
  }

  const jobs = data?.data ?? [];
  const allOnPageSelected = jobs.length > 0 && jobs.every((j) => selectedIds.has(j.id));

  return (
    <div>
      <AdminHeader title="Jobs">
        <Button onClick={syncAll} disabled={syncingAll} className="gap-2">
          {syncingAll ? (
            <>
              <Spinner size="sm" /> Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Sync All Jobs
            </>
          )}
        </Button>
      </AdminHeader>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Database className="h-5 w-5 text-muted-foreground" />
                {isLoading ? <Spinner size="sm" /> : data?.stats.totalJobs ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Spinner size="sm" /> : data?.stats.activeSources ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {isLoading ? (
                  <Spinner size="sm" />
                ) : data?.stats.lastSyncAt ? (
                  formatDateTime(data.stats.lastSyncAt)
                ) : (
                  "Never"
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Sync Job Listings
            </CardTitle>
            <CardDescription>
              Pull remote jobs from active sources into the database. Users browse these jobs in
              Manual Bid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data?.sources?.map((source) => (
                <Button
                  key={source.id}
                  variant="outline"
                  size="sm"
                  disabled={source.status !== "active" || syncingAll || syncingSourceId === source.id}
                  onClick={() => syncSource(source.id)}
                  className="gap-2"
                >
                  {syncingSourceId === source.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {source.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Job Database</CardTitle>
                <CardDescription>
                  {data?.total ?? 0} jobs
                  {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
                </CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={() => deleteJobs(Array.from(selectedIds))}
                  className="gap-2"
                >
                  {deleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                  Delete Selected
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Select
                value={sourceFilter}
                onValueChange={(v) => {
                  setSourceFilter(v);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {data?.sources?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isFetching}>
                {isFetching ? (
                  <>
                    <Spinner size="sm" className="mr-2" /> Searching...
                  </>
                ) : (
                  "Search"
                )}
              </Button>
            </form>

            {isLoading ? (
              <PageLoader label="Loading jobs..." />
            ) : jobs.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                No jobs in the database. Sync from active sources to populate listings.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleAllOnPage}
                          className="h-4 w-4 rounded border-input"
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(job.id)}
                            onChange={() => toggleJob(job.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {job.title}
                        </TableCell>
                        <TableCell>{job.company}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.source?.name || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {job.salary_min || job.salary_max
                            ? `$${job.salary_min?.toLocaleString() ?? "?"} – $${job.salary_max?.toLocaleString() ?? "?"}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {job.posted_at ? formatDate(job.posted_at) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(job)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deleting}
                              onClick={() => deleteJobs([job.id])}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {data && (
                  <DataPagination
                    page={page}
                    totalPages={data.totalPages}
                    total={data.total}
                    pageSize={DEFAULT_PAGE_SIZE}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editJob} onOpenChange={(open) => !open && setEditJob(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update job listing details in the database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={editForm.url}
                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-salary-min">Min Salary</Label>
                <Input
                  id="edit-salary-min"
                  type="number"
                  value={editForm.salary_min}
                  onChange={(e) => setEditForm({ ...editForm, salary_min: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary-max">Max Salary</Label>
                <Input
                  id="edit-salary-max"
                  type="number"
                  value={editForm.salary_max}
                  onChange={(e) => setEditForm({ ...editForm, salary_max: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-skills">Skills (comma-separated)</Label>
              <Input
                id="edit-skills"
                value={editForm.skills}
                onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={5}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditJob(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
