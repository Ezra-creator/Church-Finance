"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role, ServiceType } from "@prisma/client";
import { Plus, Calendar, ArrowRight, ShieldAlert } from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { createServiceRecordAction } from "../actions";
import { ServiceSummaryItem } from "../queries";

interface TodayServiceListProps {
  services: ServiceSummaryItem[];
  userRole: Role;
  todayAccraDateString: string;
}

export function TodayServiceList({
  services,
  userRole,
  todayAccraDateString,
}: TodayServiceListProps) {
  const router = useRouter();
  const [isStartCountOpen, setIsStartCountOpen] = useState(false);
  const [serviceDate, setServiceDate] = useState(todayAccraDateString);
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.SUNDAY);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const canStartCount =
    userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  const handleStartCount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const res = await createServiceRecordAction({
        serviceDate,
        serviceType,
        title: title.trim() || null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setFormError(res.error.message);
        return;
      }

      addToast("success", "Service record initiated. Loading count ledger...");
      setIsStartCountOpen(false);
      router.push(`/services/${res.data.id}`);
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <RuleHeading
        eyebrow="Service Collections"
        title="Parish Count Ledger"
        description="Daily offering collections, denomination verification and tithe registers."
        action={
          canStartCount ? (
            <Button variant="primary" onClick={() => setIsStartCountOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Start a count
            </Button>
          ) : undefined
        }
      />

      {/* Ruled List of Recent Services */}
      {services.length === 0 ? (
        <EmptyState
          title="No service records found"
          description="Physical cash counts have not been initiated yet. Begin the first verified count for today's service."
          action={
            canStartCount ? (
              <Button
                variant="secondary"
                onClick={() => setIsStartCountOpen(true)}
              >
                Start a count
              </Button>
            ) : (
              <span className="text-xs text-ink-soft font-mono">
                Waiting for Finance Secretary or Treasurer to initiate count
              </span>
            )
          }
        />
      ) : (
        <div className="border border-rule rounded-[2px] bg-paper divide-y divide-rule">
          {services.map((srv) => (
            <Link
              key={srv.id}
              href={`/services/${srv.id}`}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ink/[0.02] transition-colors group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base sm:text-lg text-ink font-normal group-hover:underline">
                    {formatAccraDate(new Date(srv.serviceDate), {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <StatusMark
                    tone={
                      srv.status === "COUNTED"
                        ? "balanced"
                        : srv.status === "LOCKED"
                        ? "neutral"
                        : "attention"
                    }
                    label={srv.status}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                  <span className="font-mono uppercase font-semibold text-ink">
                    {srv.serviceType}
                  </span>
                  {srv.title && <span>• {srv.title}</span>}
                  {srv.witnessName && (
                    <span>• Witnessed by {srv.witnessName}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right">
                  <span className="font-mono text-base sm:text-lg font-semibold tabular-nums text-ink">
                    GH₵ {srv.grandTotal.toFixed(2)}
                  </span>
                  <span className="block text-[10px] uppercase font-mono text-ink-soft">
                    {srv.categoryTotals.length} categories
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Start Count Sheet */}
      <Sheet
        isOpen={isStartCountOpen}
        onClose={() => setIsStartCountOpen(false)}
        title="Start Cash Count"
        description="Select the service date and type to open a verified count sheet."
      >
        <form onSubmit={handleStartCount} className="space-y-4 py-3">
          {formError && (
            <div className="p-3 bg-variance text-variance text-xs rounded-[2px] border border-variance/30">
              {formError}
            </div>
          )}

          <TextField
            id="service-date"
            type="date"
            label="Service Date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            required
          />

          <Select
            id="service-type"
            label="Service Type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            options={[
              { value: ServiceType.SUNDAY, label: "Sunday Service" },
              { value: ServiceType.MIDWEEK, label: "Midweek / Wednesday Service" },
              { value: ServiceType.SPECIAL, label: "Special / Thanksgiving Service" },
              { value: ServiceType.OTHER, label: "Other Gathering / Vigil" },
            ]}
          />

          <TextField
            id="service-title"
            label="Service Title (Optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Annual Harvest & Thanksgiving"
          />

          <TextField
            id="service-notes"
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning and second service combined count"
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-rule">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setIsStartCountOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Opening sheet..." : "Open count ledger"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
