import { describe, it, expect } from "vitest";
import { amountInWords } from "@/lib/words";
import { Prisma } from "@prisma/client";

describe("amountInWords", () => {
  it("formats integer amounts in Ghana Cedis", () => {
    expect(amountInWords(new Prisma.Decimal("50.00"))).toBe(
      "Fifty Ghana Cedis only"
    );
    expect(amountInWords(new Prisma.Decimal("1.00"))).toBe(
      "One Ghana Cedi only"
    );
    expect(amountInWords(new Prisma.Decimal("100.00"))).toBe(
      "One Hundred Ghana Cedis only"
    );
    expect(amountInWords(new Prisma.Decimal("125.00"))).toBe(
      "One Hundred and Twenty-Five Ghana Cedis only"
    );
    expect(amountInWords(new Prisma.Decimal("1000.00"))).toBe(
      "One Thousand Ghana Cedis only"
    );
    expect(amountInWords(new Prisma.Decimal("1250.00"))).toBe(
      "One Thousand, Two Hundred and Fifty Ghana Cedis only"
    );
  });

  it("formats mixed cedis and pesewas", () => {
    expect(amountInWords(new Prisma.Decimal("125.50"))).toBe(
      "One Hundred and Twenty-Five Ghana Cedis, Fifty Pesewas only"
    );
    expect(amountInWords(new Prisma.Decimal("5.01"))).toBe(
      "Five Ghana Cedis, One Pesewa only"
    );
  });

  it("formats pesewas only", () => {
    expect(amountInWords(new Prisma.Decimal("0.50"))).toBe(
      "Fifty Pesewas only"
    );
    expect(amountInWords(new Prisma.Decimal("0.05"))).toBe(
      "Five Pesewas only"
    );
  });

  it("formats zero amount", () => {
    expect(amountInWords(new Prisma.Decimal("0.00"))).toBe(
      "Zero Ghana Cedis only"
    );
  });
});
