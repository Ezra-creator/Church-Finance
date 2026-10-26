"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Download, FileText, Calendar, ArrowRight, Printer } from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { formatCedi } from "@/lib/money";
import { AnnualReportData, MONTH_NAMES_SHORT } from "../service";

interface AnnualReportViewProps {
  initialData: AnnualReportData;
  availableYears: number[];
}

export function AnnualReportView({
  initialData,
  availableYears,
}: AnnualReportViewProps) {
  const [data, setData] = useState<AnnualReportData>(initialData);
  const [selectedYear, setSelectedYear] = useState(initialData.year);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    window.location.search = `?year=${year}`;
  };

  const isSurplus = parseFloat(data.netOperatingSurplus.toString()) >= 0;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-rule">
        <div>
          <p className="text-[10px] uppercase font-mono tracking-widest text-ink-soft">
            {data.presbyteryName}
          </p>
          <h1 className="text-3xl font-serif font-normal text-ink mt-0.5">
            Annual Financial Summary — {data.year}
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            Complete reconciliation of category revenues, operating expenses, and banking deposits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className="h-9 px-3 text-xs font-mono bg-paper border border-rule rounded-[2px] text-ink focus:outline-none focus:border-ink"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                Tax Year {y}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            onClick={() => window.open(`/api/reports/annual/${data.year}/pdf`, "_blank")}
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Download PDF
          </Button>

          <Button
            variant="primary"
            onClick={() => window.open(`/api/reports/annual/${data.year}/docx`, "_blank")}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Download Word (.docx)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-wider text-ink-soft">
            Total Annual Revenue
          </p>
          <p className="text-2xl font-mono font-bold text-ink tabular-nums">
            {formatCedi(data.income.grandTotal)}
          </p>
          <p className="text-[11px] font-mono text-ink-soft">
            Across {data.income.categories.length} giving categories
          </p>
        </div>

        <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-wider text-ink-soft">
            Operating Disbursements
          </p>
          <p className="text-2xl font-mono font-bold text-ink tabular-nums">
            {formatCedi(data.expenses.grandTotal)}
          </p>
          <p className="text-[11px] font-mono text-ink-soft">
            Across {data.expenses.categories.length} expense categories
          </p>
        </div>

        <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-wider text-ink-soft">
            Bank Deposits & Transfers
          </p>
          <p className="text-2xl font-mono font-bold text-ink tabular-nums">
            {formatCedi(data.deposits.totalDeposited)}
          </p>
          <p className="text-[11px] font-mono text-ink-soft">
            {data.deposits.countDeposits} verified deposits
          </p>
        </div>

        <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-wider text-ink-soft">
            Net Operating Position
          </p>
          <p
            className={`text-2xl font-mono font-bold tabular-nums ${
              isSurplus ? "text-emerald-700" : "text-variance"
            }`}
          >
            {formatCedi(data.netOperatingSurplus)}
          </p>
          <p className="text-[11px] font-mono text-ink-soft">
            {isSurplus ? "Net Operating Surplus" : "Operating Deficit"}
          </p>
        </div>
      </div>

      {/* 1. Monthly Income Breakdown Table */}
      <div className="space-y-3 pt-4 border-t border-rule">
        <h2 className="text-lg font-serif font-normal text-ink">
          1. Monthly Category Incomes ({data.year})
        </h2>
        <div className="overflow-x-auto border border-rule rounded-[2px] bg-paper">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-rule font-mono uppercase tracking-wider text-[10px] text-ink-soft bg-ink/[0.01]">
                <th className="py-2.5 px-3 font-normal min-w-[140px]">Category</th>
                {MONTH_NAMES_SHORT.map((m) => (
                  <th key={m} className="py-2.5 px-1.5 text-right font-normal min-w-[50px]">
                    {m}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right font-normal min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule font-mono text-[11px]">
              {data.income.categories.map((cat) => (
                <tr key={cat.categoryId} className="hover:bg-ink/[0.02]">
                  <td className="py-2 px-3 text-ink font-sans font-medium">
                    {cat.categoryName}
                  </td>
                  {cat.monthlyAmounts.map((amt, idx) => (
                    <td key={idx} className="py-2 px-1.5 text-right tabular-nums text-ink">
                      {amt.isZero() ? (
                        <span className="text-ink-soft/40">-</span>
                      ) : (
                        amt.toFixed(0)
                      )}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right tabular-nums font-semibold text-ink">
                    {formatCedi(cat.rowTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-rule font-mono font-bold text-ink text-xs bg-ink/[0.02]">
              <tr>
                <td className="py-3 px-3 font-sans">TOTAL INCOME</td>
                {data.income.monthlyTotals.map((amt, idx) => (
                  <td key={idx} className="py-3 px-1.5 text-right tabular-nums">
                    {amt.isZero() ? "-" : amt.toFixed(0)}
                  </td>
                ))}
                <td className="py-3 px-3 text-right tabular-nums text-sm">
                  {formatCedi(data.income.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. Expenses Section */}
      <div className="space-y-3 pt-6 border-t border-rule">
        <h2 className="text-lg font-serif font-normal text-ink">
          2. Operating Disbursements by Category
        </h2>
        {data.expenses.categories.length === 0 ? (
          <p className="text-xs text-ink-soft font-mono">
            No expense disbursements recorded for {data.year}.
          </p>
        ) : (
          <div className="overflow-x-auto border border-rule rounded-[2px] bg-paper">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-rule font-mono uppercase tracking-wider text-[11px] text-ink-soft">
                  <th className="py-2.5 px-3 font-normal">Category</th>
                  <th className="py-2.5 px-3 text-right font-normal">Cash Spent</th>
                  <th className="py-2.5 px-3 text-right font-normal">MoMo Spent</th>
                  <th className="py-2.5 px-3 text-right font-normal">Bank Spent</th>
                  <th className="py-2.5 px-3 text-right font-normal">Total Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-mono">
                {data.expenses.categories.map((exp) => (
                  <tr key={exp.categoryId} className="hover:bg-ink/[0.02]">
                    <td className="py-2.5 px-3 text-ink font-sans">{exp.categoryName}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                      {formatCedi(exp.cashAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                      {formatCedi(exp.momoAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                      {formatCedi(exp.bankAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-ink">
                      {formatCedi(exp.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-rule font-mono font-bold text-ink">
                <tr>
                  <td className="py-3 px-3 font-sans">TOTAL DISBURSEMENTS</td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {formatCedi(data.expenses.cashTotal)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {formatCedi(data.expenses.momoTotal)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {formatCedi(data.expenses.bankTotal)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-sm">
                    {formatCedi(data.expenses.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 3. Banking & District Obligations */}
      <div className="space-y-4 pt-6 border-t border-rule">
        <h2 className="text-lg font-serif font-normal text-ink">
          3. Banking & District Obligations Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-2 text-xs font-mono">
            <p className="font-semibold uppercase tracking-wider text-ink-soft">
              Banking Deposits Ledger
            </p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Physical Cash Banked:</span>
                <strong className="text-ink">{formatCedi(data.deposits.cashDepositsTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Mobile Money Swept to Bank:</span>
                <strong className="text-ink">{formatCedi(data.deposits.momoTransfersTotal)}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-rule font-bold text-ink">
                <span>Total Funds Banked:</span>
                <span>{formatCedi(data.deposits.totalDeposited)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-rule bg-paper rounded-[2px] space-y-2 text-xs font-mono">
            <p className="font-semibold uppercase tracking-wider text-ink-soft">
              Headquarters / District Assessment
            </p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Remittance Due:</span>
                <strong className="text-ink">{formatCedi(data.districtRemittance.totalDue)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Remittance Disbursed:</span>
                <strong className="text-emerald-700">{formatCedi(data.districtRemittance.totalPaid)}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-rule font-bold text-ink">
                <span>Outstanding Balance:</span>
                <span className="text-variance">
                  {formatCedi(data.districtRemittance.totalOutstanding)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
