"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatAccraDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatRole } from "@/lib/format";

export interface AuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: Date | string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface AuditTableProps {
  items: AuditItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  entityTypes: string[];
}

export function AuditTable({
  items,
  total,
  currentPage,
  totalPages,
  entityTypes,
}: AuditTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentEntityType = searchParams.get("entityType") || "";
  const currentStartDate = searchParams.get("startDate") || "";
  const currentEndDate = searchParams.get("endDate") || "";

  const [selectedEntity, setSelectedEntity] = useState(currentEntityType);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (selectedEntity) params.set("entityType", selectedEntity);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setSelectedEntity("");
    setStartDate("");
    setEndDate("");
    router.push(pathname);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderObjectDiff = (data: unknown, comparison: unknown, isAfter: boolean) => {
    if (!data || typeof data !== "object") {
      return (
        <span className="text-caption text-muted">
          {data === null || data === undefined ? "(none)" : String(data)}
        </span>
      );
    }

    const obj = data as Record<string, unknown>;
    const compObj = (comparison && typeof comparison === "object" ? comparison : {}) as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return <span className="text-caption text-muted">(empty)</span>;
    }

    return (
      <div className="space-y-1 text-caption">
        {keys.map((key) => {
          const val = obj[key];
          const compVal = compObj[key];
          const isChanged = JSON.stringify(val) !== JSON.stringify(compVal);

          return (
            <div
              key={key}
              className={`p-1.5 rounded-control transition-colors ${
                isChanged
                  ? "bg-accent-tint text-accent font-medium"
                  : "text-muted"
              }`}
            >
              <span className="font-medium mr-1.5 text-text">{key}:</span>
              <span>
                {val === null || val === undefined
                  ? "null"
                  : typeof val === "object"
                  ? JSON.stringify(val)
                  : String(val)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="p-4 border border-border rounded-panel bg-surface space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Entity type"
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
          >
            <option value="">All entity types</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>

          <TextField
            label="From date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <TextField
            label="To date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={applyFilters}
          >
            Apply filters
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      {items.length === 0 ? (
        <div className="p-8 text-center text-body text-muted border border-border rounded-panel bg-surface">
          No audit records match the selected criteria.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block border border-border rounded-panel overflow-hidden bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((entry) => {
                  const isExpanded = expandedId === entry.id;

                  return (
                    <React.Fragment key={entry.id}>
                      <TableRow
                        onClick={() => toggleExpand(entry.id)}
                        className="cursor-pointer"
                      >
                        <TableCell className="w-10 pr-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted" strokeWidth={1.75} />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted" strokeWidth={1.75} />
                          )}
                        </TableCell>
                        <TableCell className="text-text text-caption tnum whitespace-nowrap">
                          {formatAccraDateTime(entry.createdAt)}
                        </TableCell>
                        <TableCell>
                          {entry.actor ? (
                            <div>
                              <span className="text-body font-medium text-text block truncate">
                                {entry.actor.name}
                              </span>
                              <span className="text-caption text-muted">
                                {formatRole(entry.actor.role)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-caption text-muted">System</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-text text-body">
                          {entry.action}
                        </TableCell>
                        <TableCell className="text-muted text-caption">
                          {entry.entityType}
                        </TableCell>
                      </TableRow>

                      {/* Expandable Before / After Diff */}
                      {isExpanded && (
                        <TableRow className="bg-page hover:bg-page">
                          <TableCell colSpan={5} className="p-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-border rounded-panel p-3 bg-surface space-y-2">
                                  <span className="text-caption font-medium text-muted block">
                                    Before
                                  </span>
                                  {renderObjectDiff(entry.before, entry.after, false)}
                                </div>

                                <div className="border border-border rounded-panel p-3 bg-surface space-y-2">
                                  <span className="text-caption font-medium text-muted block">
                                    After
                                  </span>
                                  {renderObjectDiff(entry.after, entry.before, true)}
                                </div>
                              </div>

                              {entry.reason && (
                                <p className="text-caption text-muted">
                                  <span className="font-medium text-text">Reason: </span>
                                  {entry.reason}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Collapsed Two-Line Rows */}
          <div className="sm:hidden border border-border rounded-panel bg-surface divide-y divide-border">
            {items.map((entry) => {
              const isExpanded = expandedId === entry.id;

              return (
                <div key={entry.id} className="divide-y divide-border">
                  <button
                    type="button"
                    onClick={() => toggleExpand(entry.id)}
                    className="w-full p-3.5 flex flex-col gap-1.5 text-left hover:bg-page transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted flex-shrink-0" strokeWidth={1.75} />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" strokeWidth={1.75} />
                        )}
                        <span className="font-medium text-body text-text truncate">
                          {entry.action}
                        </span>
                      </div>
                      <span className="text-caption tnum text-muted flex-shrink-0">
                        {formatAccraDateTime(entry.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-caption text-muted pl-5">
                      <span className="truncate">
                        {entry.actor?.name || "System"}
                        {entry.actor?.role ? ` (${formatRole(entry.actor.role)})` : ""}
                      </span>
                      <span className="text-muted flex-shrink-0">
                        {entry.entityType}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-3 bg-page space-y-3">
                      <div className="space-y-3">
                        <div className="border border-border rounded-panel p-3 bg-surface space-y-1.5">
                          <span className="text-caption font-medium text-muted block">
                            Before
                          </span>
                          {renderObjectDiff(entry.before, entry.after, false)}
                        </div>

                        <div className="border border-border rounded-panel p-3 bg-surface space-y-1.5">
                          <span className="text-caption font-medium text-muted block">
                            After
                          </span>
                          {renderObjectDiff(entry.after, entry.before, true)}
                        </div>
                      </div>

                      {entry.reason && (
                        <p className="text-caption text-muted">
                          <span className="font-medium text-text">Reason: </span>
                          {entry.reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-caption text-muted pt-2">
          <span>
            Page {currentPage} of {totalPages} ({total} events)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
