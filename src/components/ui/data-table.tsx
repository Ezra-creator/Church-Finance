import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface DataTableColumn<T> {
  key?: string;
  accessorKey?: string;
  header: string;
  align?: "left" | "right" | "center";
  isNumeric?: boolean;
  render?: (row: T) => React.ReactNode;
  cell?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor?: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
  "aria-label"?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor = (row: T) => (row.id ? String(row.id) : JSON.stringify(row)),
  onRowClick,
  className,
  emptyMessage = "No records found",
  "aria-label": ariaLabel = "Data table",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-body text-muted border border-border rounded-panel bg-surface">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={twMerge("w-full border border-border rounded-panel bg-surface overflow-hidden", className)}>
      {/* Desktop & Tablet Table (40px header, 44px rows, no zebra) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label={ariaLabel}>
          <thead>
            <tr className="h-10 border-b border-border bg-surface text-caption font-medium text-muted select-none">
              {columns.map((col) => {
                const colKey = col.key || col.accessorKey || col.header;
                const isNum = col.isNumeric || col.align === "right";
                return (
                  <th
                    key={colKey}
                    scope="col"
                    className={clsx(
                      "px-4 text-caption font-medium text-muted whitespace-nowrap",
                      isNum ? "text-right tnum tabular-nums" : col.align === "center" ? "text-center" : "text-left"
                    )}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => {
              const rowKey = keyExtractor(row);
              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(
                    "h-11 transition-colors duration-120 hover:bg-hover bg-surface",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col) => {
                    const colKey = (col.key || col.accessorKey || col.header) as keyof T;
                    const isNum = col.isNumeric || col.align === "right";
                    const content = col.render ? col.render(row) : (col.cell ? col.cell(row) : row[colKey]);
                    return (
                      <td
                        key={String(colKey)}
                        className={clsx(
                          "px-4 text-body text-text whitespace-nowrap",
                          isNum ? "text-right tnum tabular-nums" : col.align === "center" ? "text-center" : "text-left"
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Rows (<640px) */}
      <div className="sm:hidden divide-y divide-border" role="region" aria-label={`${ariaLabel} mobile`}>
        {data.map((row) => {
          const rowKey = keyExtractor(row);
          return (
            <div
              key={rowKey}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                "p-4 space-y-2 bg-surface",
                onRowClick && "cursor-pointer active:bg-hover"
              )}
            >
              {columns.map((col) => {
                const colKey = (col.key || col.accessorKey || col.header) as keyof T;
                const isNum = col.isNumeric || col.align === "right";
                const content = col.render ? col.render(row) : (col.cell ? col.cell(row) : row[colKey]);
                return (
                  <div key={String(colKey)} className="flex items-center justify-between gap-4 text-body">
                    <span className="text-caption text-muted font-medium">{col.header}</span>
                    <span className={clsx("text-text", isNum && "text-right tnum tabular-nums font-medium")}>
                      {content}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
