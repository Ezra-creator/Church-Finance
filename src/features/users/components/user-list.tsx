"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import { StatusMark } from "@/components/ui/status-mark";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatRole, formatStatus } from "@/lib/format";
import {
  changeUserRoleAction,
  toggleUserStatusAction,
  resetPasswordAction,
} from "../actions";
import { useToast } from "@/components/ui/toast";
import { KeyRound, ShieldAlert, UserCheck, UserX, Copy, Check } from "lucide-react";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
}

export interface UserListProps {
  users: UserItem[];
  currentUserId: string;
}

export function UserList({ users, currentUserId }: UserListProps) {
  const { showToast } = useToast();

  // Role change state
  const [roleChangeTarget, setRoleChangeTarget] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.TREASURER);
  const [isRoleChanging, setIsRoleChanging] = useState(false);

  // Status toggle state
  const [statusTarget, setStatusTarget] = useState<UserItem | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  // Reset password state
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [newTempPassword, setNewTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeSecretaries = users.filter(
    (u) => u.role === Role.FINANCE_SECRETARY && u.active
  );

  const handleRoleChangeConfirm = async () => {
    if (!roleChangeTarget) return;
    setIsRoleChanging(true);

    const res = await changeUserRoleAction({
      userId: roleChangeTarget.id,
      role: selectedRole,
    });

    setIsRoleChanging(false);

    if (!res.success) {
      showToast(res.error.message, "variance");
      return;
    }

    showToast(`Role updated to ${formatRole(selectedRole)}`, "balanced");
    setRoleChangeTarget(null);
  };

  const handleStatusToggleConfirm = async () => {
    if (!statusTarget) return;
    setIsStatusChanging(true);

    const nextActive = !statusTarget.active;
    const res = await toggleUserStatusAction(statusTarget.id, nextActive);

    setIsStatusChanging(false);

    if (!res.success) {
      showToast(res.error.message, "variance");
      return;
    }

    showToast(
      nextActive
        ? `Reactivated ${statusTarget.name}`
        : `Deactivated ${statusTarget.name}`,
      "balanced"
    );
    setStatusTarget(null);
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetTarget) return;
    setIsResetting(true);

    const res = await resetPasswordAction(resetTarget.id);
    setIsResetting(false);

    if (!res.success) {
      showToast(res.error.message, "variance");
      setResetTarget(null);
      return;
    }

    setNewTempPassword(res.data.temporaryPassword);
    showToast("Password reset. Temporary password generated.", "balanced");
  };

  const handleCopyTempPassword = async () => {
    if (newTempPassword) {
      await navigator.clipboard.writeText(newTempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Password copied to clipboard", "neutral");
    }
  };

  return (
    <div className="space-y-4">
      {/* Table-style ledger list */}
      <div className="border border-rule rounded-[2px] divide-y divide-rule bg-paper">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider font-medium text-ink-soft bg-ink/[0.02]">
          <div className="col-span-4">Officer</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {/* Rows */}
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const isLastActiveSecretary =
            user.role === Role.FINANCE_SECRETARY &&
            user.active &&
            activeSecretaries.length <= 1;

          return (
            <div
              key={user.id}
              className="p-4 sm:py-3 sm:px-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 text-sm hover:bg-ink/[0.01] transition-colors"
            >
              {/* Officer details */}
              <div className="sm:col-span-4 flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink truncate">
                    {user.name}
                  </span>
                  {isSelf && (
                    <span className="text-[10px] px-1.5 py-0.2 border border-rule font-mono text-ink-soft">
                      You
                    </span>
                  )}
                </div>
                <span className="text-xs text-ink-soft truncate font-mono">
                  {user.email}
                </span>
              </div>

              {/* Role */}
              <div className="sm:col-span-3">
                <span className="text-xs text-ink font-mono font-medium">
                  {formatRole(user.role)}
                </span>
                {user.mustChangePassword && (
                  <p className="text-[10px] text-attention">
                    Pending password change
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="sm:col-span-2">
                <StatusMark
                  tone={user.active ? "balanced" : "variance"}
                  label={formatStatus(user.active)}
                />
              </div>

              {/* Actions */}
              <div className="sm:col-span-3 flex items-center sm:justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-rule/50">
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    setRoleChangeTarget(user);
                    setSelectedRole(user.role);
                  }}
                  title="Change officer role"
                >
                  Role
                </Button>

                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setResetTarget(user)}
                  title="Reset password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </Button>

                {user.active ? (
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={isSelf || isLastActiveSecretary}
                    onClick={() => setStatusTarget(user)}
                    className="text-variance hover:text-variance hover:bg-variance/10 disabled:opacity-30"
                    title={
                      isSelf
                        ? "You cannot deactivate your own account"
                        : isLastActiveSecretary
                        ? "Cannot deactivate the last active finance secretary"
                        : "Deactivate user"
                    }
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setStatusTarget(user)}
                    className="text-balanced hover:text-balanced hover:bg-balanced/10"
                    title="Reactivate user"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Change Modal */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
          <div className="w-full max-w-sm bg-paper border border-ink p-5 rounded-[2px] space-y-4">
            <h3 className="text-base font-serif font-normal text-ink">
              Change Role for {roleChangeTarget.name}
            </h3>
            <Select
              label="Select Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
            >
              <option value={Role.FINANCE_SECRETARY}>
                {formatRole(Role.FINANCE_SECRETARY)}
              </option>
              <option value={Role.TREASURER}>
                {formatRole(Role.TREASURER)}
              </option>
              <option value={Role.PRESBYTERY_VIEWER}>
                {formatRole(Role.PRESBYTERY_VIEWER)}
              </option>
            </Select>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRoleChangeTarget(null)}
                disabled={isRoleChanging}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRoleChangeConfirm}
                isLoading={isRoleChanging}
              >
                Save role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Toggle Confirmation */}
      {statusTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setStatusTarget(null)}
          onConfirm={handleStatusToggleConfirm}
          title={
            statusTarget.active
              ? `Deactivate ${statusTarget.name}`
              : `Reactivate ${statusTarget.name}`
          }
          description={
            statusTarget.active
              ? `Deactivating will revoke access to PUCA Finance immediately. You can reactivate this account at any time.`
              : `Reactivating will restore sign in access for this officer.`
          }
          confirmLabel={statusTarget.active ? "Deactivate officer" : "Reactivate officer"}
          isDestructive={statusTarget.active}
          isLoading={isStatusChanging}
        />
      )}

      {/* Reset Password Confirmation & Result Dialog */}
      {resetTarget && !newTempPassword && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setResetTarget(null)}
          onConfirm={handleResetPasswordConfirm}
          title={`Reset password for ${resetTarget.name}`}
          description={`A new temporary password will be generated. The user will be required to change it upon next sign in.`}
          confirmLabel="Reset password"
          isLoading={isResetting}
        />
      )}

      {/* Show reset temporary password once */}
      {newTempPassword && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
          <div className="w-full max-w-sm bg-paper border border-ink p-5 rounded-[2px] space-y-4">
            <h3 className="text-base font-serif font-normal text-ink">
              Password Reset Complete
            </h3>
            <p className="text-xs text-ink-soft">
              Temporary password for <span className="font-medium text-ink">{resetTarget.email}</span>:
            </p>
            <div className="flex items-center justify-between p-2.5 bg-ink/5 border border-rule rounded-[2px]">
              <code className="font-mono text-sm font-semibold tracking-wider text-ink">
                {newTempPassword}
              </code>
              <Button
                variant="quiet"
                size="sm"
                onClick={handleCopyTempPassword}
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
            <p className="text-[11px] text-attention">
              This password is shown once only. Ensure you provide it to the user.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => {
                setResetTarget(null);
                setNewTempPassword(null);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
