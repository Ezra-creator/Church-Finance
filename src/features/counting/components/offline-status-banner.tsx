"use client";

import React, { useState } from "react";
import { WifiOff, RefreshCw, AlertTriangle, Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutboxItem } from "@/lib/offline/outbox";

interface OfflineStatusBannerProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  conflicts: OutboxItem[];
  onManualSync: () => void;
  onResolveConflict: (item: OutboxItem, choice: "keep-mine" | "keep-server") => void;
}

export function OfflineStatusBanner({
  isOnline,
  pendingCount,
  isSyncing,
  conflicts,
  onManualSync,
  onResolveConflict,
}: OfflineStatusBannerProps) {
  const [selectedConflict, setSelectedConflict] = useState<OutboxItem | null>(null);

  // If online, no pending items, and no conflicts, hide completely
  if (isOnline && pendingCount === 0 && conflicts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="w-full bg-paper border border-rule px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-xs">
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <div className="flex items-center gap-2 text-ink-soft">
              <WifiOff className="w-3.5 h-3.5 text-variance animate-pulse" />
              <span>
                {pendingCount > 0
                  ? `Offline. ${pendingCount} change${pendingCount > 1 ? "s" : ""} waiting.`
                  : "Offline. Connection lost. Count and tithe entry remain active."}
              </span>
            </div>
          ) : isSyncing ? (
            <div className="flex items-center gap-2 text-ink">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-ink-soft" />
              <span>Replaying {pendingCount} offline change{pendingCount > 1 ? "s" : ""}...</span>
            </div>
          ) : pendingCount > 0 ? (
            <div className="flex items-center gap-2 text-ink-soft">
              <Clock className="w-3.5 h-3.5 text-ink-soft" />
              <span>{pendingCount} change{pendingCount > 1 ? "s" : ""} waiting to sync.</span>
            </div>
          ) : null}

          {conflicts.length > 0 && (
            <button
              onClick={() => setSelectedConflict(conflicts[0])}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-variance/10 text-variance border border-variance/20 hover:bg-variance/20 transition-colors cursor-pointer text-xs"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} need attention</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOnline && pendingCount > 0 && !isSyncing && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onManualSync}
              className="h-6 px-2.5 text-[11px]"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Sync now
            </Button>
          )}
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-paper border border-rule shadow-md p-6 space-y-5 animate-in fade-in-50">
            <div className="flex items-start justify-between pb-3 border-b border-rule">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-variance">
                  Conflict Resolution
                </p>
                <h3 className="text-lg font-serif text-ink mt-0.5">
                  Needs Your Attention
                </h3>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-ink-soft hover:text-ink p-1"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed font-sans">
              This change was recorded while your device was offline, but the server encountered an issue when syncing. Review the differences below and choose which state to keep.
            </p>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-ink/[0.02] border border-rule space-y-1.5">
                <p className="font-mono text-[10px] uppercase text-ink-soft">
                  Your Version (Offline)
                </p>
                <p className="font-serif text-ink text-sm font-medium">
                  {selectedConflict.conflictDetails?.clientSummary || selectedConflict.description}
                </p>
                <p className="text-[10px] font-mono text-ink-soft">
                  Key: {selectedConflict.id.slice(0, 8)}…
                </p>
              </div>

              <div className="p-3 bg-variance/[0.04] border border-variance/30 space-y-1.5">
                <p className="font-mono text-[10px] uppercase text-variance">
                  Server State / Rejection
                </p>
                <p className="font-sans text-xs text-variance font-medium">
                  {selectedConflict.conflictDetails?.reason || selectedConflict.error || "Server state changed"}
                </p>
                <p className="text-[10px] font-sans text-ink-soft">
                  {selectedConflict.conflictDetails?.serverSummary}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onResolveConflict(selectedConflict, "keep-server");
                  setSelectedConflict(null);
                }}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Keep Server (Discard mine)
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onResolveConflict(selectedConflict, "keep-mine");
                  setSelectedConflict(null);
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Keep Mine (Retry sync)
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
