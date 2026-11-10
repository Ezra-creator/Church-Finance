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
    parentBodyName?: string;
    presbyteryName?: string;
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
      <div className="print:hidden flex items-center justify-between pb-4 border-b border-border">
        <Link
          href={`/services/${receipt.serviceRecordId}`}
          className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-text transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to service count</span>
        </Link>

        <Button variant="primary" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print receipt
        </Button>
      </div>

      {/* Official Receipt Document */}
      <div
        id="official-receipt"
        className="bg-surface border border-border-strong p-6 sm:p-8 rounded-panel space-y-6 select-text text-text print:border-none print:p-0 print:m-0"
      >
        {/* Church Header */}
        <div className="text-center pb-4 border-b border-border space-y-1">
          <p className="text-[12px] font-medium text-muted">
            {receipt.parentBodyName || receipt.presbyteryName}
          </p>
          <h1 className="text-[22px] font-semibold text-text leading-[28px]">
            {receipt.churchName}
          </h1>
          <p className="text-[13px] font-medium text-brand pt-0.5">
            Official Tithe Receipt
          </p>
        </div>

        {/* Receipt Number & Date Grid */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border text-[13px]">
          <div>
            <span className="text-muted block text-[12px]">
              Receipt Number
            </span>
            <span className="text-[16px] font-semibold text-text num">
              {receipt.number}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted block text-[12px]">
              Date & Time Issued
            </span>
            <span className="text-[13px] text-text num">
              {receipt.issuedAt}
            </span>
          </div>
        </div>

        {/* Member and Payment Details */}
        <div className="space-y-4 py-2 text-[14px]">
          <div className="flex justify-between items-baseline border-b border-dashed border-border pb-2">
            <span className="text-[13px] text-muted">
              Received From:
            </span>
            <div className="text-right font-medium text-text">
              <span>{receipt.payerName}</span>
              {receipt.memberNumber && (
                <span className="ml-2 text-[12px] text-muted num">
                  [No. {receipt.memberNumber}]
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-baseline border-b border-dashed border-border pb-2">
            <span className="text-[13px] text-muted">
              Service Date:
            </span>
            <span className="text-text text-[13px]">
              {receipt.serviceDate} ({receipt.serviceType})
            </span>
          </div>

          <div className="flex justify-between items-baseline border-b border-dashed border-border pb-2">
            <span className="text-[13px] text-muted">
              Category:
            </span>
            <span className="text-text font-medium">Tithe Offering</span>
          </div>

          {/* Amount In Figures */}
          <div className="flex justify-between items-baseline border-b border-border pb-2 pt-2">
            <span className="text-[14px] font-medium text-text">
              Amount In Figures:
            </span>
            <span className="text-[22px] font-semibold text-text num">
              GH₵ {receipt.amount}
            </span>
          </div>

          {/* Amount In Words */}
          <div className="p-3 bg-hover border border-border rounded-control space-y-1">
            <span className="text-[12px] text-muted block">
              Amount in words:
            </span>
            <p className="text-[13px] text-text italic leading-relaxed">
              {receipt.amountWords}
            </p>
          </div>
        </div>

        {/* Verification & Signature Footer */}
        <div className="pt-6 border-t border-border grid grid-cols-2 gap-8 text-[13px]">
          <div className="space-y-1">
            <span className="text-[12px] text-muted block">
              Issued By
            </span>
            <p className="font-medium text-text">{receipt.issuerName}</p>
            <p className="text-[12px] text-muted">
              {receipt.issuerRole}
            </p>
          </div>

          <div className="text-right space-y-3">
            <div className="w-36 ml-auto border-b border-border-strong pt-6" />
            <span className="text-[12px] text-muted block">
              Authorised Signature
            </span>
          </div>
        </div>

        {/* Verification Stamp */}
        <div className="pt-4 text-center border-t border-dashed border-border">
          <p className="text-[12px] text-muted flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-ok-ink" />
            <span>PUCA Finance Verified • Non-Transferable</span>
          </p>
        </div>
      </div>
    </div>
  );
}
