"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatBlock } from "@/components/ui/stat-block";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatMoney, toDecimal } from "@/lib/money";
import { plural } from "@/lib/plural";
import { AnnualReportData, MONTH_NAMES_SHORT } from "../service";

interface AnnualReportViewProps {
  initialData: AnnualReportData;
  availableYears: number[];
}

export function AnnualReportView({
  initialData,
  availableYears,
}: AnnualReportViewProps) {
  const [data] = useState<AnnualReportData>(initialData);
  const [selectedYear, setSelectedYear] = useState(initialData.year);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    window.location.search = `?year=${year}`;
  };

  const isSurplus = !toDecimal(data.netOperatingSurplus.toString()).isNegative();

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <PageHeader
        title="Annual summary"
        description={`Financial performance and category breakdown for ${data.year}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select report year"
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              className="h-9 px-3 text-caption bg-surface border border-border rounded-control text-text focus:outline-none focus:border-border-strong"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(`/api/reports/annual/${data.year}/docx`, "_blank")}
            >
              Download Word (.docx)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(`/api/reports/annual/${data.year}/pdf`, "_blank")}
            >
              Download PDF
            </Button>
          </div>
        }
      />

      {/* Overview stat blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border py-2">
        <div className="pb-4 sm:pb-0 sm:pr-4">
          <StatBlock
            label="Total annual revenue"
            value={formatMoney(data.income.grandTotal.toString())}
            hint={`Across ${plural(data.income.categories.length, "category", "categories")}`}
          />
        </div>

        <div className="py-4 sm:py-0 sm:px-4">
          <StatBlock
            label="Operating expenses"
            value={formatMoney(data.expenses.grandTotal.toString())}
            hint={`Across ${plural(data.expenses.categories.length, "category", "categories")}`}
          />
        </div>

        <div className="py-4 sm:py-0 sm:px-4">
          <StatBlock
            label="Bank deposits"
            value={formatMoney(data.deposits.totalDeposited.toString())}
            hint={`${plural(data.deposits.countDeposits, "verified deposit", "verified deposits")}`}
          />
        </div>

        <div className="pt-4 sm:pt-0 sm:pl-4">
          <StatBlock
            label="Net operating position"
            value={
              <span className={isSurplus ? "text-ok-ink" : "text-bad-ink"}>
                {formatMoney(data.netOperatingSurplus.toString())}
              </span>
            }
            hint={isSurplus ? "Net operating surplus" : "Operating deficit"}
          />
        </div>
      </div>

      {/* 1. Monthly Income Breakdown Table */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lead font-normal text-text">
          1. Monthly category incomes ({data.year})
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Category</TableHead>
              {MONTH_NAMES_SHORT.map((m) => (
                <TableHead key={m} className="text-right w-12">
                  {m}
                </TableHead>
              ))}
              <TableHead className="text-right w-20">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.income.categories.map((cat) => (
              <TableRow key={cat.categoryId}>
                <TableCell className="font-medium text-text">
                  {cat.categoryName}
                </TableCell>
                {cat.monthlyAmounts.map((amt, idx) => {
                  const dec = toDecimal(String(amt ?? 0));
                  return (
                    <TableCell key={idx} className="text-right tnum text-muted">
                      {dec.isZero() ? "—" : dec.round().toString()}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right tnum font-medium text-text">
                  {formatMoney(cat.rowTotal.toString())}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot>
            <tr className="border-t border-border font-medium text-text bg-hover">
              <td className="py-3 px-3 text-caption">Total income</td>
              {data.income.monthlyTotals.map((amt, idx) => {
                const dec = toDecimal(String(amt ?? 0));
                return (
                  <td key={idx} className="py-3 px-1.5 text-right tnum text-caption">
                    {dec.isZero() ? "—" : dec.round().toString()}
                  </td>
                );
              })}
              <td className="py-3 px-3 text-right tnum text-body font-medium">
                {formatMoney(data.income.grandTotal.toString())}
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>

      {/* 2. Expenses Section */}
      <div className="space-y-3 pt-6 border-t border-border">
        <h2 className="text-lead font-normal text-text">
          2. Operating expenses by category
        </h2>
        {data.expenses.categories.length === 0 ? (
          <p className="text-caption text-muted">
            No expenses recorded for {data.year}.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Mobile Money</TableHead>
                <TableHead className="text-right">Bank</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.expenses.categories.map((exp) => (
                <TableRow key={exp.categoryId}>
                  <TableCell className="font-medium text-text">
                    {exp.categoryName}
                  </TableCell>
                  <TableCell className="text-right tnum text-muted">
                    {formatMoney(exp.cashAmount.toString())}
                  </TableCell>
                  <TableCell className="text-right tnum text-muted">
                    {formatMoney(exp.momoAmount.toString())}
                  </TableCell>
                  <TableCell className="text-right tnum text-muted">
                    {formatMoney(exp.bankAmount.toString())}
                  </TableCell>
                  <TableCell className="text-right tnum font-medium text-text">
                    {formatMoney(exp.totalAmount.toString())}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <tr className="border-t border-border font-medium text-text bg-hover">
                <td className="py-3 px-3 text-caption">Total expenses</td>
                <td className="py-3 px-3 text-right tnum text-caption">
                  {formatMoney(data.expenses.cashTotal.toString())}
                </td>
                <td className="py-3 px-3 text-right tnum text-caption">
                  {formatMoney(data.expenses.momoTotal.toString())}
                </td>
                <td className="py-3 px-3 text-right tnum text-caption">
                  {formatMoney(data.expenses.bankTotal.toString())}
                </td>
                <td className="py-3 px-3 text-right tnum text-body font-medium">
                  {formatMoney(data.expenses.grandTotal.toString())}
                </td>
              </tr>
            </tfoot>
          </Table>
        )}
      </div>

      {/* 3. Banking & District Obligations */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h2 className="text-lead font-normal text-text">
          3. Banking and district summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-border bg-surface rounded-panel space-y-2 text-caption">
            <p className="font-medium text-text">
              Banking deposits
            </p>
            <div className="space-y-1.5 text-muted">
              <div className="flex justify-between">
                <span>Physical cash banked:</span>
                <strong className="text-text tnum">{formatMoney(data.deposits.cashDepositsTotal.toString())}</strong>
              </div>
              <div className="flex justify-between">
                <span>Mobile Money swept to bank:</span>
                <strong className="text-text tnum">{formatMoney(data.deposits.momoTransfersTotal.toString())}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-border font-medium text-text">
                <span>Total funds banked:</span>
                <span className="tnum">{formatMoney(data.deposits.totalDeposited.toString())}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-border bg-surface rounded-panel space-y-2 text-caption">
            <p className="font-medium text-text">
              District assessment
            </p>
            <div className="space-y-1.5 text-muted">
              <div className="flex justify-between">
                <span>Total remittance due:</span>
                <strong className="text-text tnum">{formatMoney(data.districtRemittance.totalDue.toString())}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total remittance paid:</span>
                <strong className="text-ok-ink tnum">{formatMoney(data.districtRemittance.totalPaid.toString())}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-border font-medium text-text">
                <span>Outstanding balance:</span>
                <span className="text-bad-ink tnum">
                  {formatMoney(data.districtRemittance.totalOutstanding.toString())}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
