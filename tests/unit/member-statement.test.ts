import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import { getMemberGivingStatement } from "@/features/statements/service";
import {
  Role,
  ServiceStatus,
  ServiceType,
  MomoTransactionStatus,
  MomoTransactionDirection,
  StatementFileType,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

describe("Member Giving Statement Service", () => {
  let memberAlice: { id: string };
  let memberBob: { id: string };
  let categoryTithe: { id: string };
  let categoryOffering: { id: string };
  let testUser: { id: string };
  let countedService: { id: string };
  let openService: { id: string };
  let momoImport: { id: string };

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `sec-${Date.now()}@puca.local`,
        name: "Test Secretary",
        passwordHash: "hash",
        role: Role.FINANCE_SECRETARY,
      },
    });

    memberAlice = await prisma.member.create({
      data: {
        fullName: "Alice Mensah",
        memberNumber: `ALICE-${Date.now()}`,
        phone: `024${Math.floor(1000000 + Math.random() * 9000000)}`,
        active: true,
      },
    });

    memberBob = await prisma.member.create({
      data: {
        fullName: "Bob Osei",
        memberNumber: `BOB-${Date.now()}`,
        phone: `020${Math.floor(1000000 + Math.random() * 9000000)}`,
        active: true,
      },
    });

    categoryTithe = await prisma.givingCategory.create({
      data: {
        code: `TITHE_${Date.now()}`,
        name: "Tithe",
        sortOrder: 1,
      },
    });

    categoryOffering = await prisma.givingCategory.create({
      data: {
        code: `OFFERING_${Date.now()}`,
        name: "Freewill Offering",
        sortOrder: 2,
      },
    });

    // 1. COUNTED Service record
    countedService = await prisma.serviceRecord.create({
      data: {
        serviceDate: new Date("2026-03-15T00:00:00.000Z"),
        serviceType: ServiceType.SUNDAY,
        status: ServiceStatus.COUNTED,
      },
    });

    // 2. OPEN Service record (not yet counted/verified)
    openService = await prisma.serviceRecord.create({
      data: {
        serviceDate: new Date("2026-03-22T00:00:00.000Z"),
        serviceType: ServiceType.SUNDAY,
        status: ServiceStatus.OPEN,
      },
    });

    // 3. Parser Profile and MomoImport for MoMo transactions
    const profile = await prisma.parserProfile.create({
      data: {
        name: `Profile-${Date.now()}`,
        fileType: StatementFileType.CSV,
        columnMap: {},
      },
    });

    momoImport = await prisma.momoImport.create({
      data: {
        fileName: "momo.csv",
        fileHash: `hash-${Date.now()}`,
        parserProfileId: profile.id,
        uploadedById: testUser.id,
        rowsTotal: 1,
        rowsImported: 1,
        rowsDuplicate: 0,
        rowsSkipped: 0,
      },
    });
  });

  afterEach(async () => {
    await prisma.givingEntry.deleteMany({
      where: {
        serviceRecordId: { in: [countedService.id, openService.id] },
      },
    });
    await prisma.momoTransaction.deleteMany({
      where: { importId: momoImport.id },
    });
    await prisma.momoImport.deleteMany({
      where: { id: momoImport.id },
    });
    await prisma.serviceRecord.deleteMany({
      where: { id: { in: [countedService.id, openService.id] } },
    });
    await prisma.member.deleteMany({
      where: { id: { in: [memberAlice.id, memberBob.id] } },
    });
    await prisma.givingCategory.deleteMany({
      where: { id: { in: [categoryTithe.id, categoryOffering.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id },
    });
  });

  it("calculates member totals accurately and strictly excludes unattributed giving", async () => {
    // 1. Alice's cash tithe in COUNTED service: 500
    await prisma.givingEntry.create({
      data: {
        serviceRecordId: countedService.id,
        categoryId: categoryTithe.id,
        memberId: memberAlice.id,
        payerName: "Alice Mensah",
        amount: new Prisma.Decimal("500.00"),
      },
    });

    // 2. Alice's MoMo tithe: 250
    await prisma.momoTransaction.create({
      data: {
        importId: momoImport.id,
        occurredAt: new Date("2026-03-10T10:00:00.000Z"),
        direction: MomoTransactionDirection.IN,
        amount: new Prisma.Decimal("250.00"),
        rawDescription: "Tithe from Alice",
        normalizedDescription: "tithe from alice",
        status: MomoTransactionStatus.CONFIRMED,
        categoryId: categoryTithe.id,
        memberId: memberAlice.id,
        rawRow: {},
      },
    });

    // 3. UNATTRIBUTED giving: 1000 cash in counted service (memberId is null!)
    await prisma.givingEntry.create({
      data: {
        serviceRecordId: countedService.id,
        categoryId: categoryOffering.id,
        memberId: null, // UNATTRIBUTED!
        payerName: "Anonymous donor",
        amount: new Prisma.Decimal("1000.00"),
      },
    });

    // 4. Bob's giving: 700 (attributed to Bob, NOT Alice)
    await prisma.givingEntry.create({
      data: {
        serviceRecordId: countedService.id,
        categoryId: categoryTithe.id,
        memberId: memberBob.id,
        payerName: "Bob Osei",
        amount: new Prisma.Decimal("700.00"),
      },
    });

    // 5. Giving in OPEN (uncounted) service: 300 (should be excluded)
    await prisma.givingEntry.create({
      data: {
        serviceRecordId: openService.id,
        categoryId: categoryTithe.id,
        memberId: memberAlice.id,
        payerName: "Alice Mensah",
        amount: new Prisma.Decimal("300.00"),
      },
    });

    // Build statement for Alice for 2026
    const statement = await getMemberGivingStatement(
      memberAlice.id,
      "2026-01-01",
      "2026-12-31"
    );

    // Alice should have: 500 (cash) + 250 (momo) = 750
    // Unattributed (1000), Bob's (700), and Open service (300) MUST be excluded
    expect(statement.items).toHaveLength(2);
    expect(statement.grandTotal.toString()).toBe("750");

    expect(statement.items[0].method).toBe("MOMO");
    expect(statement.items[0].amount.toString()).toBe("250");

    expect(statement.items[1].method).toBe("CASH");
    expect(statement.items[1].amount.toString()).toBe("500");

    // Category summary: Tithe = 750
    expect(statement.categoryTotals).toHaveLength(1);
    expect(statement.categoryTotals[0].total.toString()).toBe("750");

    // Monthly summary: March 2026 = 750
    expect(statement.monthlyTotals).toHaveLength(1);
    expect(statement.monthlyTotals[0].total.toString()).toBe("750");
  });
});
