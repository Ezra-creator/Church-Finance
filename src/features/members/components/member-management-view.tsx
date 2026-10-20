"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Member, Role } from "@prisma/client";
import { Search, UserPlus, Phone, Hash, Edit2, UserCheck, UserX } from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { StatusMark } from "@/components/ui/status-mark";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  createMemberAction,
  updateMemberAction,
  toggleMemberActiveAction,
} from "../actions";

interface MemberManagementViewProps {
  initialMembers: Member[];
  userRole: Role;
}

export function MemberManagementView({
  initialMembers,
  userRole,
}: MemberManagementViewProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [togglingMember, setTogglingMember] = useState<Member | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const canEdit = userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  // Filter members by query and active status
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      if (!showInactive && !m.active) return false;
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.memberNumber && m.memberNumber.toLowerCase().includes(q))
      );
    });
  }, [members, searchQuery, showInactive]);

  const openAddSheet = () => {
    setFormName("");
    setFormPhone("");
    setFormNumber("");
    setFormError(null);
    setIsAddSheetOpen(true);
  };

  const openEditSheet = (m: Member) => {
    setEditingMember(m);
    setFormName(m.fullName);
    setFormPhone(m.phone || "");
    setFormNumber(m.memberNumber || "");
    setFormError(null);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Full name is required.");
      return;
    }

    startTransition(async () => {
      if (editingMember) {
        const res = await updateMemberAction({
          id: editingMember.id,
          fullName: formName,
          phone: formPhone || null,
          memberNumber: formNumber || null,
        });

        if (!res.success) {
          setFormError(res.error.message);
          return;
        }

        setMembers((prev) =>
          prev.map((m) =>
            m.id === editingMember.id
              ? {
                  ...m,
                  fullName: formName.trim(),
                  phone: formPhone.trim() || null,
                  memberNumber: formNumber.trim() || null,
                }
              : m
          )
        );
        addToast("success", `Updated details for ${formName.trim()}`);
        setEditingMember(null);
      } else {
        const res = await createMemberAction({
          fullName: formName,
          phone: formPhone || null,
          memberNumber: formNumber || null,
        });

        if (!res.success) {
          setFormError(res.error.message);
          return;
        }

        const newMember: Member = {
          id: res.data.id,
          fullName: formName.trim(),
          phone: formPhone.trim() || null,
          memberNumber: formNumber.trim() || null,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setMembers((prev) => [newMember, ...prev]);
        addToast("success", `Added member ${formName.trim()}`);
        setIsAddSheetOpen(false);
      }
    });
  };

  const handleToggleActive = (member: Member) => {
    startTransition(async () => {
      const targetActive = !member.active;
      const res = await toggleMemberActiveAction(member.id, targetActive);

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, active: targetActive } : m))
      );
      addToast(
        "success",
        `${member.fullName} marked as ${targetActive ? "Active" : "Inactive"}`
      );
      setTogglingMember(null);
    });
  };

  return (
    <div className="space-y-8">
      <RuleHeading
        eyebrow="Congregation Directory"
        title="Parish Members"
        description="Church members and envelope numbers for the verified tithe register."
        action={
          canEdit ? (
            <Button variant="primary" onClick={openAddSheet}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add member
            </Button>
          ) : undefined
        }
      />

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, member number or phone..."
            className="w-full pl-9 pr-3 py-2 bg-paper border border-rule rounded-[2px] text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-soft select-none self-start sm:self-auto min-h-[44px]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded-[2px] border-rule text-ink focus:ring-ink"
          />
          <span>Show inactive members</span>
        </label>
      </div>

      {/* Members Ruled List */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No matching members found" : "No members registered"}
          description={
            searchQuery
              ? `No members match "${searchQuery}". Check the spelling or add a new record.`
              : "The parish member directory is empty. Add members to track individual tithe envelopes and issue receipts."
          }
          action={
            canEdit && !searchQuery ? (
              <Button variant="secondary" onClick={openAddSheet}>
                Add first member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="border border-rule rounded-[2px] bg-paper divide-y divide-rule">
          {filteredMembers.map((m) => (
            <div
              key={m.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ink/[0.02] transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-ink">{m.fullName}</span>
                  <StatusMark
                    tone={m.active ? "balanced" : "neutral"}
                    label={m.active ? "Active" : "Inactive"}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-ink-soft">
                  {m.memberNumber && (
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="w-3.5 h-3.5" />
                      {m.memberNumber}
                    </span>
                  )}
                  {m.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5" />
                      {m.phone}
                    </span>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => openEditSheet(m)}
                    className="min-h-[44px]"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setTogglingMember(m)}
                    className="min-h-[44px] text-ink-soft hover:text-variance"
                  >
                    {m.active ? (
                      <>
                        <UserX className="w-3.5 h-3.5 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Reactivate
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Member Sheet */}
      <Sheet
        isOpen={isAddSheetOpen || editingMember !== null}
        onClose={() => {
          setIsAddSheetOpen(false);
          setEditingMember(null);
        }}
        title={editingMember ? "Edit Member Details" : "Register Parish Member"}
        description={
          editingMember
            ? `Update member record for ${editingMember.fullName}`
            : "Record member name and phone for tithe receipts."
        }
      >
        <form onSubmit={handleSaveMember} className="space-y-4 py-3">
          {formError && (
            <div className="p-3 bg-variance text-variance text-xs rounded-[2px] border border-variance/30">
              {formError}
            </div>
          )}

          <TextField
            id="member-fullname"
            label="Full name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Kwame Mensah"
            required
            autoFocus
          />

          <TextField
            id="member-phone"
            label="Phone number (Ghana)"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="e.g. 0244123456 or +233244123456"
            detail="Stored normalised to +233 format"
          />

          <TextField
            id="member-number"
            label="Member / Envelope number"
            value={formNumber}
            onChange={(e) => setFormNumber(e.target.value)}
            placeholder="e.g. MEM-0142"
            detail="Optional unique identifier used on envelopes"
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-rule">
            <Button
              type="button"
              variant="quiet"
              onClick={() => {
                setIsAddSheetOpen(false);
                setEditingMember(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending
                ? "Saving..."
                : editingMember
                ? "Update member"
                : "Save member"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Confirm Deactivation / Reactivation Dialog */}
      {togglingMember && (
        <ConfirmDialog
          isOpen={true}
          title={
            togglingMember.active
              ? `Deactivate ${togglingMember.fullName}?`
              : `Reactivate ${togglingMember.fullName}?`
          }
          description={
            togglingMember.active
              ? "Deactivated members remain in the audit ledger and previous giving receipts are preserved, but they will be hidden from new tithe entry lookups."
              : "Reactivating will restore this member to active status and make them selectable in tithe entries."
          }
          confirmLabel={togglingMember.active ? "Deactivate member" : "Reactivate member"}
          tone={togglingMember.active ? "variance" : "balanced"}
          onConfirm={() => handleToggleActive(togglingMember)}
          onCancel={() => setTogglingMember(null)}
          isPending={isPending}
        />
      )}
    </div>
  );
}
