"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "../actions";

export interface ForcedPasswordModalProps {
  mustChange: boolean;
}

export function ForcedPasswordModal({ mustChange }: ForcedPasswordModalProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!mustChange) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    setIsLoading(true);

    const result = await changePasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
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
        aria-labelledby="forced-password-title"
        className="w-full max-w-md bg-paper border border-ink p-6 rounded-[2px] shadow-none"
      >
        <div className="pb-4 border-b border-rule mb-5">
          <p className="text-xs uppercase tracking-wider font-medium text-attention">
            Account Security Required
          </p>
          <h2
            id="forced-password-title"
            className="text-xl font-serif font-normal text-ink mt-1"
          >
            Set your permanent password
          </h2>
          <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
            You signed in with a temporary password. You must set a permanent password before continuing.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 bg-variance/10 border border-variance text-variance text-xs rounded-[2px]"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Current temporary password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isLoading}
          />

          <TextField
            label="New password"
            type="password"
            required
            hint="Minimum 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isLoading}
          />

          <TextField
            label="Confirm new password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Update password and continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
