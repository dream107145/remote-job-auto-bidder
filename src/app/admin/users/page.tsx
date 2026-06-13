"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminHeader } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { formatDate } from "@/lib/utils";
import { Ban, CheckCircle, Search } from "lucide-react";
import { useState } from "react";
import type { User } from "@/types";

interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchUsers(search: string, page: number): Promise<UsersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(ADMIN_PAGE_SIZE),
  });
  if (search) params.set("search", search);
  const res = await fetch(`/api/admin/users?${params}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () => fetchUsers(search, page),
  });

  async function toggleBan(userId: string, isBanned: boolean) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isBanned: !isBanned }),
    });
    if (!res.ok) toast.error("Failed to update user");
    else {
      toast.success(isBanned ? "User unbanned" : "User banned");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  }

  return (
    <div>
      <AdminHeader title="User Management" />
      <div className="space-y-4 p-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <PageLoader label="Loading users..." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Bids Used</TableHead>
                      <TableHead>Profiles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.data.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.full_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.bids_used}</TableCell>
                          <TableCell>{user.profiles_used}</TableCell>
                          <TableCell>
                            {user.is_banned ? (
                              <Badge variant="destructive">Banned</Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleBan(user.id, user.is_banned)}
                            >
                              {user.is_banned ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Ban className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </TableCell>
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
