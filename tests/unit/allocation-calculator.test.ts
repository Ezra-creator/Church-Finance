import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { computeRemittance } from "@/features/allocation/calculator";

describe("Allocation Calculator (computeRemittance)", () => {
  const titheCategory = {
    categoryId: "cat-tithe",
    categoryName: "Tithe",
    categoryCode: "TITHE",
    totalAmount: new Prisma.Decimal("1000.00"),
  };

  const freewillCategory = {
    categoryId: "cat-freewill",
    categoryName: "Freewill offering",
    categoryCode: "FREEWILL_OFFERING",
    totalAmount: new Prisma.Decimal("500.00"),
  };

  const categories = [titheCategory, freewillCategory];

  it("calculates zero remittance when no rules exist", () => {
    const result = computeRemittance(categories, [], "2026-10-18");
    expect(result.totalDue.toString()).toBe("0");
    expect(result.categoryBreakdown).toHaveLength(2);
    expect(result.categoryBreakdown[0].amountDue.toString()).toBe("0");
    expect(result.categoryBreakdown[1].amountDue.toString()).toBe("0");
  });

  it("calculates exact remittance percentage for active rules", () => {
    const rules = [
      {
        id: "rule-1",
        categoryId: "cat-tithe",
        percentage: new Prisma.Decimal("10.00"), // 10% of 1000 = 100.00
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
      {
        id: "rule-2",
        categoryId: "cat-freewill",
        percentage: new Prisma.Decimal("5.00"), // 5% of 500 = 25.00
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
    ];

    const result = computeRemittance(categories, rules, "2026-10-18");
    // 100 + 25 = 125.00
    expect(result.totalDue.toString()).toBe("125");
    expect(result.categoryBreakdown[0].amountDue.toString()).toBe("100");
    expect(result.categoryBreakdown[1].amountDue.toString()).toBe("25");
  });

  it("respects boundary dates (effectiveFrom and effectiveTo)", () => {
    const rules = [
      {
        id: "rule-old",
        categoryId: "cat-tithe",
        percentage: new Prisma.Decimal("10.00"),
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: new Date("2026-06-30"),
      },
      {
        id: "rule-new",
        categoryId: "cat-tithe",
        percentage: new Prisma.Decimal("15.00"),
        effectiveFrom: new Date("2026-07-01"),
        effectiveTo: null,
      },
    ];

    // On 2026-06-30 (last day of old rule): 10%
    const resOnBoundaryOld = computeRemittance([titheCategory], rules, "2026-06-30");
    expect(resOnBoundaryOld.totalDue.toString()).toBe("100");

    // On 2026-07-01 (first day of new rule): 15%
    const resOnBoundaryNew = computeRemittance([titheCategory], rules, "2026-07-01");
    expect(resOnBoundaryNew.totalDue.toString()).toBe("150");

    // Before effective date (2025-12-31): No effective rule, 0
    const resBefore = computeRemittance([titheCategory], rules, "2025-12-31");
    expect(resBefore.totalDue.toString()).toBe("0");
  });

  it("rounds cents correctly using HALF_UP rounding", () => {
    // 33.33% of 100 = 33.33
    const oddCategory = {
      categoryId: "cat-odd",
      categoryName: "Odd offering",
      totalAmount: new Prisma.Decimal("100.00"),
    };

    const rules = [
      {
        id: "rule-odd",
        categoryId: "cat-odd",
        percentage: new Prisma.Decimal("33.33"),
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
    ];

    const result = computeRemittance([oddCategory], rules, "2026-10-18");
    expect(result.totalDue.toString()).toBe("33.33");
  });
});
