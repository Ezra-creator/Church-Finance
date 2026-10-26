import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import {
  checkIdempotentRequest,
  saveIdempotentResponse,
  cleanupExpiredIdempotencyKeys,
} from "@/features/idempotency/service";
import { saveCount } from "@/features/counting/service";
import { addGivingEntry } from "@/features/giving/service";
import { Role, ServiceStatus, ServiceType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";

describe("Idempotency Service & Repeated Financial Writes", () => {
  let userSecretary: { id: string };
  let otherUser: { id: string };
  let serviceRecord: { id: string };
  let categoryOffering: { id: string };
  let categoryTithe: { id: string };
  let denomination: { id: string };

  beforeEach(async () => {
    userSecretary = await prisma.user.create({
      data: {
        email: `idem-sec-${Date.now()}@puca.local`,
        name: "Idem Sec",
        passwordHash: "hash",
        role: Role.FINANCE_SECRETARY,
      },
    });

    otherUser = await prisma.user.create({
      data: {
        email: `idem-other-${Date.now()}@puca.local`,
        name: "Idem Other",
        passwordHash: "hash",
        role: Role.TREASURER,
      },
    });

    serviceRecord = await prisma.serviceRecord.create({
      data: {
        serviceDate: new Date("2026-05-10T00:00:00.000Z"),
        serviceType: ServiceType.SUNDAY,
        status: ServiceStatus.OPEN,
      },
    });

    categoryOffering = await prisma.givingCategory.create({
      data: {
        code: `OFFERING_IDEM_${Date.now()}`,
        name: "Offering Idem",
        sortOrder: 1,
      },
    });

    categoryTithe =
      (await prisma.givingCategory.findUnique({ where: { code: "TITHE" } })) ??
      (await prisma.givingCategory.create({
        data: {
          code: "TITHE",
          name: "Tithe",
          sortOrder: 2,
        },
      }));

    denomination =
      (await prisma.denomination.findFirst({
        where: { value: new Prisma.Decimal("50.00") },
      })) ??
      (await prisma.denomination.create({
        data: {
          value: new Prisma.Decimal("50.00"),
          kind: "NOTE",
          sortOrder: 1,
        },
      }));
  });

  afterEach(async () => {
    await prisma.idempotencyKey.deleteMany({
      where: { userId: { in: [userSecretary.id, otherUser.id] } },
    });
    await prisma.countLine.deleteMany({
      where: { countSheet: { serviceRecordId: serviceRecord.id } },
    });
    await prisma.countSheet.deleteMany({
      where: { serviceRecordId: serviceRecord.id },
    });
    await prisma.givingEntry.deleteMany({
      where: { serviceRecordId: serviceRecord.id },
    });
    await prisma.serviceRecord.deleteMany({
      where: { id: serviceRecord.id },
    });
    await prisma.givingCategory.deleteMany({
      where: { id: categoryOffering.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userSecretary.id, otherUser.id] } },
    });
  });

  it("returns null for non-existent or empty key", async () => {
    const res = await checkIdempotentRequest("missing-key", userSecretary.id, "TEST");
    expect(res).toBeNull();
  });

  it("stores and retrieves cached result with identical payload", async () => {
    const key = `test-key-${Date.now()}`;
    const payload = { resultId: "123", amount: "500.00" };

    await prisma.$transaction(async (tx) => {
      await saveIdempotentResponse(tx, key, userSecretary.id, "TEST_OP", payload);
    });

    const cached = await checkIdempotentRequest<typeof payload>(key, userSecretary.id, "TEST_OP");
    expect(cached).toEqual(payload);
  });

  it("rejects idempotency key collision with a different user", async () => {
    const key = `collision-key-${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      await saveIdempotentResponse(tx, key, userSecretary.id, "TEST_OP", { ok: true });
    });

    await expect(
      checkIdempotentRequest(key, otherUser.id, "TEST_OP")
    ).rejects.toThrow(AppError);
  });

  it("prevents double-counting when repeating saveCount with the same idempotencyKey", async () => {
    const idempotencyKey = `count-key-${Date.now()}`;
    const countInput = {
      serviceRecordId: serviceRecord.id,
      categoryId: categoryOffering.id,
      lines: [{ denominationId: denomination.id, quantity: 4 }], // 4 x 50 = 200
      idempotencyKey,
    };

    // First save
    const firstResult = await saveCount(countInput, userSecretary.id);
    expect(firstResult.total.toString()).toBe("200");

    // Total count sheets for this service & category should be 1
    const sheetsAfterFirst = await prisma.countSheet.findMany({
      where: { serviceRecordId: serviceRecord.id, categoryId: categoryOffering.id },
    });
    expect(sheetsAfterFirst).toHaveLength(1);

    // Replay with identical idempotencyKey (e.g. outbox resend on network reconnect)
    const secondResult = await saveCount(countInput, userSecretary.id);
    expect(secondResult.id).toBe(firstResult.id);

    // Verify still exactly 1 count sheet and lines not duplicated
    const sheetsAfterSecond = await prisma.countSheet.findMany({
      where: { serviceRecordId: serviceRecord.id, categoryId: categoryOffering.id },
      include: { lines: true },
    });
    expect(sheetsAfterSecond).toHaveLength(1);
    expect(sheetsAfterSecond[0].lines).toHaveLength(1);
    expect(sheetsAfterSecond[0].lines[0].quantity).toBe(4);
  });

  it("prevents duplicate giving entries when repeating addGivingEntry with the same idempotencyKey", async () => {
    const idempotencyKey = `giving-key-${Date.now()}`;
    const givingInput = {
      serviceRecordId: serviceRecord.id,
      categoryId: categoryOffering.id,
      payerName: "Kofi Atta",
      amount: "150.00",
      idempotencyKey,
    };

    // First write
    const firstResult = await addGivingEntry(givingInput, userSecretary.id);
    expect(firstResult.amount.toString()).toBe("150");

    // Second write with same idempotency key
    const secondResult = await addGivingEntry(givingInput, userSecretary.id);
    expect(secondResult.id).toBe(firstResult.id);

    // Verify database has exactly 1 giving entry, NOT 2
    const allEntries = await prisma.givingEntry.findMany({
      where: { serviceRecordId: serviceRecord.id, categoryId: categoryOffering.id },
    });
    expect(allEntries).toHaveLength(1);
    expect(allEntries[0].id).toBe(firstResult.id);
  });

  it("cleans up expired idempotency keys", async () => {
    const expiredKey = `expired-key-${Date.now()}`;
    await prisma.idempotencyKey.create({
      data: {
        key: expiredKey,
        userId: userSecretary.id,
        operation: "EXPIRED_OP",
        responseJson: { ok: true },
        expiresAt: new Date(Date.now() - 10000), // in the past
      },
    });

    const cleaned = await cleanupExpiredIdempotencyKeys();
    expect(cleaned).toBeGreaterThanOrEqual(1);

    const lookup = await prisma.idempotencyKey.findUnique({ where: { key: expiredKey } });
    expect(lookup).toBeNull();
  });
});
