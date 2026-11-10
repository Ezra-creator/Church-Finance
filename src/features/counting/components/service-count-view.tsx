"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Member,
  Role,
  ServiceStatus,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { AmountInput } from "@/components/ui/amount-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StepIndicator } from "@/components/ui/step-indicator";
import { MoneyText } from "@/components/ui/money-text";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { DenominationStepper } from "./denomination-stepper";
import { MemberCombobox } from "@/features/giving/components/member-combobox";
import { OfflineStatusBanner } from "./offline-status-banner";
import { useOfflineSync } from "@/lib/offline/use-offline-sync";
import { saveCountAction } from "@/features/counting/actions";
import {
  markCountedAction,
  reopenServiceRecordAction,
} from "@/features/services/actions";
import {
  addGivingEntryAction,
  deleteGivingEntryAction,
} from "@/features/giving/actions";

interface InitialCountLine {
  denominationId: string;
  quantity: number;
  lineTotal: string;
}

interface InitialCountSheet {
  id: string;
  categoryId: string;
  total: string;
  lines: InitialCountLine[];
}

interface InitialGivingEntry {
  id: string;
  categoryId: string;
  memberId: string | null;
  payerName: string | null;
  amount: string;
  receiptId: string | null;
  receiptNumber?: string | null;
  member?: {
    id: string;
    fullName: string;
    memberNumber: string | null;
    phone: string | null;
  } | null;
}

interface ServiceCountViewProps {
  serviceRecord: {
    id: string;
    serviceDate: string;
    serviceType: string;
    title: string | null;
    status: ServiceStatus;
    witnessName: string | null;
    countedBy: { name: string; email: string } | null;
  };
  denominations: Array<{
    id: string;
    value: string;
    kind: "NOTE" | "COIN";
    sortOrder: number;
  }>;
  categories: Array<{
    id: string;
    code: string;
    name: string;
    sortOrder: number;
  }>;
  initialSheets: InitialCountSheet[];
  initialGivingEntries: InitialGivingEntry[];
  initialMembers: Member[];
  userRole: Role;
}

