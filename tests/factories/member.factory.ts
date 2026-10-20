import { Member } from "@prisma/client";

export function buildMemberFixture(overrides: Partial<Member> = {}): Member {
  const id = overrides.id || `member_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date();

  return {
    id,
    memberNumber: overrides.memberNumber !== undefined ? overrides.memberNumber : `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
    fullName: overrides.fullName || "Kwame Mensah",
    phone: overrides.phone !== undefined ? overrides.phone : "+233244123456",
    active: overrides.active ?? true,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}
