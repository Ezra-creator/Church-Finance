"use client";

import React from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReconciliationReportData } from "../report-data";

export interface ReportPreviewViewProps {
  reportData: ReconciliationReportData;
  periodId: string;
  isSubmitted: boolean;
  weekEnding: string;
}

export function ReportPreviewView({
  reportData,
  periodId,
  isSubmitted,
  weekEnding,
}: ReportPreviewViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top action toolbar (hidden during printing) */}
      <div className="print:hidden flex items-center justify-between p-4 bg-surface border border-border rounded-panel gap-3 flex-wrap">
        <Link href={`/reconcile/${weekEnding}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
            Back to reconciliation
          </Button>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
            Print return
          </Button>

          {isSubmitted && (
            <>
              <a
                href={`/api/reports/reconciliation/${periodId}/docx`}
                download
                className="inline-block"
              >
                <Button variant="secondary" size="sm">
                  <Download className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
                  Word (.docx)
                </Button>
              </a>

              <a
                href={`/api/reports/reconciliation/${periodId}/pdf`}
                download
                className="inline-block"
              >
                <Button variant="primary" size="sm">
                  <Download className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
                  PDF (.pdf)
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Page preview document */}
      <div className="bg-surface border border-border print:border-none rounded-panel p-8 sm:p-14 max-w-3xl mx-auto space-y-8 select-text">
        {/* Document Header */}
        <div className="space-y-1 pb-4 border-b border-border">
          <h1 className="text-heading font-semibold text-text">
            {reportData.churchName}
          </h1>
          <p className="text-caption font-medium text-muted">
            {reportData.presbyteryName}
          </p>
          <div className="pt-2 flex items-center justify-between gap-2 text-caption text-text">
            <span className="font-medium">Weekly financial return • {reportData.weekRange}</span>
            <span className="text-muted">
              {isSubmitted ? `Report version ${reportData.version}` : "Draft return preview"}
            </span>
          </div>
        </div>

        {/* Income Table */}
        <div className="space-y-2">
          <table className="w-full text-left text-caption">
            <thead className="border-b border-border bg-page">
              <tr>
                <th className="py-2.5 px-3 text-muted font-medium">
                  Giving category
                </th>
                <th className="py-2.5 px-3 text-right text-muted font-medium">
                  Cash counted
                </th>
                <th className="py-2.5 px-3 text-right text-muted font-medium">
                  Mobile money
                </th>
                <th className="py-2.5 px-3 text-right text-muted font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reportData.incomeCategories.map((c) => (
                <tr key={c.name}>
                  <td className="py-2 px-3 text-text font-medium">{c.name}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text tnum">{c.cashFormatted}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text tnum">{c.momoFormatted}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium text-text tnum">{c.totalFormatted}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-page font-medium text-text text-caption">
              <tr>
                <td className="py-2.5 px-3">Total income</td>
                <td className="py-2.5 px-3 text-right tabular-nums tnum">{reportData.totals.cashFormatted}</td>
                <td className="py-2.5 px-3 text-right tabular-nums tnum">{reportData.totals.momoFormatted}</td>
                <td className="py-2.5 px-3 text-right tabular-nums tnum">{reportData.totals.expectedFormatted}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Parallel Run / Variance Note */}
        {reportData.totals.bookFormatted && (
          <div className="p-4 border border-border rounded-panel space-y-2 text-caption">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text">Recorded in books (parallel run)</span>
              <span className="tabular-nums font-medium text-text tnum">{reportData.totals.bookFormatted}</span>
            </div>
            {reportData.totals.varianceFormatted && (
              <div className="flex items-center justify-between text-muted">
                <span>Variance</span>
                <span className="tabular-nums tnum">{reportData.totals.varianceFormatted}</span>
              </div>
            )}
            {reportData.varianceReason && (
              <p className="pt-1 text-muted border-t border-border">
                Explanation: {reportData.varianceReason}
              </p>
            )}
          </div>
        )}

        {/* Expenses Section if present */}
        {reportData.expenseCategories.length > 0 && (
          <div className="pt-6 border-t border-border space-y-3 text-caption">
            <h3 className="text-lead font-semibold text-text">
              Disbursements and expenses
            </h3>
            <table className="w-full text-left text-caption">
              <thead className="border-b border-border bg-page">
                <tr>
                  <th className="py-2 px-3 text-muted font-medium">Category</th>
                  <th className="py-2 px-3 text-right text-muted font-medium">Cash</th>
                  <th className="py-2 px-3 text-right text-muted font-medium">Mobile money</th>
                  <th className="py-2 px-3 text-right text-muted font-medium">Bank</th>
                  <th className="py-2 px-3 text-right text-muted font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reportData.expenseCategories.map((ec) => (
                  <tr key={ec.name}>
                    <td className="py-2 px-3 text-text">{ec.name}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-text tnum">{ec.cashFormatted}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-text tnum">{ec.momoFormatted}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-text tnum">{ec.bankFormatted}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-text tnum">{ec.totalFormatted}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-page font-medium text-text text-caption">
                <tr>
                  <td className="py-2.5 px-3">Total expenses</td>
                  <td className="py-2.5 px-3 text-right tabular-nums tnum">{reportData.expenseTotals?.cashFormatted || "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums tnum">{reportData.expenseTotals?.momoFormatted || "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums tnum">{reportData.expenseTotals?.bankFormatted || "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums tnum">{reportData.expenseTotals?.grandTotalFormatted || "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Banking & Held Funds Section if present */}
        {reportData.banking && (
          <div className="pt-6 border-t border-border space-y-3 text-caption">
            <h3 className="text-lead font-semibold text-text">
              Bank deposits and held funds
            </h3>
            {reportData.banking.deposits.length > 0 ? (
              <div className="space-y-1.5 pb-2">
                <p className="text-muted font-medium">
                  Deposits made ({reportData.banking.totalDepositedFormatted} total):
                </p>
                {reportData.banking.deposits.map((d, idx) => (
                  <p key={idx} className="text-text pl-2 border-l border-border">
                    {d.dateFormatted} • {d.kindLabel} • <strong className="tnum">{d.amountFormatted}</strong> (Ref: {d.bankReference})
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted">No deposits were recorded during this week.</p>
            )}
            <div className="p-3 bg-page border border-border rounded-panel flex justify-between items-center text-caption">
              <span>Cash held: <strong className="tnum">{reportData.banking.cashHeldFormatted}</strong></span>
              <span>Mobile money held: <strong className="tnum">{reportData.banking.momoHeldFormatted}</strong></span>
              <span>Total held: <strong className="tnum">{reportData.banking.totalHeldFormatted}</strong></span>
            </div>
          </div>
        )}

        {/* Attestation & Signature Lines */}
        <div className="pt-8 border-t border-border space-y-8">
          <div className="text-caption text-muted space-y-1">
            <p>
              Submitted by: {reportData.preparedByName} on {reportData.submittedAtFormatted}
            </p>
            <p>
              Certified true and correct record of all collections and banking.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-6">
            <div className="space-y-1.5">
              <div className="border-b border-border pb-6 text-caption text-text font-medium">
                {reportData.preparedByName}
              </div>
              <p className="text-caption text-muted font-medium">
                Finance Secretary
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="border-b border-border pb-6 text-caption text-muted">
                &nbsp;
              </div>
              <p className="text-caption text-muted font-medium">
                Treasurer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
