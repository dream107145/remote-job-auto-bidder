"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminHeader } from "@/components/layout/admin-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { DataPagination } from "@/components/data-pagination";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types";

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchAuditLogs(page: number): Promise<AuditLogsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(ADMIN_PAGE_SIZE),
  });
  const res = await fetch(`/api/admin/audit-logs?${params}`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", page],
    queryFn: () => fetchAuditLogs(page),
  });

  return (
    <div>
      <AdminHeader title="Audit Logs" />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <PageLoader label="Loading audit logs..." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No audit logs yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDateTime(log.created_at)}</TableCell>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell>
                            {log.entity_type}
                            {log.entity_id && ` (${log.entity_id.slice(0, 8)}...)`}
                          </TableCell>
                          <TableCell>{log.admin_id?.slice(0, 8) || "—"}...</TableCell>
                          <TableCell>{log.user_id?.slice(0, 8) || "—"}...</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {data && (
                  <DataPagination
                    className="px-4 pb-4"
                    page={page}
                    totalPages={data.totalPages}
                    total={data.total}
                    pageSize={ADMIN_PAGE_SIZE}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
