"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setupChurchAction } from "../actions";

export interface ChurchSetupModalProps {
  isConfigured: boolean;
  canConfigure: boolean; // only FINANCE_SECRETARY can configure
}

export function ChurchSetupModal({
  isConfigured,
  canConfigure,
}: ChurchSetupModalProps) {
  const router = useRouter();
  const [assemblyName, setAssemblyName] = useState("PUCA English Assembly");
  const [parentBodyName, setParentBodyName] = useState("The Church of Pentecost");
  const [assemblyAbbreviation, setAssemblyAbbreviation] = useState("PUCA");
  const [weekEndsOn, setWeekEndsOn] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isConfigured) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!assemblyName.trim() || !parentBodyName.trim()) {
      setErrorMessage("Enter the assembly and parent body names.");
      return;
    }

    setIsLoading(true);

    const result = await setupChurchAction({
      assemblyName: assemblyName.trim(),
      parentBodyName: parentBodyName.trim(),
      assemblyAbbreviation: assemblyAbbreviation.trim() || "PUCA",
      signatoryTitles: ["Finance Secretary", "Assembly Treasurer"],
      currency: "GHS",
      timezone: "Africa/Accra",
      weekStartsOn: "Sunday",
      weekEndsOn: parseInt(weekEndsOn, 10),
    });

    if (!result.success) {
      setErrorMessage(result.error.message);
      setIsLoading(false);
      return;
    }

    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        className="w-full max-w-lg bg-surface border border-border-strong p-6 sm:p-8 rounded-panel"
      >
        <div className="pb-4 border-b border-border mb-5">
          <p className="text-[12px] font-medium text-muted">
            Initial System Setup
          </p>
          <h2
            id="setup-title"
            className="text-[22px] font-semibold text-text leading-[28px] mt-1"
          >
            Configure assembly details
          </h2>
          <p className="text-[13px] text-muted mt-1 leading-relaxed">
            Please configure your local assembly details to begin recording finances.
          </p>
        </div>

        {!canConfigure ? (
          <div className="p-4 bg-warn-tint border border-warn/30 text-warn-ink text-[13px] leading-relaxed rounded-control">
            First-time setup must be performed by a Finance Secretary. Please ask your Finance Secretary to sign in and configure the assembly.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 bg-bad-tint border border-bad/30 text-bad-ink text-[13px] rounded-control"
              >
                {errorMessage}
              </div>
            )}

            <TextField
              label="Assembly Name"
              required
              value={assemblyName}
              onChange={(e) => setAssemblyName(e.target.value)}
              placeholder="e.g. PUCA English Assembly"
              disabled={isLoading}
            />

            <TextField
              label="Parent Body / Denomination"
              required
              value={parentBodyName}
              onChange={(e) => setParentBodyName(e.target.value)}
              placeholder="e.g. The Church of Pentecost"
              disabled={isLoading}
            />

            <TextField
              label="Assembly Abbreviation"
              required
              value={assemblyAbbreviation}
              onChange={(e) => setAssemblyAbbreviation(e.target.value)}
              placeholder="e.g. PUCA"
              disabled={isLoading}
            />

            <Select
              label="Financial Week Ends On"
              value={weekEndsOn}
              onChange={(e) => setWeekEndsOn(e.target.value)}
              disabled={isLoading}
              detail="Determines the weekly accounting closing cycle."
            >
              <option value="0">Sunday (Standard)</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </Select>

            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                Save and start
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
