"use client";

import React, { useState } from "react";
import { WifiOff, RefreshCw, AlertTriangle, Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutboxItem } from "@/lib/offline/outbox";
import { plural } from "@/lib/plural";

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

  if (isOnline && pendingCount === 0 && conflicts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="w-full bg-page border border-border rounded-panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-caption">
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <div className="flex items-center gap-2 text-muted">
              <WifiOff className="w-3.5 h-3.5 text-bad-ink" strokeWidth={1.75} />
              <span>
                {pendingCount > 0
                  ? `Offline. ${plural(pendingCount, "change", "changes")} waiting.`
                  : "Offline. Changes are recorded locally and will sync when reconnected."}
              </span>
            </div>
          ) : isSyncing ? (
            <div className="flex items-center gap-2 text-text">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" strokeWidth={1.75} />
              <span>Syncing {plural(pendingCount, "offline change", "offline changes")}...</span>
            </div>
          ) : pendingCount > 0 ? (
            <div className="flex items-center gap-2 text-muted">
              <Clock className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
              <span>{plural(pendingCount, "change", "changes")} waiting to sync.</span>
            </div>
          ) : null}

          {conflicts.length > 0 && (
            <button
              onClick={() => setSelectedConflict(conflicts[0])}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-bad-tint text-bad-ink border border-bad rounded-control hover:bg-bad-tint transition-colors cursor-pointer text-caption"
            >
              <AlertTriangle className="w-3 h-3 text-bad-ink" strokeWidth={1.75} />
              <span>{plural(conflicts.length, "conflict", "conflicts")} need attention</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOnline && pendingCount > 0 && !isSyncing && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onManualSync}
              className="h-8 px-2.5 text-caption"
            >
              <RefreshCw className="w-3 h-3 mr-1" strokeWidth={1.75} />
              Sync now
            </Button>
          )}
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
          <div className="w-full max-w-lg bg-surface border border-border rounded-panel shadow-overlay p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <p className="text-caption font-medium text-bad-ink">
                  Conflict resolution
                </p>
                <h3 className="text-lead font-semibold text-text mt-0.5">
                  Action required
                </h3>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-muted hover:text-text p-1 min-h-[44px] flex items-center justify-center"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <p className="text-body text-muted leading-normal">
              This record was modified offline, but the server encountered an update conflict. Choose which state to keep.
            </p>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-caption">
              <div className="p-3 bg-page border border-border rounded-panel space-y-1.5">
                <p className="text-caption font-medium text-muted">
                  Your version (offline)
                </p>
                <p className="text-body font-medium text-text">
                  {selectedConflict.conflictDetails?.clientSummary || selectedConflict.description}
                </p>
              </div>

              <div className="p-3 bg-bad-tint border border-bad rounded-panel space-y-1.5">
                <p className="text-caption font-medium text-bad-ink">
                  Server state
                </p>
                <p className="text-caption text-bad-ink font-medium">
                  {selectedConflict.conflictDetails?.reason || selectedConflict.error || "Server state changed"}
                </p>
                <p className="text-caption text-muted">
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
                <Check className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                Keep server version
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onResolveConflict(selectedConflict, "keep-mine");
                  setSelectedConflict(null);
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                Keep mine and retry
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
