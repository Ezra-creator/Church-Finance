"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Button } from "./button";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  isNumeric?: boolean;
  hideBelow?: "md" | "lg";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string;
  totalRow?: React.ReactNode;
  mobileRow?: (item: T) => React.ReactNode;
  getRowHref?: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalItems: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
  };
  ariaLabel?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor = (_, index) => String(index),
  totalRow,
  mobileRow,
  getRowHref,
  onRowClick,
  emptyState,
  pagination,
  ariaLabel = "Data table",
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const pageSize = pagination?.pageSize || 25;
  const startItem = pagination ? (pagination.currentPage - 1) * pageSize + 1 : 1;
  const endItem = pagination ? Math.min(pagination.currentPage * pageSize, pagination.totalItems) : data.length;

  return (
    <div className="w-full bg-surface border border-border rounded-panel overflow-hidden">
      {/* Mobile Stacked View (< 768px) */}
      <div className="block md:hidden divide-y divide-border">
        {data.map((item, index) => {
          const key = keyExtractor(item, index);
          const content = mobileRow ? (
            mobileRow(item)
          ) : (
            <div className="min-h-[56px] p-3 px-4 flex flex-col justify-center">
              <div className="flex items-center justify-between text-[14px] font-medium leading-[20px]">
                <span>
                  {(() => {
                    const firstCol = columns[0];
                    if (!firstCol) return "";
                    if (firstCol.cell) return firstCol.cell(item);
                    if (firstCol.accessorKey) return String(item[firstCol.accessorKey]);
                    return "";
                  })()}
                </span>
                <span className="num">
                  {(() => {
                    const lastCol = columns[columns.length - 1];
                    if (!lastCol) return "";
                    if (lastCol.cell) return lastCol.cell(item);
                    if (lastCol.accessorKey) return String(item[lastCol.accessorKey]);
                    return "";
                  })()}
                </span>
              </div>
            </div>
          );

          if (getRowHref) {
            return (
              <Link
                key={key}
                href={getRowHref(item)}
                className="block hover:bg-hover active:bg-hover transition-colors"
              >
                {content}
              </Link>
            );
          }

          if (onRowClick) {
            return (
              <div
                key={key}
                onClick={() => onRowClick(item)}
                className="cursor-pointer hover:bg-hover active:bg-hover transition-colors"
              >
                {content}
              </div>
            );
          }

          return <div key={key}>{content}</div>;
        })}
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label={ariaLabel}>
          <thead>
            <tr className="h-[40px] border-b border-border bg-surface text-[13px] font-medium text-muted">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={clsx(
                    "px-4 font-medium",
                    col.align === "right" || col.isNumeric ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.hideBelow === "lg" && "hidden lg:table-cell",
                    col.hideBelow === "md" && "hidden md:table-cell",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-[14px] text-text leading-[20px]">
            {data.map((item, index) => {
              const key = keyExtractor(item, index);
              const href = getRowHref ? getRowHref(item) : null;

              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={clsx(
                    "h-[44px] transition-colors",
                    (onRowClick || href) && "cursor-pointer hover:bg-hover"
                  )}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={clsx(
                        "px-4",
                        col.align === "right" || col.isNumeric ? "text-right num" : col.align === "center" ? "text-center" : "text-left",
                        col.hideBelow === "lg" && "hidden lg:table-cell",
                        col.hideBelow === "md" && "hidden md:table-cell",
                        col.className
                      )}
                    >
                      {href && cIdx === 0 ? (
                        <Link href={href} className="text-text hover:text-brand font-medium">
                          {col.cell ? col.cell(item) : col.accessorKey ? String(item[col.accessorKey]) : null}
                        </Link>
                      ) : col.cell ? (
                        col.cell(item)
                      ) : col.accessorKey ? (
                        String(item[col.accessorKey])
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {totalRow && (
            <tfoot>
              <tr className="h-[44px] border-t border-border-strong text-[14px] font-semibold text-text">
                {totalRow}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalItems > 0 && (
        <div className="h-[52px] px-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-muted">
          <span>
            Showing {startItem} to {endItem} of {pagination.totalItems}
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="flex-1 sm:flex-initial"
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={endItem >= pagination.totalItems}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="flex-1 sm:flex-initial"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
