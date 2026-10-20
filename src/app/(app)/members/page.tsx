import React from "react";
import { requireUser } from "@/server/guards";
import { listMembers } from "@/features/members/queries";
import { MemberManagementView } from "@/features/members/components/member-management-view";

export const metadata = {
  title: "Parish Members — PUCA Finance",
};

export default async function MembersPage() {
  const user = await requireUser();
  const members = await listMembers(true);

  return <MemberManagementView initialMembers={members} userRole={user.role} />;
}
