"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { createUserAction } from "../actions";
import { useToast } from "@/components/ui/toast";
import { formatRole } from "@/lib/format";
import { Copy, Check } from "lucide-react";

export interface AddUserSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUserSheet({ isOpen, onClose }: AddUserSheetProps) {
  const { addToast } = useToast();
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
      setErrorMessage("Enter both name and email address.");
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

    addToast({ type: "success", message: `User ${name} created.` });
  };

  const handleCopy = async () => {
    if (createdCredentials?.temporaryPassword) {
      await navigator.clipboard.writeText(createdCredentials.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ type: "neutral", message: "Password copied to clipboard." });
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={createdCredentials ? "User created" : "Add user"}
      description={
        createdCredentials
          ? "Share these temporary credentials with the new officer."
          : "Add a finance secretary, treasurer, or reviewer."
      }
    >
      {createdCredentials ? (
        <div className="space-y-5 py-2">
          <div className="space-y-1">
            <span className="text-caption text-muted">Account email</span>
            <p className="text-body font-medium text-text">
              {createdCredentials.email}
            </p>
          </div>

          <InlineAlert variant="info" title="Temporary password">
            <div className="flex items-center justify-between pt-1">
              <span className="font-medium text-body text-text select-all">
                {createdCredentials.temporaryPassword}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2 text-caption"
              >
                {copied ? (
                  <span className="flex items-center gap-1 text-ok-ink">
                    <Check className="w-3.5 h-3.5" strokeWidth={1.75} /> Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.75} /> Copy
                  </span>
                )}
              </Button>
            </div>
          </InlineAlert>

          <p className="text-caption text-muted leading-relaxed">
            This password will not be displayed again. The user will be required to change it immediately upon their first sign in.
          </p>

          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full"
          >
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMessage && (
            <InlineAlert variant="danger" title={errorMessage} />
          )}

          <TextField
            label="Full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Samuel Mensah"
            disabled={isLoading}
          />

          <TextField
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. samuel@example.com"
            disabled={isLoading}
          />

          <Select
            label="Officer role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={isLoading}
          >
            <option value={Role.FINANCE_SECRETARY}>
              {formatRole(Role.FINANCE_SECRETARY)} — Enter counts and manage users
            </option>
            <option value={Role.TREASURER}>
              {formatRole(Role.TREASURER)} — Verify counts and reconcile
            </option>
            <option value={Role.PRESBYTERY_VIEWER}>
              {formatRole(Role.PRESBYTERY_VIEWER)} — Read-only reports access
            </option>
          </Select>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
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
              Add user
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
