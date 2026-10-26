"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { ArrowLeft, Download, FileText, Calendar, Plus, ExternalLink } from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { formatCedi } from "@/lib/money";
import { formatAccraDate, formatAccraDateTime, nowUtc, toAccraDateString } from "@/lib/dates";

interface StatementHistoryItem {
  id: string;
  rangeStart: Date;
  rangeEnd: Date;
  createdAt: Date;
  generatedBy: {
    id: string;
    name: string | null;
    email: string | null;
    role: Role;
  };
}

interface MonthLedgerItem {
  monthKey: string;
  monthName: string;
  cashTotal: { toString(): string };
  momoTotal: { toString(): string };
  total: { toString(): string };
  items: Array<{
    date: string;
    method: "CASH" | "MOMO";
    categoryName: string;
    receiptOrRef: string | null;
    amount: { toString(): string };
  }>;
}

interface MemberDetailViewProps {
  member: {
    id: string;
    fullName: string;
    memberNumber: string | null;
    phone: string | null;
    active: boolean;
    createdAt: Date;
  };
  year: number;
  months: MonthLedgerItem[];
  categoryTotals: Array<{
    categoryId: string;
    categoryName: string;
    total: { toString(): string };
  }>;
  grandTotal: { toString(): string };
  statementHistory: StatementHistoryItem[];
  userRole: Role;
}

