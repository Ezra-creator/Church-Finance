"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutboxItem } from "@/lib/offline/outbox";
import { Dialog } from "@/components/ui/dialog";

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
      <div className="w-full bg-surface border border-border px-4 py-2.5 rounded-control flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <div className="flex items-center gap-2 text-muted">
              <span className="w-2 h-2 rounded-full bg-warn flex-shrink-0" aria-hidden="true" />
              <span>
                {pendingCount > 0
                  ? `Offline. ${pendingCount} change${pendingCount > 1 ? "s" : ""} waiting.`
                  : "Offline. Connection lost. Count and tithe entry remain active."}
              </span>
            </div>
          ) : isSyncing ? (
            <div className="flex items-center gap-2 text-text">
              <span className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>Replaying {pendingCount} offline change{pendingCount > 1 ? "s" : ""}...</span>
            </div>
          ) : pendingCount > 0 ? (
            <div className="flex items-center gap-2 text-muted">
              <span className="w-2 h-2 rounded-full bg-warn flex-shrink-0" aria-hidden="true" />
              <span>{pendingCount} change{pendingCount > 1 ? "s" : ""} waiting to sync.</span>
            </div>
          ) : null}

          {conflicts.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedConflict(conflicts[0])}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-bad-tint text-bad-ink border border-bad rounded-control hover:bg-bad-tint transition-colors cursor-pointer text-[12px]"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} require review</span>
            </button>
          )}
        </div>

        {isOnline && pendingCount > 0 && !isSyncing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onManualSync}
          >
            Sync now
          </Button>
        )}
      </div>

      {selectedConflict && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedConflict(null)}
          title="Resolve offline sync conflict"
          description="A change was made on another device while you were offline. Choose which version to keep."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  onResolveConflict(selectedConflict, "keep-server");
                  setSelectedConflict(null);
                }}
              >
                Keep server version
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onResolveConflict(selectedConflict, "keep-mine");
                  setSelectedConflict(null);
                }}
              >
                Keep my offline change
              </Button>
            </>
          }
        >
          <div className="p-3 bg-surface border border-border rounded-control text-[13px] space-y-2">
            <div>
              <strong>Action:</strong> {selectedConflict.type}
            </div>
            <div>
              <strong>Payload:</strong>
              <pre className="text-[12px] bg-hover p-2 rounded-control mt-1 overflow-x-auto num">
                {JSON.stringify(selectedConflict.payload, null, 2)}
              </pre>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
