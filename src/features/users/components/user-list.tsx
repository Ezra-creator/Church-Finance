"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatRole } from "@/lib/format";
import { formatAccraDate } from "@/lib/dates";
import {
  changeUserRoleAction,
  toggleUserStatusAction,
  resetPasswordAction,
} from "../actions";
import { useToast } from "@/components/ui/toast";
import { KeyRound, UserCheck, UserX, Copy, Check, Shield } from "lucide-react";

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
  const { addToast } = useToast();

  const [roleChangeTarget, setRoleChangeTarget] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.TREASURER);
  const [isRoleChanging, setIsRoleChanging] = useState(false);

  const [statusTarget, setStatusTarget] = useState<UserItem | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

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
      addToast({ type: "error", message: res.error.message });
      return;
    }

    addToast({ type: "success", message: `Role updated to ${formatRole(selectedRole)}.` });
    setRoleChangeTarget(null);
  };

  const handleStatusToggleConfirm = async () => {
    if (!statusTarget) return;
    setIsStatusChanging(true);

    const nextActive = !statusTarget.active;
    const res = await toggleUserStatusAction(statusTarget.id, nextActive);

    setIsStatusChanging(false);

    if (!res.success) {
      addToast({ type: "error", message: res.error.message });
      return;
    }

    addToast({
      type: "success",
      message: nextActive
        ? `Reactivated ${statusTarget.name}.`
        : `Deactivated ${statusTarget.name}.`,
    });
    setStatusTarget(null);
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetTarget) return;
    setIsResetting(true);

    const res = await resetPasswordAction(resetTarget.id);
    setIsResetting(false);

    if (!res.success) {
      addToast({ type: "error", message: res.error.message });
      setResetTarget(null);
      return;
    }

    setNewTempPassword(res.data.temporaryPassword);
    addToast({ type: "success", message: "Temporary password generated." });
  };

  const handleCopyTempPassword = async () => {
    if (newTempPassword) {
      await navigator.clipboard.writeText(newTempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ type: "neutral", message: "Password copied to clipboard." });
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden sm:block border border-border rounded-panel overflow-hidden bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isLastActiveSecretary =
                user.role === Role.FINANCE_SECRETARY &&
                user.active &&
                activeSecretaries.length <= 1;

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-text">
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      {isSelf && (
                        <span className="text-caption text-muted px-1.5 py-0.5 rounded-control bg-hover">
                          You
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-body text-text">
                        {formatRole(user.role)}
                      </span>
                      {user.mustChangePassword && (
                        <span className="block text-caption text-warn-ink">
                          Pending password change
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.active ? "balanced" : "neutral"}
                      label={user.active ? "Active" : "Inactive"}
                    />
                  </TableCell>
                  <TableCell className="text-muted text-caption">
                    {user.lastLoginAt
                      ? formatAccraDate(new Date(user.lastLoginAt), {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRoleChangeTarget(user);
                          setSelectedRole(user.role);
                        }}
                        title="Change role"
                      >
                        <Shield className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                        Role
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetTarget(user)}
                        title="Reset password"
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                        Reset
                      </Button>

                      {user.active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf || isLastActiveSecretary}
                          onClick={() => setStatusTarget(user)}
                          className="text-bad-ink hover:text-bad-ink hover:bg-bad-tint disabled:opacity-30"
                          title={
                            isSelf
                              ? "You cannot deactivate your own account"
                              : isLastActiveSecretary
                              ? "Cannot deactivate the last active finance secretary"
                              : "Deactivate user"
                          }
                        >
                          <UserX className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStatusTarget(user)}
                          className="text-ok-ink hover:text-ok-ink hover:bg-ok-tint"
                          title="Reactivate user"
                        >
                          <UserCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Stacked Rows */}
      <div className="sm:hidden border border-border rounded-panel bg-surface divide-y divide-border">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const isLastActiveSecretary =
            user.role === Role.FINANCE_SECRETARY &&
            user.active &&
            activeSecretaries.length <= 1;

          return (
            <div key={user.id} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-body text-text truncate">
                    {user.name}
                  </span>
                  {isSelf && (
                    <span className="text-caption text-muted px-1.5 py-0.5 rounded-control bg-hover flex-shrink-0">
                      You
                    </span>
                  )}
                </div>
                <Badge
                  variant={user.active ? "balanced" : "neutral"}
                  label={user.active ? "Active" : "Inactive"}
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-caption text-muted">
                <span className="truncate">{user.email}</span>
                <span className="flex-shrink-0">{formatRole(user.role)}</span>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRoleChangeTarget(user);
                    setSelectedRole(user.role);
                  }}
                >
                  Role
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setResetTarget(user)}
                >
                  Reset password
                </Button>
                {user.active ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isSelf || isLastActiveSecretary}
                    onClick={() => setStatusTarget(user)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setStatusTarget(user)}
                  >
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Change Modal */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
          <div className="w-full max-w-sm bg-surface border border-border p-6 rounded-panel shadow-overlay space-y-4">
            <div className="space-y-1">
              <h3 className="text-lead font-semibold text-text">
                Change role for {roleChangeTarget.name}
              </h3>
              <p className="text-caption text-muted">
                Assign a new system role and permission set.
              </p>
            </div>

            <Select
              label="Select role"
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
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
                Save changes
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
              ? `Deactivating will revoke access immediately. You can reactivate this account at any time.`
              : `Reactivating will restore sign in access for this officer.`
          }
          confirmLabel={statusTarget.active ? "Deactivate officer" : "Reactivate officer"}
          isDestructive={statusTarget.active}
          isLoading={isStatusChanging}
        />
      )}

      {/* Reset Password Confirmation */}
      {resetTarget && !newTempPassword && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setResetTarget(null)}
          onConfirm={handleResetPasswordConfirm}
          title={`Reset password for ${resetTarget.name}`}
          description={`A new temporary password will be generated. The officer will be required to change it on their next sign in.`}
          confirmLabel="Reset password"
          isLoading={isResetting}
        />
      )}

      {/* Temporary Password Display */}
      {newTempPassword && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
          <div className="w-full max-w-md bg-surface border border-border p-6 rounded-panel shadow-overlay space-y-4">
            <div className="space-y-1">
              <h3 className="text-lead font-semibold text-text">
                Password reset complete
              </h3>
              <p className="text-caption text-muted">
                Temporary credentials for {resetTarget.email}:
              </p>
            </div>

            <InlineAlert variant="info" title="Temporary password">
              <div className="flex items-center justify-between pt-1">
                <span className="font-medium text-body text-text select-all">
                  {newTempPassword}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTempPassword}
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

            <p className="text-caption text-muted">
              This password is shown once only. Send it to the user directly.
            </p>

            <Button
              variant="primary"
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
