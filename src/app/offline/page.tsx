import React from "react";
import Link from "next/link";
import { Clock, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline · PUCA Finance",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-page text-text flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-surface border border-border rounded-panel p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-2.5 bg-hover border border-border rounded-control">
            <Clock className="w-5 h-5 text-muted stroke-[1.75]" />
          </div>
          <div>
            <p className="text-caption text-muted">
              Connection unavailable
            </p>
            <h1 className="text-heading font-semibold text-text">You are working offline</h1>
          </div>
        </div>

        <p className="text-caption text-muted leading-relaxed">
          Your internet connection has dropped. PUCA Finance protects your data by keeping authenticated balances strictly accurate without serving stale caches.
        </p>

        <div className="space-y-3 pt-2">
          <h2 className="text-body font-medium text-text">What still works</h2>
          <div className="space-y-3 text-caption">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-ok-ink mt-0.5 flex-shrink-0 stroke-[1.75]" />
              <div>
                <strong className="text-text font-medium">Cash counting:</strong>
                <p className="text-muted">
                  Denominations and count sheets can be entered offline. Changes are saved to this device and marked as waiting.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-ok-ink mt-0.5 flex-shrink-0 stroke-[1.75]" />
              <div>
                <strong className="text-text font-medium">Member contributions:</strong>
                <p className="text-muted">
                  Giving entries can be recorded while offline. They will sync automatically in chronological order when reconnected.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <h2 className="text-body font-medium text-text">Requires an internet connection</h2>
          <div className="flex items-start gap-2.5 text-caption text-muted">
            <AlertCircle className="w-4 h-4 text-bad-ink mt-0.5 flex-shrink-0 stroke-[1.75]" />
            <p>
              Weekly reconciliation submission, Mobile money statement imports, bank deposit confirmations, and PDF or Word exports require an active connection.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex flex-col gap-2">
          <Link href="/today">
            <Button variant="secondary" className="w-full">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
