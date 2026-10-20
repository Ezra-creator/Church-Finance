import React from "react";
import { requireRole } from "@/server/guards";
import { Role } from "@prisma/client";
import { getUsers } from "@/features/users/queries";
import { RuleHeading } from "@/components/ui/rule-heading";
import { UserManagementView } from "@/features/users/components/user-management-view";

export const metadata = {
  title: "Officers & Access — PUCA Finance",
};

export default async function UsersPage() {
  const currentUser = await requireRole(Role.FINANCE_SECRETARY);
  const users = await getUsers();

  return (
    <div className="space-y-8">
      <RuleHeading
        eyebrow="Access Control"
        title="Church Officers"
        description="Manage Finance Secretary, Treasurer, and Presbytery Viewer permissions."
      />

      <UserManagementView
        users={users}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
