"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatAccraDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";
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

  // Filters from query params
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

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="p-4 border border-rule rounded-[2px] bg-paper space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-ink-soft">
          <Filter className="w-3.5 h-3.5" />
          Filter Audit Log
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Entity Type"
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
          >
            <option value="">All Entities</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>

          <TextField
            label="From Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <TextField
            label="To Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
          <Button
            variant="quiet"
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
      <div className="border border-rule rounded-[2px] divide-y divide-rule bg-paper">
        {/* Header */}
        <div className="hidden md:grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider font-medium text-ink-soft bg-ink/[0.02]">
          <div className="col-span-3">Timestamp</div>
          <div className="col-span-3">Action</div>
          <div className="col-span-3">Officer</div>
          <div className="col-span-3 text-right">Entity</div>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft font-mono">
            No audit records match the selected criteria.
          </div>
        ) : (
          items.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <div key={entry.id} className="transition-colors">
                <button
                  type="button"
                  onClick={() => toggleExpand(entry.id)}
                  className="w-full p-4 md:py-3 md:px-4 flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 text-left hover:bg-ink/[0.01] transition-colors cursor-pointer select-none"
                >
                  {/* Timestamp */}
                  <div className="md:col-span-3 flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-ink-soft flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-ink-soft flex-shrink-0" />
                    )}
                    <span className="font-mono text-xs text-ink">
                      {formatAccraDateTime(entry.createdAt)}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="md:col-span-3">
                    <span className="font-mono text-xs font-medium text-ink">
                      {entry.action}
                    </span>
                  </div>

                  {/* Officer */}
                  <div className="md:col-span-3">
                    {entry.actor ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-ink truncate">
                          {entry.actor.name}
                        </span>
                        <span className="text-[10px] text-ink-soft truncate font-mono">
                          {formatRole(entry.actor.role)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-soft font-mono italic">
                        System
                      </span>
                    )}
                  </div>

                  {/* Entity */}
                  <div className="md:col-span-3 md:text-right">
                    <span className="text-xs font-mono text-ink-soft">
                      {entry.entityType}
                    </span>
                  </div>
                </button>

                {/* Expandable Before / After Diff */}
                {isExpanded && (
                  <div className="p-4 bg-ink/[0.02] border-t border-rule space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Before State */}
                      <div className="border border-rule p-3 bg-paper">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-variance block mb-2">
                          Before
                        </span>
                        {entry.before ? (
                          <pre className="text-xs text-ink-soft overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(entry.before, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-xs text-ink-soft/60 italic">
                            (none)
                          </span>
                        )}
                      </div>

                      {/* After State */}
                      <div className="border border-rule p-3 bg-paper">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-balanced block mb-2">
                          After
                        </span>
                        {entry.after ? (
                          <pre className="text-xs text-ink-soft overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(entry.after, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-xs text-ink-soft/60 italic">
                            (none)
                          </span>
                        )}
                      </div>
                    </div>

                    {entry.reason && (
                      <div className="text-xs text-ink-soft pt-1">
                        <span className="font-semibold text-ink">Reason: </span>
                        {entry.reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-ink-soft pt-2">
          <span>
            Showing page {currentPage} of {totalPages} ({total} events)
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
