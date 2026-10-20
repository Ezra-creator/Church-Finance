"use client";

import React, { useState, useEffect, useRef } from "react";
import { Member } from "@prisma/client";
import { Search, UserCheck, Plus, Hash, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { createMemberAction } from "@/features/members/actions";

interface MemberComboboxProps {
  members: Member[];
  selectedMemberId: string | null;
  onSelectMember: (memberId: string | null) => void;
  onMemberCreated?: (newMember: Member) => void;
  disabled?: boolean;
}

export function MemberCombobox({
  members,
  selectedMemberId,
  onSelectMember,
  onMemberCreated,
  disabled = false,
}: MemberComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberNumber, setNewMemberNumber] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = members.filter((m) => {
    if (!m.active && m.id !== selectedMemberId) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      m.fullName.toLowerCase().includes(q) ||
      (m.memberNumber && m.memberNumber.toLowerCase().includes(q)) ||
      (m.phone && m.phone.toLowerCase().includes(q))
    );
  });

  const handleInlineCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newMemberName.trim()) {
      setCreateError("Member full name is required.");
      return;
    }

    setIsPending(true);
    const res = await createMemberAction({
      fullName: newMemberName.trim(),
      phone: newMemberPhone.trim() || null,
      memberNumber: newMemberNumber.trim() || null,
    });
    setIsPending(false);

    if (!res.success) {
      setCreateError(res.error.message);
      return;
    }

    const created: Member = {
      id: res.data.id,
      fullName: newMemberName.trim(),
      phone: newMemberPhone.trim() || null,
      memberNumber: newMemberNumber.trim() || null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onMemberCreated?.(created);
    onSelectMember(created.id);
    setIsCreatingInline(false);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      <label className="block text-xs uppercase tracking-wider text-ink-soft font-mono">
        Parish Member (for official receipt)
      </label>

      {selectedMember ? (
        <div className="flex items-center justify-between p-3 border border-rule rounded-[2px] bg-paper">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-ink flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-balanced" />
              {selectedMember.fullName}
            </p>
            <div className="flex items-center gap-3 text-xs text-ink-soft font-mono">
              {selectedMember.memberNumber && (
                <span>No. {selectedMember.memberNumber}</span>
              )}
              {selectedMember.phone && <span>{selectedMember.phone}</span>}
            </div>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => {
                onSelectMember(null);
                setQuery("");
              }}
            >
              Change
            </Button>
          )}
        </div>
      ) : (
        <div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="w-full min-h-[44px] px-3 py-2 text-left bg-paper border border-rule rounded-[2px] text-sm text-ink flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:opacity-50"
          >
            <span className="text-ink-soft">Search registered members...</span>
            <Search className="w-4 h-4 text-ink-soft" />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 bg-paper border border-rule rounded-[2px] shadow-lg max-h-72 overflow-y-auto divide-y divide-rule">
              {/* Search input in dropdown */}
              <div className="p-2 sticky top-0 bg-paper border-b border-rule z-10">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type member name, phone or number..."
                  className="w-full px-3 py-1.5 text-xs bg-paper border border-rule rounded-[2px] text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  autoFocus
                />
              </div>

              {/* Members results list */}
              {filtered.length > 0 ? (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectMember(m.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-ink/[0.04] transition-colors flex items-center justify-between text-xs min-h-[44px]"
                  >
                    <div>
                      <p className="font-medium text-ink">{m.fullName}</p>
                      <div className="flex items-center gap-3 text-[11px] text-ink-soft font-mono">
                        {m.memberNumber && <span>No. {m.memberNumber}</span>}
                        {m.phone && <span>{m.phone}</span>}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-ink-soft">
                  No members match &quot;{query}&quot;
                </div>
              )}

              {/* Inline Create Option */}
              <div className="p-2 bg-paper/50">
                {!isCreatingInline ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNewMemberName(query);
                      setNewMemberPhone("");
                      setNewMemberNumber("");
                      setCreateError(null);
                      setIsCreatingInline(true);
                    }}
                    className="w-full py-2 px-3 text-xs text-ink font-medium border border-dashed border-rule rounded-[2px] hover:bg-ink/[0.04] flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Register &quot;{query || "New Member"}&quot; inline
                  </button>
                ) : (
                  <div className="p-2 space-y-2 border border-rule rounded-[2px] bg-paper">
                    <p className="text-xs font-semibold text-ink">Register Member</p>
                    {createError && (
                      <p className="text-[11px] text-variance">{createError}</p>
                    )}
                    <input
                      type="text"
                      placeholder="Full name *"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-rule rounded-[2px]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Phone (e.g. 0244123456)"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-rule rounded-[2px]"
                    />
                    <input
                      type="text"
                      placeholder="Envelope / Member No."
                      value={newMemberNumber}
                      onChange={(e) => setNewMemberNumber(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-rule rounded-[2px]"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        onClick={() => setIsCreatingInline(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={isPending}
                        onClick={handleInlineCreate}
                      >
                        {isPending ? "Creating..." : "Save & Select"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
