"use client";

import React from "react";
import Link from "next/link";
import { Printer, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceiptViewProps {
  receipt: {
    id: string;
    number: string;
    amount: string;
    amountWords: string;
    issuedAt: string;
    serviceDate: string;
    serviceType: string;
    churchName: string;
    presbyteryName: string;
    payerName: string;
    memberNumber: string | null;
    phone: string | null;
    issuerName: string;
    issuerRole: string;
    serviceRecordId: string;
  };
}

export function ReceiptView({ receipt }: ReceiptViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Navigation and Print Action Bar (Hidden when printing) */}
      <div className="print:hidden flex items-center justify-between pb-4 border-b border-rule">
        <Link
          href={`/services/${receipt.serviceRecordId}`}
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to service count</span>
        </Link>

        <Button variant="primary" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print receipt
        </Button>
      </div>

      {/* Official Receipt Ledger Document */}
      <div
        id="official-receipt"
        className="bg-paper border border-rule-strong p-6 sm:p-8 rounded-[2px] space-y-6 select-text text-ink print:border-none print:p-0 print:m-0"
      >
        {/* Church Header */}
        <div className="text-center pb-4 border-b border-rule space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-mono text-ink-soft">
            {receipt.presbyteryName}
          </p>
          <h1 className="text-2xl font-serif text-ink tracking-tight font-normal">
            {receipt.churchName}
          </h1>
          <p className="text-xs uppercase tracking-widest font-mono font-medium text-ink pt-1">
            Official Tithe Receipt
          </p>
        </div>

        {/* Receipt Number & Date Grid */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-rule text-xs">
          <div>
            <span className="text-ink-soft block font-mono text-[10px] uppercase">
              Receipt Number
            </span>
            <span className="font-mono text-base font-bold text-ink">
              {receipt.number}
            </span>
          </div>
          <div className="text-right">
            <span className="text-ink-soft block font-mono text-[10px] uppercase">
              Date & Time Issued
            </span>
            <span className="font-mono text-xs text-ink">
              {receipt.issuedAt}
            </span>
          </div>
        </div>

        {/* Member and Payment Details */}
        <div className="space-y-4 py-2 text-sm">
          <div className="flex justify-between items-baseline border-b border-dashed border-rule pb-2">
            <span className="text-xs text-ink-soft uppercase font-mono">
              Received From:
            </span>
            <div className="text-right font-medium text-ink">
              <span>{receipt.payerName}</span>
              {receipt.memberNumber && (
                <span className="ml-2 text-xs font-mono text-ink-soft">
                  [No. {receipt.memberNumber}]
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-baseline border-b border-dashed border-rule pb-2">
            <span className="text-xs text-ink-soft uppercase font-mono">
              Service Date:
            </span>
            <span className="text-ink font-mono text-xs">
              {receipt.serviceDate} ({receipt.serviceType})
            </span>
          </div>

          <div className="flex justify-between items-baseline border-b border-dashed border-rule pb-2">
            <span className="text-xs text-ink-soft uppercase font-mono">
              Category:
            </span>
            <span className="text-ink font-medium">Tithe Offering</span>
          </div>

          {/* Amount In Figures */}
          <div className="flex justify-between items-baseline border-b border-rule pb-2 pt-2">
            <span className="text-xs uppercase font-mono font-semibold text-ink">
              Amount In Figures:
            </span>
            <span className="font-mono text-2xl font-bold text-ink tabular-nums">
              GH₵ {receipt.amount}
            </span>
          </div>

          {/* Amount In Words */}
          <div className="p-3 bg-ink/[0.02] border border-rule rounded-[2px] space-y-1">
            <span className="text-[10px] uppercase font-mono text-ink-soft block">
              Amount in words:
            </span>
            <p className="font-serif italic text-sm text-ink leading-relaxed">
              {receipt.amountWords}
            </p>
          </div>
        </div>

        {/* Verification & Signature Footer */}
        <div className="pt-8 border-t border-rule grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-ink-soft block">
              Issued By
            </span>
            <p className="font-medium text-ink">{receipt.issuerName}</p>
            <p className="text-[11px] text-ink-soft font-mono uppercase">
              {receipt.issuerRole}
            </p>
          </div>

          <div className="text-right space-y-3">
            <div className="w-36 ml-auto border-b border-ink pt-6" />
            <span className="text-[10px] uppercase font-mono text-ink-soft block">
              Authorised Signature
            </span>
          </div>
        </div>

        {/* Ledger Stamp */}
        <div className="pt-4 text-center border-t border-dashed border-rule">
          <p className="text-[10px] text-ink-soft font-mono uppercase tracking-widest flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3 text-balanced" />
            <span>PUCA Parish Finance Verified • Non-Transferable</span>
          </p>
        </div>
      </div>
    </div>
  );
}
