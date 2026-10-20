import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { sumCedi } from "@/lib/money";
import { AppError } from "@/lib/errors";

describe("Tithe Allocation & Unattributed Meter", () => {
  function validateTitheAllocation(
    countedTithe: Prisma.Decimal,
    existingEntries: Prisma.Decimal[],
    newEntryAmount: Prisma.Decimal
  ): {
    totalAllocated: Prisma.Decimal;
    unattributed: Prisma.Decimal;
  } {
    const currentAllocated = sumCedi(existingEntries);
    const projectedTotal = currentAllocated.add(newEntryAmount);

    if (projectedTotal.greaterThan(countedTithe)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Tithe entries total (GH₵ ${projectedTotal.toFixed(
          2
        )}) cannot exceed the counted cash tithe total of GH₵ ${countedTithe.toFixed(
          2
        )}. Remaining unattributed amount is GH₵ ${countedTithe
          .sub(currentAllocated)
          .toFixed(2)}.`
      );
    }

    return {
      totalAllocated: projectedTotal,
      unattributed: countedTithe.sub(projectedTotal),
    };
  }

  it("allows tithe entries less than counted tithe and computes unattributed remainder", () => {
    const countedTithe = new Prisma.Decimal("1000.00");
    const existing = [new Prisma.Decimal("200.00"), new Prisma.Decimal("350.00")];
    const newEntry = new Prisma.Decimal("150.00");

    const result = validateTitheAllocation(countedTithe, existing, newEntry);
    expect(result.totalAllocated.toFixed(2)).toBe("700.00");
    expect(result.unattributed.toFixed(2)).toBe("300.00");
  });

  it("allows tithe entries exactly equal to counted tithe with zero unattributed", () => {
    const countedTithe = new Prisma.Decimal("500.00");
    const existing = [new Prisma.Decimal("300.00")];
    const newEntry = new Prisma.Decimal("200.00");

    const result = validateTitheAllocation(countedTithe, existing, newEntry);
    expect(result.totalAllocated.toFixed(2)).toBe("500.00");
    expect(result.unattributed.toFixed(2)).toBe("0.00");
  });

  it("strictly rejects tithe entries exceeding counted tithe", () => {
    const countedTithe = new Prisma.Decimal("500.00");
    const existing = [new Prisma.Decimal("300.00")];
    const newEntry = new Prisma.Decimal("250.00"); // 300 + 250 = 550 > 500

    expect(() =>
      validateTitheAllocation(countedTithe, existing, newEntry)
    ).toThrow(AppError);

    try {
      validateTitheAllocation(countedTithe, existing, newEntry);
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
      expect((err as AppError).message).toContain("cannot exceed the counted cash tithe total of GH₵ 500.00");
    }
  });
});