export function MemberDetailView({
  member,
  year,
  months,
  categoryTotals,
  grandTotal,
  statementHistory,
  userRole,
}: MemberDetailViewProps) {
  const [selectedYear, setSelectedYear] = useState(year);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  const todayStr = toAccraDateString(nowUtc());
  const [rangeStart, setRangeStart] = useState(`${selectedYear}-01-01`);
  const [rangeEnd, setRangeEnd] = useState(todayStr < `${selectedYear}-12-31` ? todayStr : `${selectedYear}-12-31`);

  const canGenerateStatement =
    userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  const handleDownloadStatement = () => {
    const url = `/api/statements/member/${member.id}?from=${rangeStart}&to=${rangeEnd}`;
    window.open(url, "_blank");
    setIsStatementModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Member Directory
        </Link>
      </div>

      {/* Member Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-rule">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-serif font-normal text-ink">
              {member.fullName}
            </h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-[1px] font-mono uppercase tracking-wider ${
                member.active ? "bg-emerald-50 text-emerald-700" : "bg-ink/5 text-ink-soft"
              }`}
            >
              {member.active ? "Active" : "Archived"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft font-mono">
            <span>ID: <strong>{member.memberNumber || "No ID assigned"}</strong></span>
            <span>Phone: <strong>{member.phone || "None"}</strong></span>
            <span>Enrolled: {formatAccraDate(member.createdAt)}</span>
          </div>
        </div>

        {canGenerateStatement && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setIsStatementModalOpen(true)}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Create giving statement
            </Button>
          </div>
        )}
      </div>

      {/* Annual Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-wider text-ink-soft">
            Total Given in {selectedYear}
          </p>
          <p className="text-2xl font-mono font-semibold text-ink">
            {formatCedi(grandTotal)}
          </p>
        </div>
        <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-wider text-ink-soft">
            Primary Categories
          </p>
          <div className="text-xs font-mono text-ink space-y-0.5">
            {categoryTotals.slice(0, 2).map((cat) => (
              <p key={cat.categoryId} className="flex justify-between">
                <span>{cat.categoryName}:</span>
                <strong>{formatCedi(cat.total)}</strong>
              </p>
            ))}
            {categoryTotals.length === 0 && <p className="text-ink-soft">No contributions</p>}
          </div>
        </div>
        <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-wider text-ink-soft">
            Statements Issued
          </p>
          <p className="text-2xl font-mono font-semibold text-ink">
            {statementHistory.length}
          </p>
        </div>
      </div>

      {/* Ruled Ledger of Months */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-rule">
          <div>
            <h2 className="text-lg font-serif font-normal text-ink">
              Contribution Ledger ({selectedYear})
            </h2>
            <p className="text-xs text-ink-soft">
              Verified physical offerings and classified Mobile Money transactions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setSelectedYear(y);
                window.location.search = `?year=${y}`;
              }}
              className="h-8 px-2 text-xs font-mono bg-paper border border-rule rounded-[2px] text-ink focus:outline-none focus:border-ink"
            >
              {[year, year - 1, year - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-rule font-mono uppercase tracking-wider text-[11px] text-ink-soft">
                <th className="py-2.5 pr-4 font-normal">Month</th>
                <th className="py-2.5 px-3 text-right font-normal">Cash Offering</th>
                <th className="py-2.5 px-3 text-right font-normal">Mobile Money</th>
                <th className="py-2.5 pl-3 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule font-mono">
              {months.map((m) => {
                const isZero = m.total.toString() === "0" || m.total.toString() === "0.00";
                return (
                  <tr key={m.monthKey} className="hover:bg-ink/[0.02]">
                    <td className="py-2.5 pr-4 text-ink font-sans flex items-center gap-2">
                      <span>{m.monthName}</span>
                      {m.items.length > 0 && (
                        <span className="text-[10px] font-mono text-ink-soft">
                          ({m.items.length} gift{m.items.length > 1 ? "s" : ""})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                      {isZero ? "-" : formatCedi(m.cashTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                      {isZero ? "-" : formatCedi(m.momoTotal)}
                    </td>
                    <td className="py-2.5 pl-3 text-right tabular-nums font-semibold text-ink">
                      {isZero ? "-" : formatCedi(m.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-rule font-mono font-bold text-ink">
              <tr>
                <td className="py-3 pr-4 font-sans">ANNUAL TOTAL</td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {formatCedi(
                    months.reduce((acc, m) => acc + parseFloat(m.cashTotal.toString()), 0)
                  )}
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {formatCedi(
                    months.reduce((acc, m) => acc + parseFloat(m.momoTotal.toString()), 0)
                  )}
                </td>
                <td className="py-3 pl-3 text-right tabular-nums text-sm">
                  {formatCedi(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Statement Generation History */}
      <div className="space-y-4 pt-6 border-t border-rule">
        <h2 className="text-lg font-serif font-normal text-ink">
          Statement Issuance History
        </h2>
        {statementHistory.length === 0 ? (
          <p className="text-xs text-ink-soft font-mono">
            No official giving statements have been issued for this member yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-rule font-mono uppercase tracking-wider text-[11px] text-ink-soft">
                  <th className="py-2 pr-4 font-normal">Date Issued</th>
                  <th className="py-2 px-3 font-normal">Period Covered</th>
                  <th className="py-2 px-3 font-normal">Issued By</th>
                  <th className="py-2 pl-3 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-mono">
                {statementHistory.map((log) => {
                  const fromStr = formatAccraDate(log.rangeStart);
                  const toStr = formatAccraDate(log.rangeEnd);
                  const startIso = log.rangeStart.toISOString().slice(0, 10);
                  const endIso = log.rangeEnd.toISOString().slice(0, 10);

                  return (
                    <tr key={log.id} className="hover:bg-ink/[0.02]">
                      <td className="py-2.5 pr-4 text-ink">
                        {formatAccraDateTime(log.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-ink">
                        {fromStr} — {toStr}
                      </td>
                      <td className="py-2.5 px-3 text-ink-soft font-sans">
                        {log.generatedBy.name || log.generatedBy.email}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <Link
                          href={`/api/statements/member/${member.id}?from=${startIso}&to=${endIso}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-ink hover:underline text-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statement Generation Modal / Sheet */}
      <Sheet
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        title="Generate Official Giving Statement"
        description={`Produce an official statement for ${member.fullName}.`}
      >
        <div className="space-y-4 py-3">
          <div className="space-y-3">
            <TextField
              label="Period Start Date"
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
            <TextField
              label="Period End Date"
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </div>

          <div className="p-3 bg-paper border border-rule text-xs space-y-1 font-mono text-ink-soft">
            <p className="font-semibold text-ink">Strict Attribution Policy:</p>
            <p>
              Only contributions explicitly attributed to this member (cash tithe envelopes
              and confirmed MoMo transactions) will appear. General or unattributed giving is
              never included.
            </p>
          </div>

          <div className="pt-4 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsStatementModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleDownloadStatement}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download Statement PDF
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
