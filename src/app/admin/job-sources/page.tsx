"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminHeader } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Globe } from "lucide-react";
import type { JobSource } from "@/types";

const statusIcons = {
  active: <CheckCircle className="h-4 w-4 text-green-500" />,
  inactive: <XCircle className="h-4 w-4 text-muted-foreground" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
};

async function fetchJobSources(): Promise<JobSource[]> {
  const res = await fetch("/api/admin/job-sources");
  if (!res.ok) throw new Error("Failed to fetch job sources");
  return (await res.json()).data;
}

export default function AdminJobSourcesPage() {
  const queryClient = useQueryClient();
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: sources, isLoading } = useQuery({
    queryKey: ["admin-job-sources"],
    queryFn: fetchJobSources,
  });

  async function syncAll() {
    setSyncingAll(true);
    try {
      const res = await fetch("/api/admin/job-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-all" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Sync failed");
      } else {
        toast.success(`Synced ${json.synced} jobs from all active sources`);
        queryClient.invalidateQueries({ queryKey: ["admin-job-sources"] });
      }
    } finally {
      setSyncingAll(false);
    }
  }

  async function syncSource(sourceId: string) {
    setSyncingId(sourceId);
    try {
      const res = await fetch("/api/admin/job-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, action: "sync" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Sync failed");
      } else {
        toast.success(`Synced ${json.synced} jobs`);
        queryClient.invalidateQueries({ queryKey: ["admin-job-sources"] });
      }
    } finally {
      setSyncingId(null);
    }
  }

  async function toggleStatus(sourceId: string, currentStatus: string) {
    setTogglingId(sourceId);
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/job-sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, status: newStatus }),
      });
      if (!res.ok) toast.error("Update failed");
      else {
        toast.success(`Source ${newStatus}`);
        queryClient.invalidateQueries({ queryKey: ["admin-job-sources"] });
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <AdminHeader title="Job Sources">
        <Button onClick={syncAll} disabled={syncingAll} className="gap-2">
          {syncingAll ? (
            <>
              <Spinner size="sm" /> Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Sync All Job Listings
            </>
          )}
        </Button>
      </AdminHeader>

      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> Remote Job Sources
            </CardTitle>
            <CardDescription>
              Manage job API sources and sync remote job listings into the platform.
              Users browse synced jobs in Manual Bid — only admins can sync here.
            </CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? (
          <PageLoader label="Loading job sources..." />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Last Error</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources?.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {source.api_url}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusIcons[source.status]}
                          <Badge variant={source.status === "active" ? "default" : "secondary"}>
                            {source.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {source.last_sync_at ? formatDateTime(source.last_sync_at) : "Never"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-destructive">
                        {source.last_error || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => syncSource(source.id)}
                            disabled={syncingAll || syncingId === source.id}
                            title="Sync this source"
                          >
                            {syncingId === source.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(source.id, source.status)}
                            disabled={togglingId === source.id}
                          >
                            {togglingId === source.id ? (
                              <Spinner size="sm" />
                            ) : source.status === "active" ? (
                              "Disable"
                            ) : (
                              "Enable"
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
