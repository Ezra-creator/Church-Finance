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
  const [churchName, setChurchName] = useState("");
  const [presbyteryName, setPresbyteryName] = useState("");
  const [weekEndsOn, setWeekEndsOn] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isConfigured) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!churchName.trim() || !presbyteryName.trim()) {
      setErrorMessage("Enter the church and presbytery names.");
      return;
    }

    setIsLoading(true);

    const result = await setupChurchAction({
      churchName: churchName.trim(),
      presbyteryName: presbyteryName.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        className="w-full max-w-lg bg-paper border border-ink p-6 sm:p-8 rounded-[2px]"
      >
        <div className="pb-4 border-b border-rule mb-5">
          <p className="text-xs uppercase tracking-wider font-medium text-ink-soft">
            Initial System Setup
          </p>
          <h2
            id="setup-title"
            className="text-2xl font-serif font-normal text-ink mt-1"
          >
            Configure church details
          </h2>
          <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
            Please register your local congregation and presbytery details to begin recording finances.
          </p>
        </div>

        {!canConfigure ? (
          <div className="p-4 bg-attention/10 border border-attention text-attention text-xs leading-relaxed rounded-[2px]">
            First-time setup must be performed by a Finance Secretary. Please ask your Finance Secretary to sign in and register the church.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 bg-variance/10 border border-variance text-variance text-xs rounded-[2px]"
              >
                {errorMessage}
              </div>
            )}

            <TextField
              label="Church / Congregation Name"
              required
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              placeholder="e.g. Hope Presbyterian Church, Sakumono"
              disabled={isLoading}
            />

            <TextField
              label="Presbytery / District"
              required
              value={presbyteryName}
              onChange={(e) => setPresbyteryName(e.target.value)}
              placeholder="e.g. Ga West Presbytery"
              disabled={isLoading}
            />

            <Select
              label="Financial Week Ends On"
              value={weekEndsOn}
              onChange={(e) => setWeekEndsOn(e.target.value)}
              disabled={isLoading}
              hint="Determines the weekly accounting closing cycle."
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
                Save and open ledger
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
