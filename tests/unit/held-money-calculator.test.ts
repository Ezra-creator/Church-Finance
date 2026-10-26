import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { calculateHeldMoney } from "@/features/banking/calculator";

describe("calculateHeldMoney (Held Money Ledger)", () => {
  it("returns zero balances when there are no transactions", () => {
    const result = calculateHeldMoney({
      serviceRecords: [],
      momoIncomes: [],
      paidExpenses: [],
      deposits: [],
    });

    expect(result.cashCounted.toString()).toBe("0");
    expect(result.cashExpenses.toString()).toBe("0");
    expect(result.cashDeposits.toString()).toBe("0");
    expect(result.cashHeld.toString()).toBe("0");
    expect(result.oldestUndepositedCashDate).toBeNull();
    expect(result.momoReceived.toString()).toBe("0");
    expect(result.momoExpenses.toString()).toBe("0");
    expect(result.momoTransfers.toString()).toBe("0");
    expect(result.momoHeld.toString()).toBe("0");
    expect(result.totalHeld.toString()).toBe("0");
  });

  it("calculates cash held and FIFO oldest undeposited cash date correctly", () => {
    const d1 = new Date("2026-10-04T00:00:00.000Z");
    const d2 = new Date("2026-10-11T00:00:00.000Z");
    const d3 = new Date("2026-10-18T00:00:00.000Z");

    const result = calculateHeldMoney({
      serviceRecords: [
        { serviceDate: d1, cashCounted: new Prisma.Decimal("500.00") },
        { serviceDate: d2, cashCounted: new Prisma.Decimal("600.00") },
        { serviceDate: d3, cashCounted: new Prisma.Decimal("700.00") },
      ],
      momoIncomes: [],
      paidExpenses: [
        { paymentMethod: "CASH", amount: new Prisma.Decimal("200.00") },
      ],
      deposits: [
        {
          kind: "CASH_DEPOSIT",
          amount: new Prisma.Decimal("600.00"),
          status: "CONFIRMED",
          depositDate: new Date("2026-10-12T00:00:00.000Z"),
        },
      ],
    });

    // Total cash counted = 500 + 600 + 700 = 1800.00
    // Total cash outflows = 200 + 600 = 800.00
    // Cash held = 1800 - 800 = 1000.00
    expect(result.cashCounted.toString()).toBe("1800");
    expect(result.cashExpenses.toString()).toBe("200");
    expect(result.cashDeposits.toString()).toBe("600");
    expect(result.cashHeld.toString()).toBe("1000");

    // FIFO: Outflow of 800 covers d1 (500) completely, and 300 of d2 (600).
    // Remaining 300 of d2 is still held. Therefore oldest undeposited date is d2!
    expect(result.oldestUndepositedCashDate?.toISOString()).toBe(d2.toISOString());
  });

  it("calculates MoMo held correctly with MoMo expenses and bank transfers", () => {
    const result = calculateHeldMoney({
      serviceRecords: [],
      momoIncomes: [
        { amount: new Prisma.Decimal("1200.00") },
        { amount: new Prisma.Decimal("800.00") },
      ],
      paidExpenses: [
        { paymentMethod: "MOMO", amount: new Prisma.Decimal("350.00") },
        { paymentMethod: "BANK", amount: new Prisma.Decimal("100.00") }, // Bank expenses do not affect cash/momo held
      ],
      deposits: [
        {
          kind: "MOMO_TRANSFER",
          amount: new Prisma.Decimal("1000.00"),
          status: "CONFIRMED",
          depositDate: new Date("2026-10-15T00:00:00.000Z"),
        },
      ],
    });

    // MoMo received = 2000.00
    // MoMo expenses = 350.00
    // MoMo transfers = 1000.00
    // MoMo held = 2000 - 350 - 1000 = 650.00
    expect(result.momoReceived.toString()).toBe("2000");
    expect(result.momoExpenses.toString()).toBe("350");
    expect(result.momoTransfers.toString()).toBe("1000");
    expect(result.momoHeld.toString()).toBe("650");
    expect(result.totalHeld.toString()).toBe("650");
  });

  it("handles complete banking where all cash is banked (null oldest date)", () => {
    const d1 = new Date("2026-10-04T00:00:00.000Z");

    const result = calculateHeldMoney({
      serviceRecords: [
        { serviceDate: d1, cashCounted: new Prisma.Decimal("500.00") },
      ],
      momoIncomes: [],
      paidExpenses: [],
      deposits: [
        {
          kind: "CASH_DEPOSIT",
          amount: new Prisma.Decimal("500.00"),
          status: "PENDING_CONFIRMATION", // Both pending and confirmed are counted as banked/outflow
          depositDate: new Date("2026-10-05T00:00:00.000Z"),
        },
      ],
    });

    expect(result.cashHeld.toString()).toBe("0");
    expect(result.oldestUndepositedCashDate).toBeNull();
  });
});
