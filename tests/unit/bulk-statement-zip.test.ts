import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import { createBulkAnnualStatementsZip } from "@/features/statements/service";
import { Role, ServiceStatus, ServiceType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import JSZip from "jszip";

describe("Bulk Annual Statements ZIP Export", () => {
  let secretaryUser: { id: string };
  let activeGiver: { id: string; fullName: string };
  let activeNonGiver: { id: string; fullName: string };
  let inactiveGiver: { id: string; fullName: string };
  let categoryTithe: { id: string };
  let serviceRecord: { id: string };

  const testYear = 2026;

  beforeEach(async () => {
    secretaryUser = await prisma.user.create({
      data: {
        email: `bulk-sec-${Date.now()}@puca.local`,
        name: "Bulk Secretary",
        passwordHash: "hash",
        role: Role.FINANCE_SECRETARY,
      },
    });

    activeGiver = await prisma.member.create({
      data: {
        fullName: "Daniel Kwabena",
        memberNumber: `DK-${Date.now()}`,
        active: true,
      },
    });

    activeNonGiver = await prisma.member.create({
      data: {
        fullName: "Eunice Mensah",
        memberNumber: `EM-${Date.now()}`,
        active: true,
      },
    });

    inactiveGiver = await prisma.member.create({
      data: {
        fullName: "Frank Asare",
        memberNumber: `FA-${Date.now()}`,
        active: false, // Inactive
      },
    });

    categoryTithe = await prisma.givingCategory.create({
      data: {
        code: `TITHE_ZIP_${Date.now()}`,
        name: "Tithe",
        sortOrder: 1,
      },
    });

    serviceRecord = await prisma.serviceRecord.create({
      data: {
        serviceDate: new Date(`${testYear}-04-12T00:00:00.000Z`),
        serviceType: ServiceType.SUNDAY,
        status: ServiceStatus.COUNTED,
      },
    });

    // Giving for activeGiver
    await prisma.givingEntry.create({
      data: {
        serviceRecordId: serviceRecord.id,
        categoryId: categoryTithe.id,
        memberId: activeGiver.id,
        amount: new Prisma.Decimal("1200.00"),
      },
    });

    // Giving for inactiveGiver
    await prisma.givingEntry.create({
      data: {
        serviceRecordId: serviceRecord.id,
        categoryId: categoryTithe.id,
        memberId: inactiveGiver.id,
        amount: new Prisma.Decimal("800.00"),
      },
    });
  });

  afterEach(async () => {
    await prisma.statementLog.deleteMany({
      where: {
        memberId: { in: [activeGiver.id, activeNonGiver.id, inactiveGiver.id] },
      },
    });
    await prisma.givingEntry.deleteMany({
      where: { serviceRecordId: serviceRecord.id },
    });
    await prisma.serviceRecord.delete({
      where: { id: serviceRecord.id },
    });
    await prisma.member.deleteMany({
      where: {
        id: { in: [activeGiver.id, activeNonGiver.id, inactiveGiver.id] },
      },
    });
    await prisma.givingCategory.delete({
      where: { id: categoryTithe.id },
    });
    await prisma.user.delete({
      where: { id: secretaryUser.id },
    });
  });

  it("generates a valid ZIP archive containing one valid PDF per active member with giving", async () => {
    const { zipBuffer, countGenerated } = await createBulkAnnualStatementsZip(
      testYear,
      secretaryUser.id,
      { memberIds: [activeGiver.id, activeNonGiver.id, inactiveGiver.id] }
    );

    // Active giver should be included (1)
    // Non-giver and inactive member should not be included
    expect(countGenerated).toBeGreaterThanOrEqual(1);

    // Parse the generated ZIP archive with JSZip
    const zip = await JSZip.loadAsync(zipBuffer);
    const filenames = Object.keys(zip.files);

    // Should contain a PDF for Daniel Kwabena
    const activeGiverPdf = filenames.find((f) => f.includes("Daniel_Kwabena") && f.endsWith(".pdf"));
    expect(activeGiverPdf).toBeDefined();

    // Should NOT contain a PDF for non-giver Eunice Mensah
    const nonGiverPdf = filenames.find((f) => f.includes("Eunice_Mensah"));
    expect(nonGiverPdf).toBeUndefined();

    // Should NOT contain a PDF for inactive giver Frank Asare
    const inactivePdf = filenames.find((f) => f.includes("Frank_Asare"));
    expect(inactivePdf).toBeUndefined();

    // Inspect the actual PDF bytes inside the zip
    const pdfData = await zip.file(activeGiverPdf!)?.async("nodebuffer");
    expect(pdfData).toBeDefined();

    // Valid PDF starts with %PDF
    const pdfHeader = pdfData!.toString("utf-8", 0, 4);
    expect(pdfHeader).toBe("%PDF");
  });
});
