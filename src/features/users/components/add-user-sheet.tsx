"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createUserAction } from "../actions";
import { useToast } from "@/components/ui/toast";
import { formatRole } from "@/lib/format";
import { Copy, Check } from "lucide-react";

export interface AddUserSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUserSheet({ isOpen, onClose }: AddUserSheetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.TREASURER);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // One-time temporary password display state
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole(Role.TREASURER);
    setErrorMessage(null);
    setCreatedCredentials(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim()) {
      setErrorMessage("Please enter both the user name and email.");
      return;
    }

    setIsLoading(true);

    const result = await createUserAction({
      name: name.trim(),
      email: email.trim(),
      role,
    });

    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error.message);
      return;
    }

    setCreatedCredentials({
      email: result.data.email,
      temporaryPassword: result.data.temporaryPassword,
    });

    showToast(`User ${name} created`, "balanced");
  };

  const handleCopy = async () => {
    if (createdCredentials?.temporaryPassword) {
      await navigator.clipboard.writeText(createdCredentials.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Password copied to clipboard", "neutral");
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={createdCredentials ? "User Created" : "Add Officer"}
      description={
        createdCredentials
          ? "Share these temporary credentials with the new officer."
          : "Register a finance secretary, treasurer, or presbytery viewer."
      }
    >
      {createdCredentials ? (
        <div className="space-y-6">
          <div className="p-4 border border-rule bg-paper space-y-3">
            <p className="text-xs uppercase tracking-wider font-medium text-ink-soft">
              Temporary Credentials (Shown Once)
            </p>
            <div className="space-y-1">
              <span className="text-xs text-ink-soft">User:</span>
              <p className="text-sm font-medium text-ink">{createdCredentials.email}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-ink-soft">Temporary Password:</span>
              <div className="flex items-center justify-between p-2.5 bg-ink/5 border border-rule rounded-[2px]">
                <code className="font-mono text-sm font-semibold tracking-wider text-ink">
                  {createdCredentials.temporaryPassword}
                </code>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={handleCopy}
                  className="min-h-[32px] px-2 text-xs"
                >
                  {copied ? (
                    <span className="flex items-center gap-1 text-balanced">
                      <Check className="w-3.5 h-3.5" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-attention/10 border border-attention text-attention text-xs leading-relaxed">
            This password will not be displayed again. The user will be required to change it immediately upon their first sign in.
          </div>

          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full"
          >
            Done
          </Button>
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
            label="Full Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Samuel Mensah"
            disabled={isLoading}
          />

          <TextField
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. samuel@church.org"
            disabled={isLoading}
          />

          <Select
            label="Officer Role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={isLoading}
          >
            <option value={Role.FINANCE_SECRETARY}>
              {formatRole(Role.FINANCE_SECRETARY)} — Enter counts & manage users
            </option>
            <option value={Role.TREASURER}>
              {formatRole(Role.TREASURER)} — Verify counts & reconcile
            </option>
            <option value={Role.PRESBYTERY_VIEWER}>
              {formatRole(Role.PRESBYTERY_VIEWER)} — Read-only reports access
            </option>
          </Select>

          <div className="pt-4 border-t border-rule flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              Create officer
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
