"use client";

import React, { useState, useMemo } from "react";
import { Role, DepositStatus } from "@prisma/client";
import { Plus, Landmark, Clock, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { DepositEntrySheet, ChurchUserOption } from "./deposit-entry-sheet";
import { DepositConfirmationSheet, DepositWithDetails } from "./deposit-confirmation-sheet";

export interface DepositsViewProps {
  deposits: any[];
  churchUsers: ChurchUserOption[];
  currentUser: {
    id: string;
    name: string;
    role: Role;
  };
}

export function DepositsView({
  deposits: initialDeposits,
  churchUsers,
  currentUser,
}: DepositsViewProps) {
  const [isDepositEntryOpen, setIsDepositEntryOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const isTreasurer = currentUser.role === Role.TREASURER;
  const isSecretary = currentUser.role === Role.FINANCE_SECRETARY;
  const canWrite = isSecretary || isTreasurer;

  const pendingDepositsCount = useMemo(() => {
    return initialDeposits.filter(
      (d) => d.status === DepositStatus.PENDING_CONFIRMATION
    ).length;
  }, [initialDeposits]);

  const filteredDeposits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return initialDeposits.filter((d) => {
      if (statusFilter === "PENDING" && d.status !== DepositStatus.PENDING_CONFIRMATION) {
        return false;
      }
      if (statusFilter === "CONFIRMED" && d.status !== DepositStatus.CONFIRMED) {
        return false;
      }
      if (q) {
        const ref = (d.bankReference || "").toLowerCase();
        const acc = (d.bankAccount?.accountName || "").toLowerCase();
        if (!ref.includes(q) && !acc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [initialDeposits, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-text leading-[34px]">
            Deposits
          </h1>
          <p className="text-[14px] text-muted leading-[20px] mt-0.5">
            Bank cash deposits, mobile money account transfers, and deposit slips.
          </p>
        </div>

        {canWrite && (
          <Button
            variant="primary"
            onClick={() => setIsDepositEntryOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Record deposit
          </Button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-surface border border-border rounded-control self-start">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              statusFilter === "ALL"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            All <span className="num ml-1">({initialDeposits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              statusFilter === "PENDING"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Pending confirmation{" "}
            {pendingDepositsCount > 0 && (
              <span className="num ml-1">({pendingDepositsCount})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("CONFIRMED")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              statusFilter === "CONFIRMED"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Confirmed
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bank reference..."
            className="w-full h-[40px] pl-9 pr-3 bg-surface border border-border-strong rounded-control text-[14px] text-text placeholder:text-muted focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          />
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Deposits Table */}
      {initialDeposits.length === 0 ? (
        <EmptyState
          title="No bank deposits recorded"
          description="Record bank deposit slips and transfer slips to reconcile counted cash and mobile money against bank statements."
          actionLabel={canWrite ? "Record first deposit" : undefined}
          onAction={canWrite ? () => setIsDepositEntryOpen(true) : undefined}
        />
      ) : filteredDeposits.length === 0 ? (
        <EmptyState
          title="No matching deposits found"
          description="Try adjusting your status filter or search query."
          actionLabel="Clear filters"
          onAction={() => {
            setStatusFilter("ALL");
            setSearchQuery("");
          }}
        />
      ) : (
        <div className="border border-border rounded-panel bg-surface overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[12px] font-medium text-muted bg-hover/50">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Bank & Reference</th>
                <th className="py-3 px-4">Depositor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[14px]">
              {filteredDeposits.map((deposit) => {
                const date = new Date(deposit.depositDate);
                const isConfirmed = deposit.status === DepositStatus.CONFIRMED;

                return (
                  <tr
                    key={deposit.id}
                    onClick={() => setSelectedDeposit(deposit)}
                    className="hover:bg-hover transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-text font-medium text-[13px]">
                      {formatAccraDate(date, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[13px] text-muted">
                      {deposit.kind === "CASH_DEPOSIT"
                        ? "Cash Deposit"
                        : "MoMo Transfer"}
                    </td>
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-medium text-text">
                        {deposit.bankAccount?.bankName || "Bank Account"}
                      </div>
                      <div className="text-[12px] text-muted num truncate max-w-sm">
                        {deposit.bankReference || "No reference"}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[13px] text-muted">
                      {deposit.depositorName || deposit.user?.name || "Officer"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant={isConfirmed ? "balanced" : "attention"}
                      >
                        {isConfirmed ? "Confirmed" : "Pending Confirmation"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-semibold num text-text">
                      {formatMoney(deposit.amount.toString())}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Deposit Entry Sheet */}
      <DepositEntrySheet
        isOpen={isDepositEntryOpen}
        onClose={() => setIsDepositEntryOpen(false)}
        users={churchUsers}
        cashHeld="0.00"
        momoHeld="0.00"
      />

      {/* Deposit Confirmation Sheet */}
      {selectedDeposit && (
        <DepositConfirmationSheet
          isOpen={true}
          onClose={() => setSelectedDeposit(null)}
          deposit={selectedDeposit}
          isTreasurer={isTreasurer}
        />
      )}
    </div>
  );
}
