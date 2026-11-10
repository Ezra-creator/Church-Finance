"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { setupChurchAction } from "../actions";

export interface ChurchSetupModalProps {
  isConfigured: boolean;
  canConfigure: boolean;
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
      setErrorMessage("Enter the church and district names.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        className="w-full max-w-[480px] bg-surface border border-border p-6 sm:p-8 rounded-panel shadow-overlay space-y-6"
      >
        <div className="space-y-1">
          <h2
            id="setup-title"
            className="text-title font-semibold text-text"
          >
            Church setup
          </h2>
          <p className="text-body text-muted">
            Register your church and district details to begin recording finances.
          </p>
        </div>

        {!canConfigure ? (
          <InlineAlert variant="warn" title="First-time setup must be performed by a Finance Secretary. Ask your Finance Secretary to sign in and register the church." />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <InlineAlert variant="danger" title={errorMessage} />
            )}

            <TextField
              label="Church or congregation name"
              required
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              placeholder="e.g. Hope Community Church"
              disabled={isLoading}
            />

            <TextField
              label="District or supervisory body"
              required
              value={presbyteryName}
              onChange={(e) => setPresbyteryName(e.target.value)}
              placeholder="e.g. Accra District"
              disabled={isLoading}
            />

            <Select
              label="Financial week ends on"
              value={weekEndsOn}
              onChange={(e) => setWeekEndsOn(e.target.value)}
              disabled={isLoading}
              hint="Determines the weekly accounting closing cycle."
            >
              <option value="0">Sunday (standard)</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </Select>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Complete church setup
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
