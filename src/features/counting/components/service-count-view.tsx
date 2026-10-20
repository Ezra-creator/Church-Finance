"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Denomination,
  GivingCategory,
  Member,
  Role,
  ServiceStatus,
} from "@prisma/client";
import {
  Calendar,
  CheckCircle2,
  Lock,
  Unlock,
  Receipt as ReceiptIcon,
  Plus,
  Trash2,
  Printer,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RuleHeading } from "@/components/ui/rule-heading";
import { StatusMark } from "@/components/ui/status-mark";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { AmountInput } from "@/components/ui/amount-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { DenominationStepper } from "./denomination-stepper";
import { MemberCombobox } from "@/features/giving/components/member-combobox";
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

  // Sheets saved totals state for grand total calculation
  const [savedSheetTotals, setSavedSheetTotals] = useState<Record<string, number>>(() => {
    const totals: Record<string, number> = {};
    for (const sheet of initialSheets) {
      totals[sheet.categoryId] = parseFloat(sheet.total) || 0;
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
  const { addToast } = useToast();

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

  // Warn on browser navigation if unsaved changes exist
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

  // Client calculation of running category total
  const runningCategoryTotal = useMemo(() => {
    const current = counts[activeCategoryId] || {};
    let sum = 0;
    for (const d of denominations) {
      const qty = current[d.id] || 0;
      if (qty > 0) {
        sum += parseFloat(d.value) * qty;
      }
    }
    return sum;
  }, [counts, activeCategoryId, denominations]);

  // Grand total calculation across all saved category sheets
  const grandTotal = useMemo(() => {
    let sum = 0;
    for (const cat of categories) {
      if (cat.id === activeCategoryId) {
        sum += runningCategoryTotal;
      } else {
        sum += savedSheetTotals[cat.id] || 0;
      }
    }
    return sum;
  }, [savedSheetTotals, activeCategoryId, runningCategoryTotal, categories]);

  // Tithe entries sum and unattributed calculations
  const countedTitheTotal = savedSheetTotals[activeCategory?.id || ""] || 0;
  const titheEntriesSum = useMemo(() => {
    if (!activeCategory) return 0;
    return givingEntries
      .filter((e) => e.categoryId === activeCategory.id)
      .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  }, [givingEntries, activeCategory]);

  const unattributedTithe = Math.max(0, countedTitheTotal - titheEntriesSum);

  const handleQuantityChange = (denomId: string, quantity: number) => {
    if (!canEdit) return;
    setCounts((prev) => ({
      ...prev,
      [activeCategoryId]: {
        ...(prev[activeCategoryId] || {}),
        [denomId]: quantity,
      },
    }));
  };

  const handleSaveCount = () => {
    if (!canEdit) return;
    const currentLines = denominations.map((d) => ({
      denominationId: d.id,
      quantity: counts[activeCategoryId]?.[d.id] || 0,
    }));

    startTransition(async () => {
      const res = await saveCountAction({
        serviceRecordId: serviceRecord.id,
        categoryId: activeCategoryId,
        lines: currentLines,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      const newTotal = parseFloat(res.data.total);
      setSavedCounts((prev) => ({
        ...prev,
        [activeCategoryId]: { ...(counts[activeCategoryId] || {}) },
      }));
      setSavedSheetTotals((prev) => ({
        ...prev,
        [activeCategoryId]: newTotal,
      }));

      addToast(
        "success",
        `${activeCategory?.name} count verified and saved (GH₵ ${res.data.total})`
      );
    });
  };

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
      addToast("success", "Service record officially marked as counted");
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
      addToast("attention", "Service record reopened for adjustments");
    });
  };

  const handleAddGivingEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);

    if (!selectedMemberId && !visitorPayerName.trim()) {
      setEntryError("Please select a registered member or enter a visitor payer name.");
      return;
    }

    const amountNum = parseFloat(entryAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setEntryError("Please enter a valid amount greater than zero.");
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
        memberId: selectedMemberId,
        payerName: visitorPayerName.trim() || null,
        amount: entryAmount,
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
        amount: amountNum.toFixed(2),
        receiptId: res.data.receiptId,
        receiptNumber: "Generated",
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
      addToast("success", `Tithe payment recorded (GH₵ ${amountNum.toFixed(2)})`);
      setIsAddEntryOpen(false);
      setSelectedMemberId(null);
      setVisitorPayerName("");
      setEntryAmount("");
      setEntryReason("");
    });
  };

  const handleDeleteGivingEntry = () => {
    if (!deletingEntry) return;

    startTransition(async () => {
      const res = await deleteGivingEntryAction(
        {
          id: deletingEntry.id,
          reason: deleteReason.trim() || undefined,
        },
        serviceRecord.id
      );

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      setGivingEntries((prev) => prev.filter((e) => e.id !== deletingEntry.id));
      addToast("success", "Tithe entry and associated receipt removed");
      setDeletingEntry(null);
      setDeleteReason("");
    });
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header with Ledger Title, Status, and Grand Total */}
      <div className="space-y-3 pb-6 border-b border-rule">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-mono text-ink-soft">
              {serviceRecord.serviceType} Service • Collection Ledger
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif text-ink mt-0.5">
              {formatAccraDate(new Date(serviceRecord.serviceDate), {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <StatusMark
                tone={
                  isLocked ? "neutral" : isCounted ? "balanced" : "attention"
                }
                label={recordStatus}
              />
              {witnessName && (
                <span className="text-ink-soft font-mono">
                  Witnessed by: <strong className="text-ink font-sans">{witnessName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Grand Total Ledger Display */}
          <div className="text-left sm:text-right">
            <p className="text-[11px] uppercase tracking-wider font-mono text-ink-soft">
              Grand Total
            </p>
            <p className="text-2xl sm:text-3xl font-mono text-ink tabular-nums font-semibold mt-0.5">
              GH₵ {grandTotal.toFixed(2)}
            </p>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2 justify-start sm:justify-end">
              {!isLocked && !isCounted && canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsMarkCountedOpen(true)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Mark as counted
                </Button>
              )}
              {canReopen && (
                <Button
                  variant="quiet"
                  size="sm"
                  className="text-variance hover:bg-variance/10"
                  onClick={() => setIsReopenOpen(true)}
                >
                  <Unlock className="w-4 h-4 mr-1.5" />
                  Reopen service
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Locked Banner */}
        {isLocked && (
          <div className="p-3 bg-paper border border-rule-strong rounded-[2px] flex items-center gap-2 text-xs text-ink-soft">
            <Lock className="w-4 h-4 text-ink flex-shrink-0" />
            <span>
              This service record is permanently locked. All collection figures and receipts are read-only.
            </span>
          </div>
        )}
      </div>

      {/* Category Switch: Three Underlined Text Tabs */}
      <div className="flex border-b border-rule">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`py-3 px-4 text-sm font-medium transition-colors relative min-h-[44px] flex items-center gap-2 ${
                isActive
                  ? "text-ink border-b-2 border-ink -mb-px"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-xs font-mono text-ink-soft tabular-nums">
                GH₵ {(savedSheetTotals[cat.id] || 0).toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Denominations Ruled Cash Count Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-mono text-ink-soft">
            Physical Cash Verification — {activeCategory?.name}
          </h2>
          {hasUnsavedChanges && (
            <span className="text-xs font-mono text-attention">
              ● Unsaved count changes
            </span>
          )}
        </div>

        <div className="border border-rule rounded-[2px] bg-paper divide-y divide-rule">
          {denominations.map((denom) => {
            const qty = counts[activeCategoryId]?.[denom.id] || 0;
            const lineTotal = (parseFloat(denom.value) * qty).toFixed(2);

            return (
              <div
                key={denom.id}
                className="p-3 sm:px-4 flex items-center justify-between gap-3"
              >
                {/* Denomination Value */}
                <div className="w-32 sm:w-48">
                  <span className="font-mono text-sm sm:text-base font-medium text-ink">
                    GH₵ {parseFloat(denom.value).toFixed(2)}
                  </span>
                  <span className="ml-2 text-[10px] text-ink-soft uppercase font-mono">
                    {denom.kind}
                  </span>
                </div>

                {/* Thumb-Stepper Input */}
                <div className="flex-1 flex justify-center">
                  <DenominationStepper
                    quantity={qty}
                    onChange={(newQty) =>
                      handleQuantityChange(denom.id, newQty)
                    }
                    disabled={!canEdit}
                  />
                </div>

                {/* Line Total in Tabular Mono */}
                <div className="w-24 sm:w-32 text-right">
                  <span className="font-mono text-sm sm:text-base tabular-nums text-ink">
                    GH₵ {lineTotal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tithe Register Section (Displayed only on Tithe tab) */}
      {isTitheTab && (
        <div className="pt-8 border-t border-rule space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-mono text-ink-soft">
                Tithe Ledger & Envelopes
              </p>
              <h2 className="text-xl font-serif text-ink mt-0.5">
                Member Tithe Register
              </h2>
            </div>

            {canEdit && (
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedMemberId(null);
                  setVisitorPayerName("");
                  setEntryAmount("");
                  setEntryReason("");
                  setEntryError(null);
                  setIsAddEntryOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add tithe entry
              </Button>
            )}
          </div>

          {/* Unattributed Meter */}
          <div className="p-4 border border-rule rounded-[2px] bg-paper grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-mono text-ink-soft">
                Counted Tithe Cash
              </p>
              <p className="text-lg font-mono font-medium text-ink tabular-nums mt-0.5">
                GH₵ {countedTitheTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-mono text-ink-soft">
                Attributed to Members
              </p>
              <p className="text-lg font-mono font-medium text-balanced tabular-nums mt-0.5">
                GH₵ {titheEntriesSum.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-mono text-ink-soft">
                Unattributed Remainder
              </p>
              <p className="text-lg font-mono font-semibold text-attention tabular-nums mt-0.5">
                GH₵ {unattributedTithe.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Tithe Entries List */}
          {givingEntries.filter((e) => e.categoryId === activeCategoryId).length ===
          0 ? (
            <EmptyState
              title="No individual tithe payments recorded"
              description="Record tithe payments against parish members or visitors. An official numbered receipt is issued automatically for each entry."
              action={
                canEdit ? (
                  <Button
                    variant="secondary"
                    onClick={() => setIsAddEntryOpen(true)}
                  >
                    Record first tithe payment
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="border border-rule rounded-[2px] bg-paper divide-y divide-rule">
              {givingEntries
                .filter((e) => e.categoryId === activeCategoryId)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ink/[0.02] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-ink">
                          {entry.member?.fullName || entry.payerName || "Anonymous"}
                        </span>
                        {entry.member?.memberNumber && (
                          <span className="text-xs font-mono text-ink-soft">
                            (No. {entry.member.memberNumber})
                          </span>
                        )}
                      </div>

                      {entry.receiptId && (
                        <Link
                          href={`/receipts/${entry.receiptId}`}
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-ink hover:underline"
                        >
                          <ReceiptIcon className="w-3.5 h-3.5 text-ink-soft" />
                          <span>View Official Receipt</span>
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <span className="font-mono text-base font-semibold tabular-nums text-ink">
                        GH₵ {parseFloat(entry.amount).toFixed(2)}
                      </span>

                      {canEdit && (
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => {
                            setDeletingEntry(entry);
                            setDeleteReason("");
                          }}
                          className="text-ink-soft hover:text-variance min-h-[44px]"
                          aria-label="Delete tithe entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Bar on Mobile & Desktop Save Count Bar */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-rail bg-paper border-t border-rule p-4 z-30 shadow-sm flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider font-mono text-ink-soft">
            {activeCategory?.name} Total
          </p>
          <p className="text-xl sm:text-2xl font-mono font-semibold tabular-nums text-ink">
            GH₵ {runningCategoryTotal.toFixed(2)}
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            disabled={isPending || !hasUnsavedChanges}
            onClick={handleSaveCount}
            className="min-h-[44px] px-6"
          >
            {isPending ? "Verifying..." : "Save count"}
          </Button>
        )}
      </div>

      {/* Mark As Counted Confirmation Sheet */}
      <Sheet
        isOpen={isMarkCountedOpen}
        onClose={() => setIsMarkCountedOpen(false)}
        title="Complete Cash Count & Sign"
        description="Verify the collection figures before completing the count with a witness."
      >
        <form onSubmit={handleMarkCounted} className="space-y-4 py-3">
          {markError && (
            <div className="p-3 bg-variance text-variance text-xs rounded-[2px] border border-variance/30">
              {markError}
            </div>
          )}

          {/* Breakdown summary */}
          <div className="border border-rule rounded-[2px] divide-y divide-rule bg-paper">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-2.5 flex items-center justify-between text-xs"
              >
                <span className="text-ink font-medium">{cat.name}</span>
                <span className="font-mono tabular-nums text-ink">
                  GH₵ {(savedSheetTotals[cat.id] || 0).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="p-2.5 flex items-center justify-between text-xs font-semibold bg-ink/[0.03]">
              <span className="text-ink">Grand Total</span>
              <span className="font-mono tabular-nums text-ink">
                GH₵ {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <TextField
            id="witness-name"
            label="Witness full name"
            value={witnessInput}
            onChange={(e) => setWitnessInput(e.target.value)}
            placeholder="e.g. Deaconess Abena Osei"
            required
            detail="The second person who counted and verified the cash bags"
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-rule">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setIsMarkCountedOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Submitting..." : "Confirm & mark counted"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Reopen Record Dialog (Secretary Only) */}
      <Sheet
        isOpen={isReopenOpen}
        onClose={() => setIsReopenOpen(false)}
        title="Reopen Counted Service Record"
        description="Reopening enables adjustments to denomination lines and tithe payments."
      >
        <form onSubmit={handleReopenRecord} className="space-y-4 py-3">
          {reopenError && (
            <div className="p-3 bg-variance text-variance text-xs rounded-[2px] border border-variance/30">
              {reopenError}
            </div>
          )}

          <div className="p-3 bg-attention text-attention text-xs rounded-[2px] border border-attention/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Reopening will return this service record to OPEN state. Every subsequent change will be logged in the permanent audit trail.
            </span>
          </div>

          <TextField
            id="reopen-reason"
            label="Reason for reopening"
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="e.g. Recounting evening service envelope bundle"
            required
            detail="Required for the permanent parish audit record"
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-rule">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setIsReopenOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              className="border-variance text-variance hover:bg-variance/10"
              disabled={isPending}
            >
              {isPending ? "Reopening..." : "Reopen record"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Add Tithe Entry Sheet */}
      <Sheet
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title="Record Tithe Payment"
        description="Enter payment amount to allocate against counted tithe cash."
      >
        <form onSubmit={handleAddGivingEntry} className="space-y-4 py-3">
          {entryError && (
            <div className="p-3 bg-variance text-variance text-xs rounded-[2px] border border-variance/30">
              {entryError}
            </div>
          )}

          <MemberCombobox
            members={members}
            selectedMemberId={selectedMemberId}
            onSelectMember={(id) => setSelectedMemberId(id)}
            onMemberCreated={(newMem) => setMembers((prev) => [newMem, ...prev])}
          />

          {!selectedMemberId && (
            <TextField
              id="visitor-name"
              label="Or Visitor / Payer name"
              value={visitorPayerName}
              onChange={(e) => setVisitorPayerName(e.target.value)}
              placeholder="e.g. Kwabena Addo (Visiting)"
              detail="If payer is not a registered church member"
            />
          )}

          <AmountInput
            id="tithe-amount"
            label="Tithe Amount"
            value={entryAmount}
            onChange={(val) => setEntryAmount(val)}
            required
            placeholder="0.00"
          />

          {isCounted && (
            <TextField
              id="entry-reason"
              label="Audit Reason (Required)"
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              placeholder="e.g. Member submitted envelope after service count"
              required
            />
          )}

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-rule">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setIsAddEntryOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Recording..." : "Issue receipt & save"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Delete Entry Confirmation Dialog */}
      {deletingEntry && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Tithe Entry?"
          description={`Remove tithe payment of GH₵ ${deletingEntry.amount} for ${
            deletingEntry.member?.fullName || deletingEntry.payerName
          }? The associated receipt will also be permanently cancelled in the audit log.`}
          confirmLabel="Delete payment"
          tone="variance"
          onConfirm={handleDeleteGivingEntry}
          onCancel={() => setDeletingEntry(null)}
          isPending={isPending}
        />
      )}
    </div>
  );
}
