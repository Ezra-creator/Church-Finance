import React from "react";
import Link from "next/link";
import { WifiOff, Calculator, FileText, ShieldAlert, ArrowLeft } from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline Mode — PUCA Finance",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-paper border border-rule p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-rule">
          <div className="p-2 bg-ink/[0.04] border border-rule rounded-[2px]">
            <WifiOff className="w-5 h-5 text-ink-soft" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft">
              Connection Unavailable
            </p>
            <h1 className="text-xl font-serif text-ink">You are working offline</h1>
          </div>
        </div>

        <p className="text-xs text-ink-soft leading-relaxed font-sans">
          Your internet connection has dropped. PUCA Finance protects your data by keeping authenticated balances strictly accurate without serving stale caches.
        </p>

        <div className="space-y-4 pt-2">
          <RuleHeading title="What Still Works" />
          <div className="space-y-3 text-xs font-sans">
            <div className="flex items-start gap-2.5">
              <Calculator className="w-4 h-4 text-balanced mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-ink">Cash Counting Ledger:</strong>
                <p className="text-ink-soft">
                  Denominations and count sheets can be entered offline. Changes are saved to this device and marked as waiting.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-balanced mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-ink">Tithe & Giver Register:</strong>
                <p className="text-ink-soft">
                  Giving entries can be recorded while offline. They will sync automatically in chronological order when reconnected.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <RuleHeading title="Requires Internet Connection" />
          <div className="flex items-start gap-2.5 text-xs text-ink-soft">
            <ShieldAlert className="w-4 h-4 text-variance mt-0.5 flex-shrink-0" />
            <p>
              Weekly reconciliation submission, MoMo statement imports, bank deposit confirmations, and PDF/Word exports require an active connection.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-rule flex flex-col gap-2">
          <Link href="/today">
            <Button variant="secondary" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Ledger
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
