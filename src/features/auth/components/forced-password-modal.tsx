"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Check } from "lucide-react";
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

  const isLengthMet = newPassword.length >= 8;
  const isMatchMet = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isLengthMet) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forced-password-title"
        className="w-full max-w-[400px] bg-surface border border-border p-6 rounded-panel shadow-overlay space-y-6"
      >
        <div className="space-y-1">
          <h2
            id="forced-password-title"
            className="text-title font-semibold text-text"
          >
            Change password
          </h2>
          <p className="text-body text-muted">
            You signed in with a temporary password. Choose a permanent password to continue.
          </p>
        </div>

        {errorMessage && (
          <InlineAlert variant="danger" title={errorMessage} />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Temporary password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isLoading}
          />

          <div className="space-y-2">
            <PasswordField
              label="New password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
            />

            <div className="space-y-1 pt-1 text-caption">
              <div className={`flex items-center gap-1.5 ${isLengthMet ? "text-ok-ink" : "text-muted"}`}>
                {isLengthMet ? (
                  <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0 inline-block" />
                )}
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatchMet ? "text-ok-ink" : "text-muted"}`}>
                {isMatchMet ? (
                  <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0 inline-block" />
                )}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          <PasswordField
            label="Confirm new password"
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
              disabled={!isLengthMet || !isMatchMet}
            >
              Update password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
