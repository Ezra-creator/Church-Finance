import { prisma } from "@/server/db";

export async function getCurrentUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      mustChangePassword: true,
      lastLoginAt: true,
    },
  });
}

export async function isChurchConfigured(): Promise<boolean> {
  const count = await prisma.churchSettings.count({
    where: { id: "singleton" },
  });
  return count > 0;
}
