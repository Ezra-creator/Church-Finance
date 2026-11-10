"use client";

import React from "react";
import Link from "next/link";
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
    reportRecipientName?: string;
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

  const recipient = receipt.reportRecipientName || receipt.presbyteryName;

  return (
    <div className="max-w-xl space-y-6 text-left">
      {/* Navigation and Print Action Bar (Hidden when printing) */}
      <div className="print:hidden flex items-center justify-between pb-4 border-b border-border">
        <Link
          href={`/services/${receipt.serviceRecordId}`}
          className="text-body text-muted hover:text-text transition-colors duration-120"
        >
          Back to service count
        </Link>

        <Button variant="primary" onClick={handlePrint}>
          Print receipt
        </Button>
      </div>

      {/* Official Receipt Document */}
      <div
        id="official-receipt"
        className="bg-surface border border-border p-6 sm:p-8 rounded-panel space-y-6 select-text text-text print:border-none print:p-0 print:m-0"
      >
        {/* Church Header */}
        <div className="pb-4 border-b border-border space-y-1">
          {recipient && (
            <p className="text-caption text-muted">
              {recipient}
            </p>
          )}
          <h1 className="text-heading font-semibold text-text">
            {receipt.churchName}
          </h1>
          <p className="text-caption font-medium text-muted pt-0.5">
            Official tithe receipt
          </p>
        </div>

        {/* Receipt Number & Date Grid */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border text-caption">
          <div>
            <span className="text-muted block text-caption">
              Receipt number
            </span>
            <span className="text-body font-medium text-text tnum tabular-nums">
              {receipt.number}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted block text-caption">
              Date and time issued
            </span>
            <span className="text-caption text-muted tnum tabular-nums">
              {receipt.issuedAt}
            </span>
          </div>
        </div>

        {/* Member and Payment Details */}
        <div className="space-y-4 py-2 text-body">
          <div className="flex justify-between items-baseline border-b border-border pb-2">
            <span className="text-caption text-muted">
              Received from:
            </span>
            <div className="text-right font-medium text-text">
              <span>{receipt.payerName}</span>
              {receipt.memberNumber && (
                <span className="ml-2 text-caption text-muted tnum tabular-nums">
                  [No. {receipt.memberNumber}]
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-baseline border-b border-border pb-2">
            <span className="text-caption text-muted">
              Service date:
            </span>
            <span className="text-muted text-caption tnum tabular-nums">
              {receipt.serviceDate} ({receipt.serviceType})
            </span>
          </div>

          <div className="flex justify-between items-baseline border-b border-border pb-2">
            <span className="text-caption text-muted">
              Category:
            </span>
            <span className="text-text font-medium">Tithe offering</span>
          </div>

          {/* Amount In Figures */}
          <div className="flex justify-between items-baseline border-b border-border pb-2 pt-2">
            <span className="text-caption font-medium text-text">
              Amount in figures:
            </span>
            <span className="text-figure font-semibold text-text tnum tabular-nums">
              GH₵ {receipt.amount}
            </span>
          </div>

          {/* Amount In Words */}
          <div className="p-3 bg-surface border border-border rounded-control space-y-1">
            <span className="text-caption text-muted block">
              Amount in words:
            </span>
            <p className="text-body text-text leading-normal">
              {receipt.amountWords}
            </p>
          </div>
        </div>

        {/* Verification & Signature Footer */}
        <div className="pt-6 border-t border-border grid grid-cols-2 gap-8 text-caption">
          <div className="space-y-1">
            <span className="text-caption text-muted block">
              Issued by
            </span>
            <p className="font-medium text-text">{receipt.issuerName}</p>
            <p className="text-caption text-muted">
              {receipt.issuerRole}
            </p>
          </div>

          <div className="text-right space-y-3">
            <div className="w-36 ml-auto border-b border-border pt-6" />
            <span className="text-caption text-muted block">
              Authorized signature
            </span>
          </div>
        </div>

        {/* Official Stamp */}
        <div className="pt-4 border-t border-border">
          <p className="text-caption text-muted">
            PUCA Finance verified · Non-transferable
          </p>
        </div>
      </div>
    </div>
  );
}
