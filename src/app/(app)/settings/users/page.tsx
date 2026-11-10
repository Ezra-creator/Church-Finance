import React from "react";
import { requireRole } from "@/server/guards";
import { Role } from "@prisma/client";
import { getUsers } from "@/features/users/queries";
import { UserManagementView } from "@/features/users/components/user-management-view";

export const metadata = {
  title: "Users — PUCA Finance",
};

export default async function UsersPage() {
  const currentUser = await requireRole(Role.FINANCE_SECRETARY);
  const users = await getUsers();

  return (
    <UserManagementView
      users={users}
      currentUserId={currentUser.id}
    />
  );
}

