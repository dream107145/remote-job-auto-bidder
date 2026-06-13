"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPageNumbers, getPaginationRange } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export interface DataPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function DataPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  disabled = false,
  className,
}: DataPaginationProps) {
  if (totalPages <= 1) return null;

  const { start, end } = getPaginationRange(page, pageSize, total);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{start.toLocaleString()}</span>
        {" – "}
        <span className="font-medium text-foreground">{end.toLocaleString()}</span>
        {" of "}
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>
        {" results"}
      </p>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={disabled || page <= 1}
              onClick={() => onPageChange(page - 1)}
            />
          </PaginationItem>

          {pages.map((p, index) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === page}
                  disabled={disabled}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              disabled={disabled || page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
