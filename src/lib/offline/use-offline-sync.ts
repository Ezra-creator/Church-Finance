"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  OutboxItem,
  enqueueOutboxItem,
  getOutboxItems,
  updateOutboxItem,
  removeOutboxItem,
} from "./outbox";
import { saveCountAction } from "@/features/counting/actions";
import { addGivingEntryAction } from "@/features/giving/actions";
import { SaveCountSheetInput } from "@/features/counting/schemas";
import { AddGivingEntryInput } from "@/features/giving/schemas";

interface UseOfflineSyncOptions {
  serviceRecordId: string;
  onSyncSuccess?: () => void;
  onToast?: (variant: "success" | "attention" | "error", message: string) => void;
}

export function useOfflineSync({
  serviceRecordId,
  onSyncSuccess,
  onToast,
}: UseOfflineSyncOptions) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [items, setItems] = useState<OutboxItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  const refreshOutbox = useCallback(async () => {
    try {
      const all = await getOutboxItems(serviceRecordId);
      setItems(all);
    } catch {
      // IndexedDB might not be available
    }
  }, [serviceRecordId]);

  useEffect(() => {
    refreshOutbox();
  }, [refreshOutbox]);

  const pendingItems = items.filter((i) => i.status === "PENDING" || i.status === "SYNCING");
  const conflictItems = items.filter((i) => i.status === "FAILED_CONFLICT");

  // Replay pending outbox items in order
  const replayOutbox = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    if (isSyncingRef.current) return;

    const currentItems = await getOutboxItems(serviceRecordId);
    const toReplay = currentItems.filter((i) => i.status === "PENDING");
    if (toReplay.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    let syncedCount = 0;
    let conflictCount = 0;

    for (const item of toReplay) {
      // If we went offline mid-replay, halt
      if (!navigator.onLine) break;

      try {
        await updateOutboxItem({ ...item, status: "SYNCING" });

        if (item.type === "SAVE_COUNT") {
          const res = await saveCountAction(item.payload);
          if (res.success) {
            await removeOutboxItem(item.id);
            syncedCount++;
          } else {
            // Check if server rejected due to conflict (e.g. record locked)
            await updateOutboxItem({
              ...item,
              status: "FAILED_CONFLICT",
              error: res.error.message,
              conflictDetails: {
                reason: res.error.message,
                clientSummary: item.description,
                serverSummary: `Server rejected save: ${res.error.message}`,
              },
            });
            conflictCount++;
          }
        } else if (item.type === "ADD_GIVING") {
          const res = await addGivingEntryAction(item.payload);
          if (res.success) {
            await removeOutboxItem(item.id);
            syncedCount++;
          } else {
            await updateOutboxItem({
              ...item,
              status: "FAILED_CONFLICT",
              error: res.error.message,
              conflictDetails: {
                reason: res.error.message,
                clientSummary: item.description,
                serverSummary: `Server rejected entry: ${res.error.message}`,
              },
            });
            conflictCount++;
          }
        }
      } catch (err: any) {
        // Network drop during request
        if (!navigator.onLine || err?.message?.includes("Failed to fetch")) {
          await updateOutboxItem({ ...item, status: "PENDING" });
          break;
        } else {
          await updateOutboxItem({
            ...item,
            status: "FAILED_CONFLICT",
            error: err?.message || "Sync error",
            conflictDetails: {
              reason: err?.message || "Replay failure",
              clientSummary: item.description,
              serverSummary: "Network request failed on server.",
            },
          });
          conflictCount++;
        }
      }
    }

    isSyncingRef.current = false;
    setIsSyncing(false);
    await refreshOutbox();

    if (syncedCount > 0) {
      onToast?.("success", `Synced ${syncedCount} offline change${syncedCount > 1 ? "s" : ""} to the server`);
      onSyncSuccess?.();
    }
    if (conflictCount > 0) {
      onToast?.("attention", `${conflictCount} change${conflictCount > 1 ? "s" : ""} need your attention`);
    }
  }, [serviceRecordId, onSyncSuccess, onToast, refreshOutbox]);

  // Listen to network status changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      replayOutbox();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [replayOutbox]);

  // Queue or execute count save
  const queueSaveCount = async (
    input: SaveCountSheetInput,
    categoryName: string
  ): Promise<{ offline: boolean; success: boolean; error?: string }> => {
    const idempotencyKey = crypto.randomUUID();
    const payload = { ...input, idempotencyKey };

    // If completely offline, enqueue directly
    if (!navigator.onLine) {
      await enqueueOutboxItem({
        id: idempotencyKey,
        type: "SAVE_COUNT",
        serviceRecordId,
        description: `${categoryName} count save (${input.lines.reduce((s, l) => s + l.quantity, 0)} notes/coins)`,
        payload,
      });
      await refreshOutbox();
      return { offline: true, success: true };
    }

    // Try live execution
    try {
      const res = await saveCountAction(payload);
      if (res.success) {
        return { offline: false, success: true };
      }

      // Check if it's a conflict
      return { offline: false, success: false, error: res.error.message };
    } catch {
      // Network failed during execution: enqueue to outbox
      await enqueueOutboxItem({
        id: idempotencyKey,
        type: "SAVE_COUNT",
        serviceRecordId,
        description: `${categoryName} count save`,
        payload,
      });
      await refreshOutbox();
      return { offline: true, success: true };
    }
  };

  // Queue or execute tithe / giving entry
  const queueAddGiving = async (
    input: AddGivingEntryInput,
    displayLabel: string
  ): Promise<{ offline: boolean; success: boolean; data?: any; error?: string }> => {
    const idempotencyKey = crypto.randomUUID();
    const payload = { ...input, idempotencyKey };

    if (!navigator.onLine) {
      await enqueueOutboxItem({
        id: idempotencyKey,
        type: "ADD_GIVING",
        serviceRecordId,
        description: `Tithe entry for ${displayLabel} (GH₵ ${input.amount})`,
        payload,
      });
      await refreshOutbox();
      return { offline: true, success: true, data: { id: idempotencyKey, receiptId: null } };
    }

    try {
      const res = await addGivingEntryAction(payload);
      if (res.success) {
        return { offline: false, success: true, data: res.data };
      }
      return { offline: false, success: false, error: res.error.message };
    } catch {
      // Network failed during execution: enqueue to outbox
      await enqueueOutboxItem({
        id: idempotencyKey,
        type: "ADD_GIVING",
        serviceRecordId,
        description: `Tithe entry for ${displayLabel} (GH₵ ${input.amount})`,
        payload,
      });
      await refreshOutbox();
      return { offline: true, success: true, data: { id: idempotencyKey, receiptId: null } };
    }
  };

  // Resolve conflict: Keep mine (retry) vs Keep server (discard)
  const resolveConflict = async (item: OutboxItem, choice: "keep-mine" | "keep-server") => {
    if (choice === "keep-server") {
      await removeOutboxItem(item.id);
      onToast?.("attention", "Discarded offline change; using server state.");
      await refreshOutbox();
      onSyncSuccess?.();
    } else {
      // Retry by resetting to pending
      await updateOutboxItem({
        ...item,
        status: "PENDING",
        error: undefined,
        conflictDetails: undefined,
      });
      await refreshOutbox();
      if (navigator.onLine) {
        replayOutbox();
      }
    }
  };

  const isCategoryPending = (categoryId: string): boolean => {
    return pendingItems.some(
      (item) => item.type === "SAVE_COUNT" && item.payload?.categoryId === categoryId
    );
  };

  const isGivingPending = (givingIdOrKey: string): boolean => {
    return pendingItems.some(
      (item) => item.type === "ADD_GIVING" && item.id === givingIdOrKey
    );
  };

  return {
    isOnline,
    pendingItems,
    conflictItems,
    isSyncing,
    queueSaveCount,
    queueAddGiving,
    replayOutbox,
    resolveConflict,
    isCategoryPending,
    isGivingPending,
  };
}
