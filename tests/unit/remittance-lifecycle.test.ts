import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import { recordRemittancePayment } from "@/features/remittance/service";
import { Role, DistrictRemittanceStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

describe("District Remittance Lifecycle & Status Transitions", () => {
  let testUser: { id: string };
  let testPeriod: { id: string };
  let testRemittance: { id: string };

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `treasurer-${Date.now()}@puca.local`,
        name: "Test Treasurer",
        passwordHash: "hash",
        role: Role.TREASURER,
      },
    });

    const randomDay = String(Math.floor(Math.random() * 25 + 1)).padStart(2, "0");
    testPeriod = await prisma.reconciliationPeriod.create({
      data: {
        weekEnding: new Date(`2026-10-${randomDay}T00:00:00.000Z`),
        reportVersion: 1,
      },
    });

    testRemittance = await prisma.districtRemittance.create({
      data: {
        periodId: testPeriod.id,
        amountDue: new Prisma.Decimal("1000.00"),
        amountPaid: new Prisma.Decimal("0.00"),
        status: DistrictRemittanceStatus.DUE,
      },
    });
  });

  afterEach(async () => {
    if (testRemittance?.id) {
      await prisma.districtRemittancePayment.deleteMany({
        where: { remittanceId: testRemittance.id },
      });
      await prisma.districtRemittance.deleteMany({
        where: { id: testRemittance.id },
      });
    }
    if (testPeriod?.id) {
      await prisma.reconciliationPeriod.deleteMany({
        where: { id: testPeriod.id },
      });
    }
    if (testUser?.id) {
      await prisma.user.deleteMany({
        where: { id: testUser.id },
      });
    }
  });

  it("transitions from DUE to PART_PAID on partial payment", async () => {
    const { remittance, payment } = await recordRemittancePayment(
      {
        remittanceId: testRemittance.id,
        amount: "400.00",
        paidOn: "2026-10-20",
        reference: "CHQ-1001",
      },
      testUser.id
    );

    expect(remittance.status).toBe(DistrictRemittanceStatus.PART_PAID);
    expect(remittance.amountPaid.toString()).toBe("400");
    expect(payment.amount.toString()).toBe("400");
    expect(payment.reference).toBe("CHQ-1001");
  });

  it("transitions from PART_PAID to PAID upon settling full balance", async () => {
    // First partial payment: 600
    await recordRemittancePayment(
      {
        remittanceId: testRemittance.id,
        amount: "600.00",
        paidOn: "2026-10-20",
        reference: "PAY-1",
      },
      testUser.id
    );

    // Second payment: remaining 400
    const { remittance } = await recordRemittancePayment(
      {
        remittanceId: testRemittance.id,
        amount: "400.00",
        paidOn: "2026-10-22",
        reference: "PAY-2",
      },
      testUser.id
    );

    expect(remittance.status).toBe(DistrictRemittanceStatus.PAID);
    expect(remittance.amountPaid.toString()).toBe("1000");
  });

  it("rejects overpayment exceeding remaining balance", async () => {
    // First partial payment: 700 (leaving 300 due)
    await recordRemittancePayment(
      {
        remittanceId: testRemittance.id,
        amount: "700.00",
        paidOn: "2026-10-20",
        reference: "PAY-1",
      },
      testUser.id
    );

    // Attempt to pay 400 when only 300 is due
    await expect(
      recordRemittancePayment(
        {
          remittanceId: testRemittance.id,
          amount: "400.00",
          paidOn: "2026-10-23",
          reference: "OVERPAY",
        },
        testUser.id
      )
    ).rejects.toThrowError(/exceeds remaining balance due/);
  });
});
