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
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1280px] 2xl:max-w-[1440px] w-full space-y-8 pb-24">
      <RuleHeading
        eyebrow="Access Control"
        title="Church Officers"
        description="Manage Finance Secretary, Treasurer, and Reviewer permissions."
      />

      <UserManagementView
        users={users}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
