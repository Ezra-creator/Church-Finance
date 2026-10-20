import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { sumCedi } from "@/lib/money";

describe("Cash Count Total Computation", () => {
  const denominations = [
    { id: "d200", value: new Prisma.Decimal("200.00"), kind: "NOTE" },
    { id: "d100", value: new Prisma.Decimal("100.00"), kind: "NOTE" },
    { id: "d50", value: new Prisma.Decimal("50.00"), kind: "NOTE" },
    { id: "d20", value: new Prisma.Decimal("20.00"), kind: "NOTE" },
    { id: "d10", value: new Prisma.Decimal("10.00"), kind: "NOTE" },
    { id: "d5", value: new Prisma.Decimal("5.00"), kind: "NOTE" },
    { id: "d2", value: new Prisma.Decimal("2.00"), kind: "NOTE" },
    { id: "d1", value: new Prisma.Decimal("1.00"), kind: "NOTE" },
    { id: "c50", value: new Prisma.Decimal("0.50"), kind: "COIN" },
    { id: "c20", value: new Prisma.Decimal("0.20"), kind: "COIN" },
    { id: "c10", value: new Prisma.Decimal("0.10"), kind: "COIN" },
    { id: "c05", value: new Prisma.Decimal("0.05"), kind: "COIN" },
    { id: "c01", value: new Prisma.Decimal("0.01"), kind: "COIN" },
  ];

  function computeServerCount(lines: Array<{ denominationId: string; quantity: number }>) {
    const denomMap = new Map(denominations.map((d) => [d.id, d.value]));
    const computedLines = lines.map((line) => {
      const denomVal = denomMap.get(line.denominationId);
      if (!denomVal) throw new Error("Unknown denomination");
      if (line.quantity < 0) throw new Error("Quantity cannot be negative");
      return {
        denominationId: line.denominationId,
        quantity: line.quantity,
        lineTotal: denomVal.mul(line.quantity),
      };
    });

    const total = sumCedi(computedLines.map((l) => l.lineTotal));
    return { computedLines, total };
  }

  it("calculates line totals and grand total accurately without floating point error", () => {
    // 3 x 200 = 600
    // 5 x 50 = 250
    // 10 x 20 = 200
    // 7 x 0.50 = 3.50
    // 3 x 0.20 = 0.60
    // 4 x 0.05 = 0.20
    // 1 x 0.01 = 0.01
    // Total = 1054.31
    const lines = [
      { denominationId: "d200", quantity: 3 },
      { denominationId: "d50", quantity: 5 },
      { denominationId: "d20", quantity: 10 },
      { denominationId: "c50", quantity: 7 },
      { denominationId: "c20", quantity: 3 },
      { denominationId: "c05", quantity: 4 },
      { denominationId: "c01", quantity: 1 },
    ];

    const result = computeServerCount(lines);
    expect(result.total.toFixed(2)).toBe("1054.31");
    expect(result.computedLines[0].lineTotal.toFixed(2)).toBe("600.00");
    expect(result.computedLines[3].lineTotal.toFixed(2)).toBe("3.50");
    expect(result.computedLines[4].lineTotal.toFixed(2)).toBe("0.60");
    expect(result.computedLines[6].lineTotal.toFixed(2)).toBe("0.01");
  });

  it("returns zero total when all quantities are zero", () => {
    const lines = [
      { denominationId: "d200", quantity: 0 },
      { denominationId: "d100", quantity: 0 },
      { denominationId: "c50", quantity: 0 },
    ];

    const result = computeServerCount(lines);
    expect(result.total.toFixed(2)).toBe("0.00");
  });

  it("rejects negative quantities", () => {
    const lines = [{ denominationId: "d200", quantity: -1 }];
    expect(() => computeServerCount(lines)).toThrow("Quantity cannot be negative");
  });
});
