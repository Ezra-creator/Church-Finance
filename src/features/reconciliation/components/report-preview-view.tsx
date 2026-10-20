"use client";

import React from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Download,
  CheckCircle2,
  Lock,
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
      <div className="print:hidden flex items-center justify-between p-4 bg-paper border border-rule rounded-[2px] gap-3 flex-wrap">
        <Link href={`/reconcile/${weekEnding}`}>
          <Button variant="quiet" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to reconciliation
          </Button>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />
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
                  <Download className="w-4 h-4 mr-1.5" />
                  Word (.docx)
                </Button>
              </a>

              <a
                href={`/api/reports/reconciliation/${periodId}/pdf`}
                download
                className="inline-block"
              >
                <Button variant="primary" size="sm">
                  <Download className="w-4 h-4 mr-1.5" />
                  PDF (.pdf)
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Page-like column preview document */}
      <div className="bg-paper border border-rule print:border-none rounded-[2px] p-8 sm:p-14 max-w-3xl mx-auto shadow-none space-y-8 select-text">
        {/* Document Header */}
        <div className="space-y-1 pb-4 border-b-2 border-rule-strong">
          <h1 className="text-2xl font-serif font-normal text-ink">
            {reportData.churchName}
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-ink-soft font-semibold">
            {reportData.presbyteryName}
          </p>
          <div className="pt-2 flex items-center justify-between gap-2 text-xs font-mono text-ink">
            <span>WEEKLY FINANCIAL RETURN • {reportData.weekRange}</span>
            <span className="text-ink-soft">
              {isSubmitted ? `Report Version ${reportData.version}` : "Draft Return Preview"}
            </span>
          </div>
        </div>

        {/* Ruled Income Table */}
        <div className="space-y-2">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b-2 border-rule-strong">
              <tr>
                <th className="py-2.5 pr-4 text-ink-soft font-semibold uppercase tracking-wider">
                  Giving Category
                </th>
                <th className="py-2.5 px-3 text-right text-ink-soft font-semibold uppercase tracking-wider">
                  Cash Counted
                </th>
                <th className="py-2.5 px-3 text-right text-ink-soft font-semibold uppercase tracking-wider">
                  Mobile Money
                </th>
                <th className="py-2.5 pl-3 text-right text-ink-soft font-semibold uppercase tracking-wider">
                  Total Received
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {reportData.incomeCategories.map((cat, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 pr-4 text-ink font-medium">
                    {cat.name}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                    {cat.cashFormatted}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                    {cat.momoFormatted}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums font-semibold text-ink">
                    {cat.totalFormatted}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-rule-strong border-b-2 font-bold text-ink text-sm">
              <tr>
                <td className="py-3 pr-4">TOTAL INCOME</td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {reportData.totals.cashFormatted}
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {reportData.totals.momoFormatted}
                </td>
                <td className="py-3 pl-3 text-right tabular-nums">
                  {reportData.totals.expectedFormatted}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Parallel Run & Variance Note if any */}
        {reportData.totals.bookFormatted && (
          <div className="pt-4 border-t border-rule space-y-1.5 text-xs font-mono">
            <p className="font-semibold uppercase tracking-wider text-ink-soft">
              Parallel Run Verification
            </p>
            <p className="text-ink">
              Physical Paper Book Total:{" "}
              <strong className="tabular-nums">{reportData.totals.bookFormatted}</strong>
              {" • "}
              Status: <strong>{reportData.totals.varianceLabel || "Balanced"}</strong>
            </p>
            {reportData.varianceReason && (
              <p className="text-ink-soft italic pt-1">
                Variance Explanation: &ldquo;{reportData.varianceReason}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Attestation & Signature Lines */}
        <div className="pt-10 border-t border-rule space-y-8">
          <div className="text-xs font-mono text-ink-soft space-y-1">
            <p>
              Submitted by: {reportData.preparedByName} on {reportData.submittedAtFormatted}
            </p>
            <p className="text-[11px]">
              Certified true and correct record of all parish collections and banking.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-6">
            <div className="space-y-1.5">
              <div className="border-b border-rule pb-6 text-xs text-ink font-medium">
                {reportData.preparedByName}
              </div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-ink-soft">
                Finance Secretary
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="border-b border-rule pb-6 text-xs text-ink-soft">
                &nbsp;
              </div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-ink-soft">
                Parish Treasurer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