export function ServiceCountView({
  serviceRecord,
  denominations,
  categories,
  initialSheets,
  initialGivingEntries,
  initialMembers,
  userRole,
}: ServiceCountViewProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id || ""
  );

  // Sheets state: Map categoryId -> Map denominationId -> quantity
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const cat of categories) {
      map[cat.id] = {};
      const sheet = initialSheets.find((s) => s.categoryId === cat.id);
      if (sheet) {
        for (const line of sheet.lines) {
          map[cat.id][line.denominationId] = line.quantity;
        }
      }
    }
    return map;
  });

  // Track pristine state for unsaved changes warning
  const [savedCounts, setSavedCounts] = useState<Record<string, Record<string, number>>>(
    () => JSON.parse(JSON.stringify(counts))
  );

  const [givingEntries, setGivingEntries] = useState<InitialGivingEntry[]>(
    initialGivingEntries
  );
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [recordStatus, setRecordStatus] = useState<ServiceStatus>(
    serviceRecord.status
  );
  const [witnessName, setWitnessName] = useState<string | null>(
    serviceRecord.witnessName
  );

  // Sheets saved totals state for grand total calculation using strings
  const [savedSheetTotals, setSavedSheetTotals] = useState<Record<string, string>>(() => {
    const totals: Record<string, string> = {};
    for (const sheet of initialSheets) {
      totals[sheet.categoryId] = sheet.total;
    }
    return totals;
  });

  // Dialog & Sheet States
  const [isMarkCountedOpen, setIsMarkCountedOpen] = useState(false);
  const [witnessInput, setWitnessInput] = useState("");
  const [markError, setMarkError] = useState<string | null>(null);

  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState<string | null>(null);

  // Tithe Entry Sheet State
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [visitorPayerName, setVisitorPayerName] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryReason, setEntryReason] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);

  const [deletingEntry, setDeletingEntry] = useState<InitialGivingEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const {
    isOnline,
    pendingItems,
    conflictItems,
    isSyncing,
    queueSaveCount,
    queueAddGiving,
    replayOutbox,
    resolveConflict,
    isCategoryPending,
  } = useOfflineSync({
    serviceRecordId: serviceRecord.id,
    onSyncSuccess: () => {},
    onToast: (variant, msg) => addToast(variant, msg),
  });

  const isLocked = recordStatus === ServiceStatus.LOCKED;
  const isCounted = recordStatus === ServiceStatus.COUNTED;
  const isViewer = userRole === Role.PRESBYTERY_VIEWER;
  const canEdit = !isLocked && !isViewer;
  const canReopen = isCounted && userRole === Role.FINANCE_SECRETARY;

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const isTitheTab = activeCategory?.code === "TITHE";

  // Check if current category has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const current = counts[activeCategoryId] || {};
    const saved = savedCounts[activeCategoryId] || {};
    for (const d of denominations) {
      if ((current[d.id] || 0) !== (saved[d.id] || 0)) {
        return true;
      }
    }
    return false;
  }, [counts, savedCounts, activeCategoryId, denominations]);

  // Beforeunload guard for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Client calculation of running category total with decimal.js
  const runningCategoryTotal = useMemo(() => {
    const current = counts[activeCategoryId] || {};
    let total = new Decimal(0);
    for (const d of denominations) {
      const qty = current[d.id] || 0;
      if (qty > 0) {
        total = total.plus(new Decimal(d.value).times(qty));
      }
    }
    return total.toString();
  }, [counts, activeCategoryId, denominations]);

  // Grand total calculation across all saved category sheets with decimal.js
  const grandTotal = useMemo(() => {
    let total = new Decimal(0);
    for (const cat of categories) {
      if (cat.id === activeCategoryId) {
        total = total.plus(new Decimal(runningCategoryTotal));
      } else {
        total = total.plus(new Decimal(savedSheetTotals[cat.id] || "0"));
      }
    }
    return total.toString();
  }, [categories, activeCategoryId, runningCategoryTotal, savedSheetTotals]);

  // Attributed vs unattributed tithe calculation with decimal.js
  const unattributedTithe = useMemo(() => {
    if (!isTitheTab) return "0";
    const sheetTotalDec = new Decimal(runningCategoryTotal);
    const individualTotalDec = givingEntries
      .filter((e) => e.categoryId === activeCategoryId)
      .reduce((acc, curr) => acc.plus(new Decimal(curr.amount || "0")), new Decimal(0));
    return sheetTotalDec.minus(individualTotalDec).toString();
  }, [isTitheTab, runningCategoryTotal, givingEntries, activeCategoryId]);

  // Debounced polite live region (500ms) for assistive devices
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setLiveAnnouncement(`${activeCategory?.name || "Collection"} total is ${formatMoney(runningCategoryTotal)}`);
    }, 500);
    return () => clearTimeout(timer);
  }, [runningCategoryTotal, activeCategory?.name]);

  const handleQuantityChange = (denominationId: string, quantity: number) => {
    setCounts((prev) => ({
      ...prev,
      [activeCategoryId]: {
        ...(prev[activeCategoryId] || {}),
        [denominationId]: quantity,
      },
    }));
  };

  const handleSaveCount = () => {
    if (!canEdit || isPending || isSubmitting) return;

    setIsSubmitting(true);
    startTransition(async () => {
      const currentCategoryCounts = counts[activeCategoryId] || {};
      const currentLines = denominations.map((d) => ({
        denominationId: d.id,
        quantity: currentCategoryCounts[d.id] || 0,
      }));

      const res = await saveCountAction({
        serviceRecordId: serviceRecord.id,
        categoryId: activeCategoryId,
        lines: currentLines,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        setIsSubmitting(false);
        return;
      }

      setSavedCounts((prev) => ({
        ...prev,
        [activeCategoryId]: { ...(counts[activeCategoryId] || {}) },
      }));
      setSavedSheetTotals((prev) => ({
        ...prev,
        [activeCategoryId]: runningCategoryTotal,
      }));

      addToast("success", `${activeCategory?.name} count saved`);
      setIsSubmitting(false);
    });
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter saves count sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSaveCount();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, canEdit, isPending, isSubmitting, activeCategoryId, counts]);

  const handleMarkCounted = (e: React.FormEvent) => {
    e.preventDefault();
    setMarkError(null);

    if (!witnessInput.trim()) {
      setMarkError("Witness name is required.");
      return;
    }

    startTransition(async () => {
      const res = await markCountedAction(serviceRecord.id, {
        witnessName: witnessInput.trim(),
      });

      if (!res.success) {
        setMarkError(res.error.message);
        return;
      }

      setRecordStatus(ServiceStatus.COUNTED);
      setWitnessName(witnessInput.trim());
      setIsMarkCountedOpen(false);
      addToast("success", "Service record marked as counted");
    });
  };

  const handleReopenRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setReopenError(null);

    if (!reopenReason.trim()) {
      setReopenError("A detailed reason is required for reopening.");
      return;
    }

    startTransition(async () => {
      const res = await reopenServiceRecordAction(serviceRecord.id, {
        reason: reopenReason.trim(),
      });

      if (!res.success) {
        setReopenError(res.error.message);
        return;
      }

      setRecordStatus(ServiceStatus.OPEN);
      setIsReopenOpen(false);
      setReopenReason("");
      addToast("warning", "Service record reopened for adjustments");
    });
  };

  const handleAddGivingEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);

    if (!selectedMemberId && !visitorPayerName.trim()) {
      setEntryError("Select a member or enter a visitor payer name.");
      return;
    }

    const dec = new Decimal(entryAmount || "0");
    if (dec.isZero() || dec.isNegative()) {
      setEntryError("Enter a valid amount greater than zero.");
      return;
    }

    if (isCounted && !entryReason.trim()) {
      setEntryError("Reason is required because this service record is counted.");
      return;
    }

    startTransition(async () => {
      const res = await addGivingEntryAction({
        serviceRecordId: serviceRecord.id,
        categoryId: activeCategoryId,
        memberId: selectedMemberId || undefined,
        payerName: visitorPayerName.trim() || undefined,
        amount: dec.toString(),
        reason: entryReason.trim() || undefined,
      });

      if (!res.success) {
        setEntryError(res.error.message);
        return;
      }

      const selectedMember = members.find((m) => m.id === selectedMemberId);
      const newEntry: InitialGivingEntry = {
        id: res.data.id,
        categoryId: activeCategoryId,
        memberId: selectedMemberId,
        payerName: visitorPayerName.trim() || null,
        amount: dec.toString(),
        receiptId: res.data.receiptId || null,
        receiptNumber: null,
        member: selectedMember
          ? {
              id: selectedMember.id,
              fullName: selectedMember.fullName,
              memberNumber: selectedMember.memberNumber,
              phone: selectedMember.phone,
            }
          : null,
      };

      setGivingEntries((prev) => [newEntry, ...prev]);
      setIsAddEntryOpen(false);
      setSelectedMemberId(null);
      setVisitorPayerName("");
      setEntryAmount("");
      setEntryReason("");
      addToast("success", `Tithe payment recorded (${formatMoney(dec.toString())})`);
    });
  };

  const handleDeleteGivingEntry = (entry: InitialGivingEntry) => {
    if (isCounted && !deleteReason.trim()) return;

    startTransition(async () => {
      const res = await deleteGivingEntryAction(
        {
          id: entry.id,
          reason: deleteReason.trim() || undefined,
        },
        serviceRecord.id
      );

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      setGivingEntries((prev) => prev.filter((e) => e.id !== entry.id));
      setDeletingEntry(null);
      setDeleteReason("");
      addToast("success", "Tithe entry removed");
    });
  };

  const getStatusBadge = () => {
    switch (recordStatus) {
      case ServiceStatus.COUNTED:
        return <Badge variant="Balanced">Counted</Badge>;
      case ServiceStatus.LOCKED:
        return <Badge variant="Neutral">Locked</Badge>;
      default:
        return <Badge variant="Needs attention">In progress</Badge>;
    }
  };

  const currentStep = isCounted ? 2 : hasUnsavedChanges ? 1 : 0;

  return (
    <div className="space-y-6 text-left">
      {/* Polite live region debounced by 500ms */}
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Step Indicator: Details, Cash, Review */}
      <StepIndicator
        steps={[
          { id: "details", label: "Details" },
          { id: "cash", label: "Cash" },
          { id: "review", label: "Review" },
        ]}
        currentStep={currentStep}
      />

      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-heading font-semibold text-text leading-tight">
              {formatAccraDate(new Date(serviceRecord.serviceDate), {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </h1>
            {getStatusBadge()}
          </div>
          <p className="text-body text-muted">
            {serviceRecord.serviceType} service count
            {witnessName ? ` · Witnessed by ${witnessName}` : ""}
          </p>
        </div>

        {/* Grand Total & Actions */}
        <div className="flex items-center gap-4 self-start sm:self-auto">
          <div className="text-left sm:text-right">
            <span className="text-caption text-muted block">Grand total</span>
            <div className="text-figure font-semibold text-text tnum tabular-nums">
              <MoneyText amount={grandTotal} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isLocked && !isCounted && canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsMarkCountedOpen(true)}
              >
                Mark counted
              </Button>
            )}
            {canReopen && (
              <Button
                variant="ghost"
                size="sm"
                className="text-bad hover:text-bad-ink"
                onClick={() => setIsReopenOpen(true)}
              >
                Reopen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Locked Notice */}
      {isLocked && (
        <InlineAlert tone="info">
          This service record is permanently locked. All collection figures and receipts are read-only.
        </InlineAlert>
      )}

      {/* Offline Status */}
      <OfflineStatusBanner
        isOnline={isOnline}
        pendingCount={pendingItems.length}
        isSyncing={isSyncing}
        conflicts={conflictItems}
        onManualSync={replayOutbox}
        onResolveConflict={resolveConflict}
      />

      {/* Category Segmented Control */}
      <div className="w-full overflow-x-auto pb-1">
        <SegmentedControl
          value={activeCategoryId}
          onChange={(val) => setActiveCategoryId(val)}
          options={categories.map((cat) => ({
            value: cat.id,
            label: (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span>{cat.name}</span>
                <span className="text-caption text-muted tnum tabular-nums">
                  ({formatMoney(savedSheetTotals[cat.id] || "0")})
                </span>
              </span>
            ),
          }))}
        />
      </div>

      {/* Layout with sticky summary right on desktop, table on left */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Cash Counting Column (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lead font-semibold text-text">
              Cash count — {activeCategory?.name}
            </h2>
            {hasUnsavedChanges && (
              <span className="text-caption font-medium text-warn">
                ● Unsaved changes
              </span>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Denomination</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead align="right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {denominations.map((denom) => {
                const qty = counts[activeCategoryId]?.[denom.id] || 0;
                const lineTotal = new Decimal(denom.value).times(qty).toString();

                return (
                  <TableRow key={denom.id}>
                    <TableCell className="font-medium text-text">
                      <span className="tnum tabular-nums">{formatMoney(denom.value)}</span>
                      <span className="ml-1.5 text-caption text-muted">
                        {denom.kind === "NOTE" ? "note" : "coin"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex justify-center">
                        <DenominationStepper
                          quantity={qty}
                          onChange={(newQty) =>
                            handleQuantityChange(denom.id, newQty)
                          }
                          disabled={!canEdit}
                        />
                      </div>
                    </TableCell>
                    <TableCell align="right" className="font-medium tnum tabular-nums text-text">
                      <MoneyText amount={lineTotal} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Tithe Section */}
          {isTitheTab && (
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lead font-semibold text-text">
                    Tithe entries
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-body text-muted">
                    <span>Unattributed:</span>
                    <span className="font-semibold text-text tnum tabular-nums">
                      <MoneyText amount={unattributedTithe} />
                    </span>
                    <Badge variant={new Decimal(unattributedTithe).greaterThan(0) ? "Needs attention" : "Balanced"}>
                      {new Decimal(unattributedTithe).greaterThan(0) ? "Pending attribution" : "Balanced"}
                    </Badge>
                  </div>
                </div>

                {canEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedMemberId(null);
                      setVisitorPayerName("");
                      setEntryAmount("");
                      setEntryReason("");
                      setEntryError(null);
                      setIsAddEntryOpen(true);
                    }}
                  >
                    Add tithe entry
                  </Button>
                )}
              </div>

              {givingEntries.filter((e) => e.categoryId === activeCategoryId).length === 0 ? (
                <EmptyState
                  title="No tithe payments recorded"
                  description="Record tithe payments against members or visitors. An official receipt is issued for each payment."
                  action={
                    canEdit ? (
                      <Button
                        variant="secondary"
                        onClick={() => setIsAddEntryOpen(true)}
                      >
                        Add tithe entry
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="border border-border rounded-panel bg-surface divide-y divide-border">
                  {givingEntries
                    .filter((e) => e.categoryId === activeCategoryId)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-hover transition-colors duration-120"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-body text-text">
                              {entry.member?.fullName || entry.payerName || "Anonymous"}
                            </span>
                            {entry.member?.memberNumber && (
                              <span className="text-caption text-muted">
                                (No. {entry.member.memberNumber})
                              </span>
                            )}
                          </div>

                          {entry.receiptId ? (
                            <Link
                              href={`/receipts/${entry.receiptId}`}
                              className="text-caption text-accent hover:underline block"
                            >
                              View receipt {entry.receiptNumber ? `(${entry.receiptNumber})` : ""}
                            </Link>
                          ) : (
                            <span className="text-caption text-muted block">
                              Waiting to sync
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="text-body font-semibold text-text tnum tabular-nums">
                            <MoneyText amount={entry.amount} />
                          </span>

                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingEntry(entry);
                                setDeleteReason("");
                              }}
                              className="text-muted hover:text-bad p-1 h-8"
                              aria-label="Delete tithe entry"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Summary Column Right on Desktop (1 col) */}
        <div className="space-y-4">
          <div className="hidden lg:block sticky top-24 p-5 border border-border rounded-panel bg-surface space-y-4">
            <h3 className="text-lead font-semibold text-text">
              Sheet summary
            </h3>

            <div className="space-y-2 divide-y divide-border text-body">
              <div className="flex items-center justify-between pb-2">
                <span className="text-muted">{activeCategory?.name} counted</span>
                <span className="font-semibold text-text tnum tabular-nums">
                  <MoneyText amount={runningCategoryTotal} />
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-medium text-text">Grand total</span>
                <span className="font-semibold text-text tnum tabular-nums">
                  <MoneyText amount={grandTotal} />
                </span>
              </div>
            </div>

            {canEdit && (
              <Button
                variant="primary"
                disabled={isPending || isSubmitting || !hasUnsavedChanges}
                onClick={handleSaveCount}
                className="w-full"
              >
                {isPending || isSubmitting ? "Saving..." : "Save count"}
              </Button>
            )}
            <p className="text-caption text-muted text-center">
              Press Cmd/Ctrl + Enter to save
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar on Mobile (<1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 z-40 flex items-center justify-between pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        <div className="space-y-0.5">
          <span className="text-caption text-muted">
            {activeCategory?.name} total
          </span>
          <div className="text-title font-semibold text-text tnum tabular-nums">
            <MoneyText amount={runningCategoryTotal} />
          </div>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            disabled={isPending || isSubmitting || !hasUnsavedChanges}
            onClick={handleSaveCount}
            className="px-6"
          >
            {isPending || isSubmitting ? "Saving..." : "Save count"}
          </Button>
        )}
      </div>

      {/* Mark Counted Sheet */}
      <Sheet
        isOpen={isMarkCountedOpen}
        onClose={() => setIsMarkCountedOpen(false)}
        title="Complete count and sign"
        description="Verify collection figures before completing the count with a witness."
      >
        <form onSubmit={handleMarkCounted} className="space-y-4 py-2">
          {markError && (
            <InlineAlert tone="danger">
              {markError}
            </InlineAlert>
          )}

          <div className="border border-border rounded-panel divide-y divide-border bg-surface">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 flex items-center justify-between text-caption"
              >
                <span className="text-muted">{cat.name}</span>
                <span className="font-medium text-text tnum tabular-nums">
                  <MoneyText amount={savedSheetTotals[cat.id] || "0"} />
                </span>
              </div>
            ))}
            <div className="p-3 flex items-center justify-between text-body font-semibold bg-surface">
              <span className="text-text">Grand total</span>
              <span className="text-text tnum tabular-nums">
                <MoneyText amount={grandTotal} />
              </span>
            </div>
          </div>

          <TextField
            id="witness-name"
            label="Witness full name"
            value={witnessInput}
            onChange={(e) => setWitnessInput(e.target.value)}
            placeholder="Witness name"
            required
            hint="The second person who counted and verified cash collections."
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsMarkCountedOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending}>
              Confirm and sign
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Reopen Record Sheet */}
      <Sheet
        isOpen={isReopenOpen}
        onClose={() => setIsReopenOpen(false)}
        title="Reopen counted record"
        description="Reopening enables adjustments to denomination lines and tithe payments."
      >
        <form onSubmit={handleReopenRecord} className="space-y-4 py-2">
          {reopenError && (
            <InlineAlert tone="danger">
              {reopenError}
            </InlineAlert>
          )}

          <TextField
            id="reopen-reason"
            label="Reason for reopening"
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Audit discrepancy adjustment"
            required
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReopenOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending}>
              Reopen record
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Add Tithe Entry Sheet */}
      <Sheet
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title="Record tithe payment"
        description="Select a member or specify a visitor payer name."
      >
        <form onSubmit={handleAddGivingEntry} className="space-y-4 py-2">
          {entryError && (
            <InlineAlert tone="danger">
              {entryError}
            </InlineAlert>
          )}

          <MemberCombobox
            members={members}
            selectedMemberId={selectedMemberId}
            onSelectMember={(memberId) => {
              setSelectedMemberId(memberId);
              if (memberId) setVisitorPayerName("");
            }}
            onMemberCreated={(newMember) => {
              setMembers((prev) => [newMember, ...prev]);
              setSelectedMemberId(newMember.id);
            }}
          />

          {!selectedMemberId && (
            <TextField
              id="visitor-name"
              label="Visitor payer name"
              value={visitorPayerName}
              onChange={(e) => setVisitorPayerName(e.target.value)}
              placeholder="Full name of visitor"
            />
          )}

          <AmountInput
            id="tithe-amount"
            label="Amount"
            value={entryAmount}
            onChange={(val) => setEntryAmount(val)}
            required
          />

          {isCounted && (
            <TextField
              id="entry-reason"
              label="Reason for adding after count"
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              required
            />
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddEntryOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending}>
              Issue receipt
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Delete Tithe Entry Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingEntry)}
        onClose={() => setDeletingEntry(null)}
        onConfirm={() => deletingEntry && handleDeleteGivingEntry(deletingEntry)}
        title="Delete tithe entry"
        description={`Are you sure you want to delete the tithe payment of ${deletingEntry ? formatMoney(deletingEntry.amount) : ""}? This will void the associated receipt.`}
        confirmLabel="Delete payment"
        isDestructive
        isLoading={isPending}
      />
    </div>
  );
}
