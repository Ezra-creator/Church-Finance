"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role, ServiceType } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { MoneyText } from "@/components/ui/money-text";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { AttentionItem } from "@/lib/attention";
import { createServiceRecordAction, markBackupDoneAction } from "../actions";
import { ServiceSummaryItem } from "../queries";

interface TodayServiceListProps {
  services: ServiceSummaryItem[];
  userRole: Role;
  todayAccraDateString: string;
  churchName?: string;
  cashHeldFormatted: string;
  momoHeldFormatted: string;
  totalHeldFormatted: string;
  attentionItems: AttentionItem[];
  needsBackupReminder?: boolean;
  lastBackupDate?: string | null;
}

export function TodayServiceList({
  services,
  userRole,
  todayAccraDateString,
  cashHeldFormatted,
  momoHeldFormatted,
  totalHeldFormatted,
  attentionItems,
  needsBackupReminder = false,
  lastBackupDate = null,
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

  const handleMarkBackupDone = () => {
    startTransition(async () => {
      const res = await markBackupDoneAction();
      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }
      addToast("success", "Database backup recorded");
      router.refresh();
    });
  };

  const handleStartCount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const res = await createServiceRecordAction({
        serviceDate,
        serviceType,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.error.message);
        return;
      }

      setIsStartCountOpen(false);
      addToast("success", "Count sheet opened");
      router.push(`/services/${res.data.id}`);
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COUNTED":
        return <Badge variant="Balanced">Counted</Badge>;
      case "LOCKED":
        return <Badge variant="Neutral">Locked</Badge>;
      default:
        return <Badge variant="Needs attention">In progress</Badge>;
    }
  };

  const formatServiceType = (type: string) => {
    switch (type) {
      case "SUNDAY":
        return "Sunday service";
      case "MIDWEEK":
        return "Midweek service";
      case "SPECIAL":
        return "Special service";
      default:
        return "Other gathering";
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Header with exactly one primary button */}
      <PageHeader
        title="Home"
        action={
          canStartCount ? (
            <Button variant="primary" onClick={() => setIsStartCountOpen(true)}>
              Record a count
            </Button>
          ) : undefined
        }
      />

      {/* Single bordered totals strip with three columns and 1px vertical dividers */}
      <section aria-label="Financial totals summary">
        <div className="border border-border rounded-panel bg-surface grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-5 space-y-1">
            <span className="text-caption text-muted font-medium">
              Cash held
            </span>
            <div className="text-figure font-semibold text-text tnum tabular-nums leading-tight">
              {cashHeldFormatted}
            </div>
            <p className="text-caption text-muted">
              Counted cash waiting for deposit
            </p>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-caption text-muted font-medium">
              Mobile money held
            </span>
            <div className="text-figure font-semibold text-text tnum tabular-nums leading-tight">
              {momoHeldFormatted}
            </div>
            <p className="text-caption text-muted">
              Balance received in electronic wallet
            </p>
          </div>

          <div className="p-5 space-y-1">
            <span className="text-caption text-muted font-medium">
              Total unbanked
            </span>
            <div className="text-figure font-semibold text-text tnum tabular-nums leading-tight">
              {totalHeldFormatted}
            </div>
            <p className="text-caption text-muted">
              Cumulative unbanked church custody
            </p>
          </div>
        </div>
      </section>

      {/* Needs Attention List */}
      <section aria-labelledby="needs-attention-heading" className="space-y-3">
        <h2 id="needs-attention-heading" className="text-lead font-semibold text-text">
          Needs attention
        </h2>
        {attentionItems.length === 0 ? (
          <EmptyState
            title="All accounts are up to date"
            description="There are no pending mobile money reviews, unbanked cash alerts, or due remittances."
          />
        ) : (
          <div className="border border-border rounded-panel bg-surface divide-y divide-border">
            {attentionItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="p-4 flex items-center justify-between gap-4 hover:bg-hover transition-colors duration-120 block"
              >
                <div className="space-y-0.5">
                  <p className="text-body font-medium text-text">
                    {item.title}
                  </p>
                  {item.detail && (
                    <p className="text-caption text-muted">
                      {item.detail}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted flex-shrink-0 stroke-[1.75]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Collections Table (Limited to 8) */}
      <section aria-labelledby="recent-collections-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-collections-heading" className="text-lead font-semibold text-text">
            Recent collections
          </h2>
          <span className="text-caption text-muted">
            Showing up to 8 recent services
          </span>
        </div>

        {services.length === 0 ? (
          <EmptyState
            title="No collections recorded"
            description="Physical cash counts will appear here once recorded by the finance officers."
            action={
              canStartCount ? (
                <Button variant="secondary" onClick={() => setIsStartCountOpen(true)}>
                  Record a count
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            data={services}
            keyExtractor={(s) => s.id}
            onRowClick={(s) => router.push(`/services/${s.id}`)}
            columns={[
              {
                key: "serviceDate",
                header: "Date",
                render: (s) => (
                  <span className="font-medium text-text">
                    {formatAccraDate(new Date(s.serviceDate), {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
              {
                key: "serviceType",
                header: "Type",
                render: (s) => formatServiceType(s.serviceType),
              },
              {
                key: "title",
                header: "Source",
                render: (s) => s.title || "General collection",
              },
              {
                key: "grandTotal",
                header: "Amount",
                isNumeric: true,
                render: (s) => (
                  <MoneyText amount={s.grandTotal} className="font-semibold" />
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (s) => getStatusBadge(s.status),
              },
            ]}
          />
        )}
      </section>

      {/* Start Count Sheet */}
      <Sheet
        isOpen={isStartCountOpen}
        onClose={() => setIsStartCountOpen(false)}
        title="Start cash count"
        description="Select the service date and type to open a count sheet."
      >
        <form onSubmit={handleStartCount} className="space-y-4 py-2">
          {formError && (
            <div className="p-3 bg-bad-tint text-bad-ink text-caption rounded-control border border-bad">
              {formError}
            </div>
          )}

          <TextField
            id="service-date"
            type="date"
            label="Service date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            required
          />

          <Select
            id="service-type"
            label="Service type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            options={[
              { value: ServiceType.SUNDAY, label: "Sunday service" },
              { value: ServiceType.MIDWEEK, label: "Midweek service" },
              { value: ServiceType.SPECIAL, label: "Special service" },
              { value: ServiceType.OTHER, label: "Other gathering" },
            ]}
          />

          <TextField
            id="service-title"
            label="Service title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Harvest thanksgiving"
          />

          <TextField
            id="service-notes"
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Combined service"
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsStartCountOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending}>
              Open count sheet
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
