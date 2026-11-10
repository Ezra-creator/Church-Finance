"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { InlineAlert } from "@/components/ui/inline-alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatMoney, toDecimal, Decimal } from "@/lib/money";
import { plural } from "@/lib/plural";
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

interface MonthRecordItem {
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
  months: MonthRecordItem[];
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

  const annualCashTotal = useMemo(
    () => months.reduce((acc, m) => acc.add(toDecimal(m.cashTotal.toString())), new Decimal(0)),
    [months]
  );

  const annualMomoTotal = useMemo(
    () => months.reduce((acc, m) => acc.add(toDecimal(m.momoTotal.toString())), new Decimal(0)),
    [months]
  );

  const handleDownloadStatement = () => {
    const url = `/api/statements/member/${member.id}?from=${rangeStart}&to=${rangeEnd}`;
    window.open(url, "_blank");
    setIsStatementModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/members"
          className="inline-flex items-center text-caption text-muted hover:text-text transition-colors min-h-[44px]"
        >
          Back to members
        </Link>
      </div>

      {/* Member Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-heading font-semibold text-text">
              {member.fullName}
            </h1>
            <Badge variant={member.active ? "Balanced" : "Neutral"}>
              {member.active ? "Active" : "Archived"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted">
            <span>Envelope or ID: <strong className="text-text tnum">{member.memberNumber || "None"}</strong></span>
            <span>Phone: <strong className="text-text tnum">{member.phone || "None"}</strong></span>
            <span>Enrolled: <span className="tnum">{formatAccraDate(member.createdAt)}</span></span>
          </div>
        </div>

        {canGenerateStatement && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setIsStatementModalOpen(true)}
            >
              Create giving statement
            </Button>
          </div>
        )}
      </div>

      {/* Annual Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-border bg-surface rounded-panel space-y-1">
          <p className="text-caption text-muted">
            Total given in {selectedYear}
          </p>
          <p className="text-heading font-semibold text-text tnum">
            {formatMoney(grandTotal.toString())}
          </p>
        </div>
        <div className="p-4 border border-border bg-surface rounded-panel space-y-1">
          <p className="text-caption text-muted">
            Primary categories
          </p>
          <div className="text-caption text-text space-y-1 pt-0.5">
            {categoryTotals.slice(0, 2).map((cat) => (
              <p key={cat.categoryId} className="flex justify-between">
                <span>{cat.categoryName}:</span>
                <strong className="tnum">{formatMoney(cat.total.toString())}</strong>
              </p>
            ))}
            {categoryTotals.length === 0 && <p className="text-muted">No contributions</p>}
          </div>
        </div>
        <div className="p-4 border border-border bg-surface rounded-panel space-y-1">
          <p className="text-caption text-muted">
            Statements issued
          </p>
          <p className="text-heading font-semibold text-text tnum">
            {statementHistory.length}
          </p>
        </div>
      </div>

      {/* Monthly contributions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h2 className="text-lead font-normal text-text">
              Contributions ({selectedYear})
            </h2>
            <p className="text-caption text-muted">
              Verified physical offerings and classified Mobile Money transactions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter contributions by year"
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setSelectedYear(y);
                window.location.search = `?year=${y}`;
              }}
              className="h-9 px-2.5 text-caption bg-surface border border-border rounded-control text-text focus:outline-none focus:border-border-strong"
            >
              {[year, year - 1, year - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Cash offering</TableHead>
              <TableHead className="text-right">Mobile Money</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((m) => {
              const dec = toDecimal(m.total.toString());
              const isZero = dec.isZero();
              return (
                <TableRow key={m.monthKey}>
                  <TableCell className="text-text">
                    <span className="font-medium">{m.monthName}</span>
                    {m.items.length > 0 && (
                      <span className="text-caption text-muted ml-2 tnum">
                        ({plural(m.items.length, "gift", "gifts")})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tnum text-muted">
                    {toDecimal(m.cashTotal.toString()).isZero() ? "—" : formatMoney(m.cashTotal.toString())}
                  </TableCell>
                  <TableCell className="text-right tnum text-muted">
                    {toDecimal(m.momoTotal.toString()).isZero() ? "—" : formatMoney(m.momoTotal.toString())}
                  </TableCell>
                  <TableCell className="text-right tnum font-medium text-text">
                    {isZero ? "—" : formatMoney(m.total.toString())}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <tfoot>
            <tr className="border-t border-border font-medium text-text bg-hover">
              <td className="py-3 px-3 text-caption">Annual total</td>
              <td className="py-3 px-3 text-right tnum text-caption">
                {formatMoney(annualCashTotal)}
              </td>
              <td className="py-3 px-3 text-right tnum text-caption">
                {formatMoney(annualMomoTotal)}
              </td>
              <td className="py-3 px-3 text-right tnum text-body font-medium">
                {formatMoney(grandTotal.toString())}
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>

      {/* Statement Generation History */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div>
          <h2 className="text-lead font-normal text-text">
            Statement issuance history
          </h2>
          <p className="text-caption text-muted">
            Official tax and giving statements issued for this member.
          </p>
        </div>

        {statementHistory.length === 0 ? (
          <p className="text-caption text-muted py-2">
            No official giving statements have been issued for this member yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date issued</TableHead>
                <TableHead>Period covered</TableHead>
                <TableHead>Issued by</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statementHistory.map((log) => {
                const fromStr = formatAccraDate(log.rangeStart);
                const toStr = formatAccraDate(log.rangeEnd);
                const startIso = log.rangeStart.toISOString().slice(0, 10);
                const endIso = log.rangeEnd.toISOString().slice(0, 10);

                return (
                  <TableRow key={log.id}>
                    <TableCell className="tnum text-muted">
                      {formatAccraDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="tnum text-text">
                      {fromStr} — {toStr}
                    </TableCell>
                    <TableCell className="text-muted">
                      {log.generatedBy.name || log.generatedBy.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/api/statements/member/${member.id}?from=${startIso}&to=${endIso}`}
                        target="_blank"
                        className="inline-flex items-center text-accent-ink hover:underline text-caption font-medium min-h-[44px]"
                      >
                        Download PDF
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Statement Generation Sheet */}
      <Sheet
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        title="Generate official giving statement"
        description={`Produce an official statement for ${member.fullName}.`}
      >
        <div className="space-y-4 py-3">
          <div className="space-y-3">
            <TextField
              label="Period start date"
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
            <TextField
              label="Period end date"
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </div>

          <InlineAlert
            variant="neutral"
            title="Strict attribution policy"
            description="Only contributions explicitly attributed to this member (cash envelopes and confirmed Mobile Money transactions) will appear. General or unattributed giving is never included."
          />

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
              Download statement PDF
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
