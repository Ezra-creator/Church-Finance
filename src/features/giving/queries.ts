import { prisma } from "@/server/db";

export async function getReceiptById(id: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      issuedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      givingEntry: {
        include: {
          member: true,
          category: true,
          serviceRecord: true,
        },
      },
    },
  });

  if (!receipt) {
    return null;
  }

  const churchSettings = await prisma.churchSettings.findUnique({
    where: { id: "singleton" },
  });

  return {
    ...receipt,
    churchSettings,
  };
}
