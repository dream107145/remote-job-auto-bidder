"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/spinner";
import { DataPagination } from "@/components/data-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BID_STATUS_LABELS, BID_STATUS_COLORS } from "@/lib/constants";
import { formatDate, isManualBid } from "@/lib/utils";
import type { Bid } from "@/types";

interface BidHistoryTableProps {
  bids: Bid[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  emptyMessage?: string;
  showTypeBadge?: boolean;
}

export function BidHistoryTable({
  bids,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  onPageChange,
  emptyMessage = "No bids found",
  showTypeBadge = false,
}: BidHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <PageLoader label="Loading bid history..." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Match</TableHead>
            <TableHead>Status</TableHead>
            {showTypeBadge && <TableHead>Type</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bids.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showTypeBadge ? 7 : 6}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            bids.map((bid) => (
              <Fragment key={bid.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandedId(expandedId === bid.id ? null : bid.id)}
                >
                  <TableCell>{formatDate(bid.submitted_at || bid.created_at)}</TableCell>
                  <TableCell className="font-medium">{bid.job_title}</TableCell>
                  <TableCell>{bid.company}</TableCell>
                  <TableCell>
                    {(bid.profile as { name: string } | undefined)?.name || "—"}
                  </TableCell>
                  <TableCell>
                    {bid.match_score != null ? `${bid.match_score}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={BID_STATUS_COLORS[bid.status]}>
                      {BID_STATUS_LABELS[bid.status]}
                    </Badge>
                  </TableCell>
                  {showTypeBadge && (
                    <TableCell>
                      <Badge variant={isManualBid(bid) ? "default" : "secondary"}>
                        {isManualBid(bid) ? "Manual" : "Auto"}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
                {expandedId === bid.id && (
                  <TableRow>
                    <TableCell
                      colSpan={showTypeBadge ? 7 : 6}
                      className="bg-muted/30 p-4"
                    >
                      <div className="space-y-3">
                        {bid.job_url && (
                          <p className="text-sm">
                            <span className="font-medium">URL:</span>{" "}
                            <a
                              href={bid.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {bid.job_url}
                            </a>
                          </p>
                        )}
                        {"indeed_apply" in (bid.application_data || {}) &&
                          bid.application_data.indeed_apply != null && (
                          <p className="text-sm">
                            <span className="font-medium">Indeed Apply:</span>{" "}
                            {String(
                              (bid.application_data.indeed_apply as { message?: string }).message ||
                                "Processed"
                            )}
                          </p>
                        )}
                        {bid.cover_letter && (
                          <div>
                            <p className="text-sm font-medium">Cover Letter:</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                              {bid.cover_letter}
                            </p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>

      <DataPagination
        className="px-4 pb-4"
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </>
  );
}

export function BidHistoryEmptyActions() {
  return (
    <Button variant="link" className="mt-2 h-auto p-0" asChild>
      <Link href="/dashboard/manual-bid">Go to Manual Bid</Link>
    </Button>
  );
}
