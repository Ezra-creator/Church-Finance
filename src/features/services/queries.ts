import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { sumCedi } from "@/lib/money";

export interface ServiceSummaryItem {
  id: string;
  serviceDate: Date;
  serviceType: string;
  title: string | null;
  status: string;
  witnessName: string | null;
  countedBy: { name: string; email: string } | null;
  grandTotal: Prisma.Decimal;
  categoryTotals: Array<{
    categoryId: string;
    categoryCode: string;
    categoryName: string;
    total: Prisma.Decimal;
  }>;
  createdAt: Date;
}

export async function listRecentServices(limit: number = 20): Promise<ServiceSummaryItem[]> {
  const records = await prisma.serviceRecord.findMany({
    take: limit,
    orderBy: { serviceDate: "desc" },
    include: {
      countedBy: {
        select: { name: true, email: true },
      },
      countSheets: {
        include: {
          category: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  });

  return records.map((record) => {
    const categoryTotals = record.countSheets.map((s) => ({
      categoryId: s.categoryId,
      categoryCode: s.category.code,
      categoryName: s.category.name,
      total: s.total,
    }));

    const grandTotal = sumCedi(categoryTotals.map((c) => c.total));

    return {
      id: record.id,
      serviceDate: record.serviceDate,
      serviceType: record.serviceType,
      title: record.title,
      status: record.status,
      witnessName: record.witnessName,
      countedBy: record.countedBy,
      grandTotal,
      categoryTotals,
      createdAt: record.createdAt,
    };
  });
}

export async function getServiceRecord(id: string) {
  return prisma.serviceRecord.findUnique({
    where: { id },
    include: {
      countedBy: {
        select: { id: true, name: true, email: true, role: true },
      },
      countSheets: {
        include: {
          category: true,
          lines: {
            include: {
              denomination: true,
            },
            orderBy: {
              denomination: {
                sortOrder: "asc",
              },
            },
          },
        },
      },
      givingEntries: {
        include: {
          member: true,
          receipt: true,
          category: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}
