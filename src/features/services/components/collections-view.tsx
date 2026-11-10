"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { MoneyText } from "@/components/ui/money-text";
import { EmptyState } from "@/components/ui/empty-state";

export interface SerializedServiceSummaryItem {
  id: string;
  serviceDate: string | Date;
  serviceType: string;
  title: string | null;
  status: string;
  grandTotal: string;
  countedBy?: { name: string | null } | null;
  witnessName?: string | null;
}

export interface CollectionsViewProps {
  services: SerializedServiceSummaryItem[];
}

export function CollectionsView({ services }: CollectionsViewProps) {
  const router = useRouter();

  const columns: Column<SerializedServiceSummaryItem>[] = [
    {
      header: "Date",
      cell: (item) => format(new Date(item.serviceDate), "EEE d MMM yyyy"),
      className: "w-[180px]",
    },
    {
      header: "Service",
      cell: (item) => item.title || item.serviceType,
    },
    {
      header: "Counted by",
      cell: (item) => item.countedBy?.name || item.witnessName || "Staff",
      hideBelow: "md",
      className: "w-[160px]",
    },
    {
      header: "Status",
      cell: (item) => (
        <Badge
          variant={
            item.status === "LOCKED"
              ? "balanced"
              : item.status === "COUNTED"
              ? "neutral"
              : "attention"
          }
        >
          {item.status === "LOCKED"
            ? "Locked"
            : item.status === "COUNTED"
            ? "Counted"
            : "Open"}
        </Badge>
      ),
      className: "w-[120px]",
    },
    {
      header: "Total",
      align: "right",
      isNumeric: true,
      className: "w-[160px]",
      cell: (item) => <MoneyText amount={item.grandTotal} variant="inline" />,
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Collections"
        primaryAction={
          <Link href="/services/new">
            <Button variant="primary">Record a count</Button>
          </Link>
        }
        phonePrimaryAction={
          <Link href="/services/new">
            <button
              type="button"
              className="h-[40px] px-4 rounded-control bg-surface text-brand font-medium text-[14px] touch-target"
            >
              Record a count
            </button>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1120px] 2xl:max-w-[1280px] w-full">
        <DataTable
          columns={columns}
          data={services}
          keyExtractor={(item) => item.id}
          getRowHref={(item) => `/services/${item.id}`}
          mobileRow={(item) => (
            <div className="min-h-[56px] p-3 px-4 flex flex-col justify-center">
              <div className="flex items-center justify-between text-[14px] font-medium leading-[20px]">
                <span>{item.title || item.serviceType}</span>
                <MoneyText amount={item.grandTotal} variant="inline" />
              </div>
              <div className="flex items-center justify-between text-[13px] text-muted leading-[18px] mt-0.5">
                <span>{format(new Date(item.serviceDate), "EEE d MMM")}</span>
                <Badge
                  variant={
                    item.status === "LOCKED"
                      ? "balanced"
                      : item.status === "COUNTED"
                      ? "neutral"
                      : "attention"
                  }
                >
                  {item.status}
                </Badge>
              </div>
            </div>
          )}
          emptyState={
            <EmptyState
              title="No collections recorded"
              description="Record physical Sunday collections and giving envelopes."
              actionLabel="Record a count"
              onAction={() => router.push("/services/new")}
            />
          }
          ariaLabel="Collections list"
        />
      </div>
    </div>
  );
}
