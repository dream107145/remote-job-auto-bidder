"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BidHistoryTable } from "@/components/bids/bid-history-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BID_STATUS_LABELS, BIDS_PER_PAGE } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Download, Search } from "lucide-react";
import type { Bid } from "@/types";
import * as XLSX from "xlsx";

interface BidsResponse {
  data: Bid[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchBids(params: Record<string, string>): Promise<BidsResponse> {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`/api/bids?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch bids");
  return res.json();
}

export default function BidsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [bidType, setBidType] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bids", page, status, bidType, search],
    queryFn: () =>
      fetchBids({
        page: String(page),
        pageSize: String(BIDS_PER_PAGE),
        status,
        bidType,
        search,
        sortBy: "created_at",
        sortOrder: "desc",
      }),
  });

  function exportToExcel() {
    if (!data?.data) return;
    const rows = data.data.map((bid) => ({
      Date: formatDate(bid.created_at),
      "Job Title": bid.job_title,
      Company: bid.company,
      Profile: (bid.profile as { name: string } | undefined)?.name || "",
      Type: bid.application_data?.manual_bid ? "Manual" : "Auto",
      Status: BID_STATUS_LABELS[bid.status],
      "Match Score": bid.match_score,
      Cost: formatCurrency(bid.bid_cost_cents),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bids");
    XLSX.writeFile(wb, `bids-export-${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  return (
    <div>
      <DashboardHeader title="Bid History">
        <Button size="sm" variant="outline" onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
      </DashboardHeader>

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs or companies..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={bidType}
            onValueChange={(v) => {
              setBidType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(BID_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <BidHistoryTable
              bids={data?.data ?? []}
              total={data?.total ?? 0}
              page={page}
              pageSize={BIDS_PER_PAGE}
              totalPages={data?.totalPages ?? 0}
              isLoading={isLoading}
              onPageChange={setPage}
              showTypeBadge
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
