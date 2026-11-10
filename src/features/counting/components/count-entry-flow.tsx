"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import Decimal from "decimal.js";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MoneyText } from "@/components/ui/money-text";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import { saveCountAction } from "@/features/counting/actions";
import { createServiceRecordAction } from "@/features/services/actions";

export interface DenominationItem {
  id: string;
  kind: "NOTE" | "COIN";
  value: string;
  name: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  code: string;
}

export interface CountEntryFlowProps {
  initialServiceRecordId?: string;
  denominations: DenominationItem[];
  categories: CategoryItem[];
  defaultDate: string;
  currentUserName: string;
}

export function CountEntryFlow({
  initialServiceRecordId,
  denominations,
  categories,
  defaultDate,
  currentUserName,
}: CountEntryFlowProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [serviceRecordId, setServiceRecordId] = useState(initialServiceRecordId || "");

  // Step 1: Details
  const [serviceDate, setServiceDate] = useState(defaultDate);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [countedBy, setCountedBy] = useState(currentUserName);
  const [notes, setNotes] = useState("");
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Step 2: Quantities
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const d of denominations) {
      initial[d.id] = 0;
    }
    return initial;
  });

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Compute live total with Decimal.js
  const totalCounted = React.useMemo(() => {
    let sum = new Decimal(0);
    for (const d of denominations) {
      const q = quantities[d.id] || 0;
      if (q > 0) {
        sum = sum.plus(new Decimal(d.value).times(q));
      }
    }
    return sum;
  }, [denominations, quantities]);

  const nonZeroDenominations = React.useMemo(() => {
    return denominations
      .filter((d) => (quantities[d.id] || 0) > 0)
      .map((d) => {
        const q = quantities[d.id] || 0;
        const total = new Decimal(d.value).times(q);
        return {
          ...d,
          quantity: q,
          lineTotal: total.toFixed(2),
        };
      });
  }, [denominations, quantities]);

  const notesDenoms = denominations.filter((d) => d.kind === "NOTE");
  const coinsDenoms = denominations.filter((d) => d.kind === "COIN");

  const handleQuantityChange = (denomId: string, val: number) => {
    const clamped = Math.max(0, Math.min(999999, Math.floor(val)));
    setQuantities((prev) => ({ ...prev, [denomId]: clamped }));
  };

  const handleStep1Continue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceDate || !categoryId) {
      setDetailsError("Please complete required details.");
      return;
    }

    setDetailsError(null);

    // If we don't have a serviceRecordId yet, create one
    if (!serviceRecordId) {
      startTransition(async () => {
        const res = await createServiceRecordAction({
          serviceDate,
          serviceType: "SUNDAY",
          title: categories.find((c) => c.id === categoryId)?.name || "Sunday Offering",
          notes,
        });

        if (!res.success) {
          setDetailsError(res.error.message);
          return;
        }

        setServiceRecordId(res.data.id);
        setStep(2);
      });
    } else {
      setStep(2);
    }
  };

  const handleStep3Save = () => {
    if (!serviceRecordId) return;

    startTransition(async () => {
      const lines = Object.entries(quantities)
        .filter(([_, q]) => q > 0)
        .map(([denominationId, quantity]) => ({
          denominationId,
          quantity,
        }));

      const res = await saveCountAction({
        serviceRecordId,
        categoryId,
        lines,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      addToast("success", "Count saved");
      router.push(`/services/${serviceRecordId}`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col min-h-screen pb-safe bg-page">
      {/* Top Bar */}
      <header className="h-[64px] bg-surface border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-[14px] text-brand hover:underline"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Collections</span>
          </Link>
          <span className="text-border" aria-hidden="true">
            /
          </span>
          <h1 className="text-[18px] sm:text-[20px] font-semibold text-text leading-[28px]">
            Record a count
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1120px] 2xl:max-w-[1280px] w-full flex flex-col gap-6">
        {/* Step Indicator */}
        <StepIndicator
          steps={["Details", "Cash", "Review"]}
          currentStep={step}
          className="mb-2"
        />

        {/* STEP 1: Details */}
        {step === 1 && (
          <div className="max-w-[560px] w-full">
            <form onSubmit={handleStep1Continue} className="space-y-4">
              <Input
                label="Service date"
                type="date"
                required
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />

              <Select
                label="Collection type"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />

              <Input
                label="Counted by"
                required
                value={countedBy}
                onChange={(e) => setCountedBy(e.target.value)}
                placeholder="Enter counter names"
              />

              <Textarea
                label="Notes"
                optional
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special designations or observations"
              />

              {detailsError && (
                <div className="p-3 bg-bad-tint border border-bad rounded-control text-[14px] text-bad-ink">
                  {detailsError}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                isLoading={isPending}
                className="w-full sm:w-auto"
              >
                Continue
              </Button>
            </form>
          </div>
        )}

        {/* STEP 2: Cash Denominations */}
        {step === 2 && (
          <>
            {denominations.length === 0 ? (
              <EmptyState
                title="No denominations set up"
                description="Configure the currency denominations in settings before entering counts."
                actionLabel="Open settings"
                onAction={() => router.push("/settings")}
              />
            ) : (
              <div className="flex flex-col lg:flex-row items-start gap-8 relative pb-24 lg:pb-0">
                {/* Denominations List (max 560px) */}
                <div className="flex-1 max-w-[560px] w-full divide-y divide-border">
                  {notesDenoms.length > 0 && (
                    <div className="pb-4">
                      <div className="text-[13px] font-medium text-muted mb-2">
                        Notes
                      </div>
                      <div className="divide-y divide-border">
                        {notesDenoms.map((d, index) => {
                          const q = quantities[d.id] || 0;
                          const lineTotal = new Decimal(d.value).times(q);

                          return (
                            <div
                              key={d.id}
                              className="min-h-[64px] py-2 flex items-center justify-between gap-4"
                            >
                              <div className="text-[14px] font-medium text-text w-[100px]">
                                {d.name}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(d.id, q - 1)}
                                  disabled={q <= 0}
                                  aria-label={`Decrease ${d.name}`}
                                  className="w-[56px] h-[56px] flex items-center justify-center bg-surface border border-border-strong rounded-control text-text hover:bg-hover active:bg-hover disabled:opacity-30 disabled:cursor-not-allowed touch-target-qty"
                                >
                                  <Minus className="w-5 h-5" aria-hidden="true" />
                                </button>
                                <input
                                  ref={(el) => {
                                    inputRefs.current[d.id] = el;
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={q === 0 ? "" : q}
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value || "0", 10);
                                    handleQuantityChange(d.id, isNaN(val) ? 0 : val);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "ArrowDown") {
                                      e.preventDefault();
                                      const nextDenom = denominations[index + 1];
                                      if (nextDenom && inputRefs.current[nextDenom.id]) {
                                        inputRefs.current[nextDenom.id]?.focus();
                                      } else {
                                        setStep(3);
                                      }
                                    } else if (e.key === "ArrowUp") {
                                      e.preventDefault();
                                      const prevDenom = denominations[index - 1];
                                      if (prevDenom && inputRefs.current[prevDenom.id]) {
                                        inputRefs.current[prevDenom.id]?.focus();
                                      }
                                    }
                                  }}
                                  className="w-[80px] h-[56px] text-center text-[20px] font-semibold text-text bg-surface border border-border-strong rounded-control num focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(d.id, q + 1)}
                                  aria-label={`Increase ${d.name}`}
                                  className="w-[56px] h-[56px] flex items-center justify-center bg-surface border border-border-strong rounded-control text-text hover:bg-hover active:bg-hover touch-target-qty"
                                >
                                  <Plus className="w-5 h-5" aria-hidden="true" />
                                </button>
                              </div>
                              <div className="w-[120px] text-right text-[14px] num font-medium">
                                <MoneyText amount={lineTotal.toFixed(2)} emptyAsHyphen={true} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {coinsDenoms.length > 0 && (
                    <div className="pt-4">
                      <div className="text-[13px] font-medium text-muted mb-2">
                        Coins
                      </div>
                      <div className="divide-y divide-border">
                        {coinsDenoms.map((d, index) => {
                          const overallIndex = notesDenoms.length + index;
                          const q = quantities[d.id] || 0;
                          const lineTotal = new Decimal(d.value).times(q);

                          return (
                            <div
                              key={d.id}
                              className="min-h-[64px] py-2 flex items-center justify-between gap-4"
                            >
                              <div className="text-[14px] font-medium text-text w-[100px]">
                                {d.name}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(d.id, q - 1)}
                                  disabled={q <= 0}
                                  aria-label={`Decrease ${d.name}`}
                                  className="w-[56px] h-[56px] flex items-center justify-center bg-surface border border-border-strong rounded-control text-text hover:bg-hover active:bg-hover disabled:opacity-30 disabled:cursor-not-allowed touch-target-qty"
                                >
                                  <Minus className="w-5 h-5" aria-hidden="true" />
                                </button>
                                <input
                                  ref={(el) => {
                                    inputRefs.current[d.id] = el;
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={q === 0 ? "" : q}
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value || "0", 10);
                                    handleQuantityChange(d.id, isNaN(val) ? 0 : val);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "ArrowDown") {
                                      e.preventDefault();
                                      const nextDenom = denominations[overallIndex + 1];
                                      if (nextDenom && inputRefs.current[nextDenom.id]) {
                                        inputRefs.current[nextDenom.id]?.focus();
                                      } else {
                                        setStep(3);
                                      }
                                    } else if (e.key === "ArrowUp") {
                                      e.preventDefault();
                                      const prevDenom = denominations[overallIndex - 1];
                                      if (prevDenom && inputRefs.current[prevDenom.id]) {
                                        inputRefs.current[prevDenom.id]?.focus();
                                      }
                                    }
                                  }}
                                  className="w-[80px] h-[56px] text-center text-[20px] font-semibold text-text bg-surface border border-border-strong rounded-control num focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(d.id, q + 1)}
                                  aria-label={`Increase ${d.name}`}
                                  className="w-[56px] h-[56px] flex items-center justify-center bg-surface border border-border-strong rounded-control text-text hover:bg-hover active:bg-hover touch-target-qty"
                                >
                                  <Plus className="w-5 h-5" aria-hidden="true" />
                                </button>
                              </div>
                              <div className="w-[120px] text-right text-[14px] num font-medium">
                                <MoneyText amount={lineTotal.toFixed(2)} emptyAsHyphen={true} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Sticky 320px Summary Panel (>= 1024px) */}
                <div className="hidden lg:block w-[320px] sticky top-[88px] bg-surface border border-border rounded-panel p-6 shadow-none">
                  <div className="text-[12px] font-medium text-muted uppercase tracking-wider mb-1">
                    Total counted
                  </div>
                  <MoneyText amount={totalCounted.toFixed(2)} variant="headline" className="mb-6" />

                  {nonZeroDenominations.length > 0 && (
                    <div className="border-t border-border pt-4 space-y-2 mb-6">
                      {nonZeroDenominations.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between text-[13px] leading-[18px]"
                        >
                          <span className="text-muted">
                            {d.name} × {d.quantity}
                          </span>
                          <span className="num font-medium text-text">
                            {formatMoney(d.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={() => setStep(3)}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </div>

                {/* Mobile / Tablet Sticky Bottom Action Bar (< 1024px) */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border px-4 py-3 pb-safe flex items-center justify-between h-[72px]">
                  <div>
                    <div className="text-[12px] text-muted">Total counted</div>
                    <div className="text-[20px] font-semibold text-text num leading-[24px]">
                      {formatMoney(totalCounted.toFixed(2))}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setStep(3)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP 3: Review */}
        {step === 3 && (
          <div className="max-w-[640px] w-full space-y-6">
            {/* Details Summary */}
            <div className="bg-surface border border-border rounded-panel p-5 divide-y divide-border">
              <div className="pb-3 flex justify-between text-[14px]">
                <span className="text-muted">Service date</span>
                <span className="font-medium text-text">{serviceDate}</span>
              </div>
              <div className="py-3 flex justify-between text-[14px]">
                <span className="text-muted">Collection type</span>
                <span className="font-medium text-text">
                  {categories.find((c) => c.id === categoryId)?.name}
                </span>
              </div>
              <div className="py-3 flex justify-between text-[14px]">
                <span className="text-muted">Counted by</span>
                <span className="font-medium text-text">{countedBy}</span>
              </div>
              {notes && (
                <div className="pt-3 flex justify-between text-[14px]">
                  <span className="text-muted">Notes</span>
                  <span className="font-medium text-text">{notes}</span>
                </div>
              )}
            </div>

            {/* Non-zero denominations table */}
            <div className="bg-surface border border-border rounded-panel overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="h-[40px] border-b border-border bg-surface text-[13px] font-medium text-muted">
                    <th className="px-4">Denomination</th>
                    <th className="px-4 text-center">Quantity</th>
                    <th className="px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-[14px]">
                  {nonZeroDenominations.map((d) => (
                    <tr key={d.id} className="h-[44px]">
                      <td className="px-4 font-medium text-text">{d.name}</td>
                      <td className="px-4 text-center num text-muted">{d.quantity}</td>
                      <td className="px-4 text-right num font-medium text-text">
                        {formatMoney(d.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="h-[48px] border-t border-border-strong text-[14px] font-semibold text-text">
                    <td className="px-4">Total</td>
                    <td className="px-4 text-center num text-muted">
                      {nonZeroDenominations.reduce((sum, d) => sum + d.quantity, 0)}
                    </td>
                    <td className="px-4 text-right num">
                      {formatMoney(totalCounted.toFixed(2))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                onClick={() => setStep(2)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleStep3Save}
                isLoading={isPending}
              >
                Save count
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

