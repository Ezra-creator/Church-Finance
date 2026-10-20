"use client";

import React, { useState } from "react";
import { UserList, UserItem } from "./user-list";
import { AddUserSheet } from "./add-user-sheet";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export interface UserManagementViewProps {
  users: UserItem[];
  currentUserId: string;
}

export function UserManagementView({
  users,
  currentUserId,
}: UserManagementViewProps) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-soft">
          {users.length} officer{users.length === 1 ? "" : "s"} registered
        </p>
        <Button
          variant="primary"
          onClick={() => setIsAddSheetOpen(true)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add officer
        </Button>
      </div>

      <UserList users={users} currentUserId={currentUserId} />

      <AddUserSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
      />
    </div>
  );
}
