import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import { createAllocationRule } from "@/features/allocation/service";
import { Role } from "@prisma/client";

describe("Allocation Rules Overlap Validation & Lifecycle", () => {
  let testUser: { id: string };
  let testCategory: { id: string };

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `test-sec-${Date.now()}@puca.local`,
        name: "Test Secretary",
        passwordHash: "hash",
        role: Role.FINANCE_SECRETARY,
      },
    });

    testCategory = await prisma.givingCategory.create({
      data: {
        code: `TEST_CAT_${Date.now()}`,
        name: "Test Category",
        sortOrder: 99,
      },
    });
  });

  afterEach(async () => {
    await prisma.districtAllocationRule.deleteMany({
      where: { categoryId: testCategory.id },
    });
    await prisma.givingCategory.delete({
      where: { id: testCategory.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  it("creates an open rule and automatically closes it when a new rule is added with later start date", async () => {
    // 1. Create first rule: 10% effective from 2026-01-01
    const rule1 = await createAllocationRule(
      {
        categoryId: testCategory.id,
        percentage: "10.00",
        effectiveFrom: "2026-01-01",
      },
      testUser.id
    );

    expect(rule1.percentage.toString()).toBe("10");
    expect(rule1.effectiveTo).toBeNull();

    // 2. Create second rule: 15% effective from 2026-07-01
    const rule2 = await createAllocationRule(
      {
        categoryId: testCategory.id,
        percentage: "15.00",
        effectiveFrom: "2026-07-01",
      },
      testUser.id
    );

    expect(rule2.percentage.toString()).toBe("15");
    expect(rule2.effectiveTo).toBeNull();

    // 3. Verify rule1 is now closed on 2026-06-30 (day before 2026-07-01)
    const refreshedRule1 = await prisma.districtAllocationRule.findUnique({
      where: { id: rule1.id },
    });
    expect(refreshedRule1?.effectiveTo?.toISOString().slice(0, 10)).toBe("2026-06-30");
  });

  it("rejects a new rule that starts on or before the currently active rule", async () => {
    await createAllocationRule(
      {
        categoryId: testCategory.id,
        percentage: "10.00",
        effectiveFrom: "2026-05-01",
      },
      testUser.id
    );

    // Attempt to create rule on or before 2026-05-01
    await expect(
      createAllocationRule(
        {
          categoryId: testCategory.id,
          percentage: "12.00",
          effectiveFrom: "2026-04-01",
        },
        testUser.id
      )
    ).rejects.toThrowError(/cannot start on or before the active rule's start date/);
  });
});
