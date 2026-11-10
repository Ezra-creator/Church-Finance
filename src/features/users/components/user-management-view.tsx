"use client";

import React, { useState } from "react";
import { UserList, UserItem } from "./user-list";
import { AddUserSheet } from "./add-user-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
      <PageHeader
        title="Users"
        description="Manage officer accounts and role permissions."
        action={
          <Button
            variant="primary"
            onClick={() => setIsAddSheetOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add user
          </Button>
        }
      />

      <UserList users={users} currentUserId={currentUserId} />

      <AddUserSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
      />
    </div>
  );
}

