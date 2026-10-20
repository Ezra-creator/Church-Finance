import { describe, it, expect } from "vitest";
import { parseCedi, formatCedi, sumCedi, toMinorUnits } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { Prisma } from "@prisma/client";

describe("Money Utility (Ghana Cedi GH₵)", () => {
  describe("parseCedi", () => {
    it("parses valid integer and decimal strings", () => {
      const a = parseCedi("100");
      expect(a.toString()).toBe("100");

      const b = parseCedi("1250.50");
      expect(b.toString()).toBe("1250.5");

      const c = parseCedi("0.05");
      expect(c.toString()).toBe("0.05");
    });

    it("strips currency prefixes and thousands commas cleanly", () => {
      expect(parseCedi("GH₵ 250.00").toString()).toBe("250");
      expect(parseCedi("GHS 1,450.75").toString()).toBe("1450.75");
      expect(parseCedi("GHc10,000.00").toString()).toBe("10000");
    });

    it("rejects numbers with more than two decimal places", () => {
      expect(() => parseCedi("10.555")).toThrow(AppError);
      expect(() => parseCedi("0.001")).toThrow(AppError);
      expect(() => parseCedi("12.3456")).toThrow(
        "Invalid cedi amount. Must have at most two decimal places."
      );
    });

    it("rejects negative amounts by default", () => {
      expect(() => parseCedi("-50.00")).toThrow(AppError);
      expect(() => parseCedi("-0.01")).toThrow("Amount cannot be negative.");
    });

    it("allows negative amounts when allowNegative is true", () => {
      const negative = parseCedi("-50.25", { allowNegative: true });
      expect(negative.toString()).toBe("-50.25");
      expect(negative.isNegative()).toBe(true);
    });

    it("rejects invalid, malformed, or empty strings", () => {
      expect(() => parseCedi("")).toThrow("Amount cannot be empty.");
      expect(() => parseCedi("   ")).toThrow("Amount cannot be empty.");
      expect(() => parseCedi("abc")).toThrow("Invalid cedi amount format.");
      expect(() => parseCedi("12.3.4")).toThrow("Invalid cedi amount format.");
      expect(() => parseCedi("GH₵")).toThrow("Amount cannot be empty.");
    });
  });

  describe("formatCedi", () => {
    it("formats amounts with GH₵ prefix and two decimal places", () => {
      expect(formatCedi(new Prisma.Decimal("1250.5"))).toBe("GH₵ 1,250.50");
      expect(formatCedi("0")).toBe("GH₵ 0.00");
      expect(formatCedi(null)).toBe("GH₵ 0.00");
      expect(formatCedi(undefined)).toBe("GH₵ 0.00");
    });

    it("formats negative amounts with minus sign before prefix", () => {
      expect(formatCedi(new Prisma.Decimal("-45.20"))).toBe("-GH₵ 45.20");
    });

    it("adds comma separators for thousands", () => {
      expect(formatCedi("1000000.00")).toBe("GH₵ 1,000,000.00");
    });
  });

  describe("sumCedi", () => {
    it("sums a list of amounts accurately without floating-point errors", () => {
      // 0.1 + 0.2 in JS number arithmetic equals 0.30000000000000004
      const sum = sumCedi(["0.10", "0.20"]);
      expect(sum.toString()).toBe("0.3");
      expect(sum.toFixed(2)).toBe("0.30");

      const total = sumCedi(["100.50", "200.25", "50.25"]);
      expect(total.toFixed(2)).toBe("351.00");
    });

    it("returns zero for an empty list", () => {
      expect(sumCedi([]).toFixed(2)).toBe("0.00");
    });
  });

  describe("toMinorUnits", () => {
    it("converts cedi amounts into exact integer pesewas", () => {
      expect(toMinorUnits("150.50")).toBe(15050);
      expect(toMinorUnits("0.05")).toBe(5);
      expect(toMinorUnits("0.01")).toBe(1);
      expect(toMinorUnits("1000.00")).toBe(100000);
      expect(toMinorUnits("0.00")).toBe(0);
    });
  });
});
