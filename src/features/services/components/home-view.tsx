"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { MoneyText } from "@/components/ui/money-text";
import { DataTable, Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { HomeCollectionItem } from "../home-queries";
import { AttentionItem } from "@/lib/attention";

export interface HomeViewProps {
  cashCounted: string;
  mobileMoney: string;
  totalThisWeek: string;
  attentionItems: AttentionItem[];
  recentCollections: HomeCollectionItem[];
}

export function HomeView({
  cashCounted,
  mobileMoney,
  totalThisWeek,
  attentionItems,
  recentCollections,
}: HomeViewProps) {
  const router = useRouter();

  const columns: Column<HomeCollectionItem>[] = [
    {
      header: "Date",
      accessorKey: "dateLabel",
      className: "w-[180px]",
    },
    {
      header: "Type",
      accessorKey: "type",
    },
    {
      header: "Source",
      accessorKey: "source",
      hideBelow: "md",
      className: "w-[160px]",
    },
    {
      header: "Amount",
      align: "right",
      isNumeric: true,
      className: "w-[180px]",
      cell: (item) => <MoneyText amount={item.amount.toString()} variant="inline" />,
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Top Bar with Week Selector and Primary Action */}
      <TopBar
        title="Home"
        hasWeekSelector={true}
        primaryAction={
          <Link href="/services/new">
            <Button variant="primary">Record a count</Button>
          </Link>
        }
        phonePrimaryAction={
          <Link href="/services/new">
            <button
              type="button"
              className="h-[40px] px-4 rounded-control bg-surface text-brand font-medium text-[14px] touch-target cursor-pointer select-none"
            >
              Record a count
            </button>
          </Link>
        }
      />

      {/* Main Content Area */}
      <div className="p-6 sm:p-8 lg:p-10 max-w-[1280px] 2xl:max-w-[1440px] w-full flex flex-col gap-6 lg:gap-8">
        {/* a) Totals Strip (matches mockup exactly) */}
        <div className="bg-surface border border-border rounded-panel p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Column 1: Cash counted */}
          <div className="pb-4 md:pb-0 md:pr-6">
            <div className="text-[13px] font-medium text-muted mb-1">
              Cash counted
            </div>
            <MoneyText amount={cashCounted} variant="headline" />
          </div>

          {/* Column 2: Mobile money */}
          <div className="py-4 md:py-0 md:px-6">
            <div className="text-[13px] font-medium text-muted mb-1">
              Mobile money
            </div>
            <MoneyText amount={mobileMoney} variant="headline" />
          </div>

          {/* Column 3: Total this week */}
          <div className="pt-4 md:pt-0 md:pl-6">
            <div className="text-[13px] font-medium text-muted mb-1">
              Total this week
            </div>
            <MoneyText amount={totalThisWeek} variant="headline" />
          </div>
        </div>

        {/* b) Needs Attention Section */}
        <section aria-labelledby="needs-attention-heading">
          <SectionTitle title="Needs attention" />
          <div className="bg-surface border border-border rounded-panel divide-y divide-border overflow-hidden">
            {attentionItems.length > 0 ? (
              attentionItems.map((item) => (
                <div
                  key={item.id}
                  className="min-h-[48px] px-4 py-3 flex flex-col xs:flex-row xs:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-warn flex-shrink-0" aria-hidden="true" />
                    <span className="text-[14px] text-text leading-[20px]">{item.message}</span>
                  </div>
                  <Link
                    href={item.href}
                    className="text-[14px] font-medium text-brand hover:underline self-start xs:self-auto flex-shrink-0"
                  >
                    {item.actionLabel}
                  </Link>
                </div>
              ))
            ) : (
              <div className="min-h-[48px] px-4 py-3 flex items-center gap-2.5 text-[14px] text-text">
                <Check className="w-4 h-4 text-ok-ink flex-shrink-0" aria-hidden="true" />
                <span>Everything is up to date for this week.</span>
              </div>
            )}
          </div>
        </section>

        {/* c) Recent Collections Section */}
        <section aria-labelledby="recent-collections-heading">
          <SectionTitle
            title="Recent collections"
            action={
              <Link href="/services" className="text-[13px] font-medium text-brand hover:underline">
                View all
              </Link>
            }
          />
          <DataTable
            columns={columns}
            data={recentCollections}
            keyExtractor={(item) => item.id}
            mobileRow={(item) => (
              <div className="min-h-[56px] p-3 px-4 flex flex-col justify-center">
                <div className="flex items-center justify-between text-[14px] font-medium leading-[20px]">
                  <span>{item.type}</span>
                  <MoneyText amount={item.amount.toString()} variant="inline" />
                </div>
                <div className="text-[13px] text-muted leading-[18px] mt-0.5">
                  {item.dateLabel} · {item.source}
                </div>
              </div>
            )}
            emptyState={
              <EmptyState
                title="No collections this week"
                description="Entries appear here once you record a count or import a mobile money statement."
                actionLabel="Record a count"
                onAction={() => router.push("/services/new")}
              />
            }
            ariaLabel="Recent collections table"
          />
        </section>
      </div>
    </div>
  );
}

