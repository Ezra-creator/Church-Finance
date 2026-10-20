import { Member } from "@prisma/client";
import { prisma } from "@/server/db";

export async function searchMembers(
  query: string,
  limit: number = 20,
  includeInactive: boolean = false
): Promise<Member[]> {
  const trimmed = query.trim();

  const whereClause: {
    active?: boolean;
    OR?: Array<
      | { fullName: { contains: string } }
      | { memberNumber: { contains: string } }
      | { phone: { contains: string } }
    >;
  } = {};

  if (!includeInactive) {
    whereClause.active = true;
  }

  if (trimmed !== "") {
    whereClause.OR = [
      { fullName: { contains: trimmed } },
      { memberNumber: { contains: trimmed } },
      { phone: { contains: trimmed } },
    ];
  }

  return prisma.member.findMany({
    where: whereClause,
    orderBy: { fullName: "asc" },
    take: Math.min(limit, 50),
  });
}

export async function listMembers(includeInactive: boolean = false): Promise<Member[]> {
  return prisma.member.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: { fullName: "asc" },
  });
}

export async function getMemberById(id: string): Promise<Member | null> {
  return prisma.member.findUnique({
    where: { id },
  });
}
