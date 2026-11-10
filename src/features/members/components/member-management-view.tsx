"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Member, Role } from "@prisma/client";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineAlert } from "@/components/ui/inline-alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
  const [isBulkZipModalOpen, setIsBulkZipModalOpen] = useState(false);
  const [bulkZipYear, setBulkZipYear] = useState(new Date().getUTCFullYear());
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [togglingMember, setTogglingMember] = useState<Member | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const canEdit = userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

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
        addToast({ type: "ok", message: `Updated details for ${formName.trim()}` });
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
        addToast({ type: "ok", message: `Added member ${formName.trim()}` });
        setIsAddSheetOpen(false);
      }
    });
  };

  const handleToggleActive = (member: Member) => {
    startTransition(async () => {
      const targetActive = !member.active;
      const res = await toggleMemberActiveAction(member.id, targetActive);

      if (!res.success) {
        addToast({ type: "bad", message: res.error.message });
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, active: targetActive } : m))
      );
      addToast({
        type: "ok",
        message: `${member.fullName} marked as ${targetActive ? "Active" : "Inactive"}`,
      });
      setTogglingMember(null);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Manage members and contribution records."
        action={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsBulkZipModalOpen(true)}
              >
                Annual statements (ZIP)
              </Button>
              <Button variant="primary" onClick={openAddSheet}>
                Add member
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted stroke-[1.75]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, member number or phone..."
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-control text-body text-text placeholder:text-muted focus:outline-none focus:border-border-strong"
          />
        </div>

        <div className="self-start sm:self-auto flex items-center min-h-[44px]">
          <Checkbox
            id="show-inactive-members"
            checked={showInactive}
            onCheckedChange={setShowInactive}
            label="Show inactive members"
          />
        </div>
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No matching members found" : "No members added"}
          description={
            searchQuery
              ? `No members match "${searchQuery}". Check the spelling or add a new record.`
              : "The member directory is empty. Add members to track individual contributions and issue receipts."
          }
          action={
            canEdit && !searchQuery ? (
              <Button variant="secondary" onClick={openAddSheet}>
                Add member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Member number</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link
                        href={`/members/${m.id}`}
                        className="font-medium text-text hover:text-accent-ink"
                      >
                        {m.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="tnum text-muted">
                      {m.phone || "—"}
                    </TableCell>
                    <TableCell className="tnum text-muted">
                      {m.memberNumber || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.active ? "Balanced" : "Neutral"}>
                        {m.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/members/${m.id}`}>
                            <Button variant="ghost" size="sm">
                              Contributions
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditSheet(m)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTogglingMember(m)}
                            className={m.active ? "text-bad-ink hover:bg-bad-tint" : undefined}
                          >
                            {m.active ? "Deactivate" : "Reactivate"}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Collapsed Row View */}
          <div className="sm:hidden border border-border rounded-panel divide-y divide-border bg-surface">
            {filteredMembers.map((m) => (
              <div key={m.id} className="p-3 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/members/${m.id}`}
                    className="font-medium text-body text-text hover:text-accent-ink"
                  >
                    {m.fullName}
                  </Link>
                  {m.memberNumber && (
                    <span className="text-caption text-muted tnum">
                      #{m.memberNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-caption text-muted">
                  <span className="tnum">{m.phone || "No phone"}</span>
                  <Badge variant={m.active ? "Balanced" : "Neutral"}>
                    {m.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {canEdit && (
                  <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-border">
                    <Link href={`/members/${m.id}`}>
                      <Button variant="ghost" size="sm">
                        Contributions
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => openEditSheet(m)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTogglingMember(m)}
                      className={m.active ? "text-bad-ink hover:bg-bad-tint" : undefined}
                    >
                      {m.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Member Sheet */}
      <Sheet
        isOpen={isAddSheetOpen || editingMember !== null}
        onClose={() => {
          setIsAddSheetOpen(false);
          setEditingMember(null);
        }}
        title={editingMember ? "Edit member" : "Add member"}
        description={
          editingMember
            ? `Update details for ${editingMember.fullName}`
            : "Record member details for contribution receipts."
        }
      >
        <form onSubmit={handleSaveMember} className="space-y-4 py-3">
          {formError && (
            <InlineAlert variant="danger" title={formError} />
          )}

          <TextField
            id="member-fullname"
            label="Full name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Kwame Mensah"
            required
            autoFocus
          />

          <TextField
            id="member-phone"
            label="Phone number"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="0244123456"
            detail="Stored normalised to +233 format"
          />

          <TextField
            id="member-number"
            label="Member or envelope number"
            value={formNumber}
            onChange={(e) => setFormNumber(e.target.value)}
            placeholder="MEM-0142"
            detail="Optional unique identifier used on envelopes"
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
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
              ? "Deactivated members remain in the audit trail and previous giving receipts are preserved, but they will be hidden from new member lookups."
              : "Reactivating will restore this member to active status and make them selectable in contribution entries."
          }
          confirmLabel={togglingMember.active ? "Deactivate member" : "Reactivate member"}
          isDestructive={togglingMember.active}
          onConfirm={() => handleToggleActive(togglingMember)}
          onCancel={() => setTogglingMember(null)}
          isPending={isPending}
        />
      )}

      {/* Bulk Statements Modal */}
      <Sheet
        isOpen={isBulkZipModalOpen}
        onClose={() => setIsBulkZipModalOpen(false)}
        title="Export annual statements (ZIP)"
        description="Generate and package giving statements for every active member who contributed during the selected tax year."
      >
        <div className="space-y-4 py-3">
          <TextField
            label="Statement tax year"
            type="number"
            value={bulkZipYear}
            onChange={(e) => setBulkZipYear(parseInt(e.target.value, 10))}
          />

          <InlineAlert
            variant="neutral"
            title="Package overview"
            description={`Streams a compressed ZIP archive containing individual PDFs for active members who contributed during ${bulkZipYear}. An audit log entry is recorded for each issued statement.`}
          />

          <div className="pt-4 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsBulkZipModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                window.open(`/api/statements/bulk?year=${bulkZipYear}`, "_blank");
                setIsBulkZipModalOpen(false);
              }}
            >
              Download statements ZIP
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
