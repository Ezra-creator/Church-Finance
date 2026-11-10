"use client";

import React, { useState, useEffect, useRef } from "react";
import { Member } from "@prisma/client";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div ref={containerRef} className="relative space-y-1 text-left">
      <label className="block text-caption font-medium text-text">
        Member (for receipt)
      </label>

      {selectedMember ? (
        <div className="flex items-center justify-between p-3 border border-border rounded-control bg-surface">
          <div className="space-y-0.5">
            <p className="text-body font-medium text-text">
              {selectedMember.fullName}
            </p>
            <div className="flex items-center gap-3 text-caption text-muted tnum tabular-nums">
              {selectedMember.memberNumber && (
                <span>No. {selectedMember.memberNumber}</span>
              )}
              {selectedMember.phone && <span>{selectedMember.phone}</span>}
            </div>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
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
            className="w-full h-11 sm:h-10 px-3 text-left bg-surface border border-border rounded-control text-body text-text flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          >
            <span className="text-muted">Search members...</span>
            <Search className="w-4 h-4 text-muted stroke-[1.75]" />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 bg-surface border border-border rounded-panel shadow-overlay max-h-72 overflow-y-auto divide-y divide-border">
              {/* Search input in dropdown */}
              <div className="p-2 sticky top-0 bg-surface border-b border-border z-10">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type name, phone or number..."
                  className="w-full h-9 px-3 text-body bg-surface border border-border rounded-control text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                    className="w-full text-left px-3 py-2.5 hover:bg-hover transition-colors duration-120 flex items-center justify-between text-body"
                  >
                    <div>
                      <p className="font-medium text-text">{m.fullName}</p>
                      <div className="flex items-center gap-3 text-caption text-muted tnum tabular-nums">
                        {m.memberNumber && <span>No. {m.memberNumber}</span>}
                        {m.phone && <span>{m.phone}</span>}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-caption text-muted">
                  No members match &quot;{query}&quot;
                </div>
              )}

              {/* Inline Create Option */}
              <div className="p-2 bg-hover">
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
                    className="w-full py-2 px-3 text-caption text-accent-ink font-medium border border-border rounded-control hover:bg-surface flex items-center justify-center gap-1.5"
                  >
                    Add &quot;{query || "new member"}&quot; inline
                  </button>
                ) : (
                  <div className="p-3 space-y-2 border border-border rounded-control bg-surface">
                    <p className="text-caption font-medium text-text">Add member</p>
                    {createError && (
                      <p className="text-caption text-bad">{createError}</p>
                    )}
                    <input
                      type="text"
                      placeholder="Full name"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full h-9 px-2.5 text-body border border-border rounded-control bg-surface text-text"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      className="w-full h-9 px-2.5 text-body border border-border rounded-control bg-surface text-text"
                    />
                    <input
                      type="text"
                      placeholder="Envelope or member number"
                      value={newMemberNumber}
                      onChange={(e) => setNewMemberNumber(e.target.value)}
                      className="w-full h-9 px-2.5 text-body border border-border rounded-control bg-surface text-text"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
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
                        {isPending ? "Creating..." : "Save and select"}
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
