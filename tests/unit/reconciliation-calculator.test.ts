import { describe, it, expect } from "vitest";
import { Prisma, ServiceStatus, MomoTransactionStatus } from "@prisma/client";
import { calculateReconciliation, RawCategoryForCalc } from "@/features/reconciliation/calculator";

describe("Reconciliation Calculator (Pure Engine)", () => {
  const categories: RawCategoryForCalc[] = [
    { id: "cat_tithe", name: "Tithe", code: "TITHE", sortOrder: 1 },
    { id: "cat_offering", name: "Regular Offering", code: "OFFERING", sortOrder: 2 },
    { id: "cat_harvest", name: "Harvest Thanksgiving", code: "HARVEST", sortOrder: 3 },
  ];

  it("calculates cash-only period accurately", () => {
    const serviceRecords = [
      {
        id: "sr_1",
        serviceDate: new Date("2026-10-18"),
        status: ServiceStatus.COUNTED,
        title: "Sunday Main Service",
        countSheets: [
          { categoryId: "cat_tithe", total: new Prisma.Decimal("1500.50") },
          { categoryId: "cat_offering", total: new Prisma.Decimal("850.00") },
        ],
      },
    ];

    const result = calculateReconciliation({
      categories,
      serviceRecords,
      momoTransactions: [],
      bookTotal: new Prisma.Decimal("2350.50"),
      varianceReason: null,
      parallelRunActive: true,
    });

    expect(result.totals.cashTotal.toString()).toBe("2350.5");
    expect(result.totals.momoTotal.toString()).toBe("0");
    expect(result.totals.expectedTotal.toString()).toBe("2350.5");
    expect(result.totals.variance?.toString()).toBe("0");
    expect(result.totals.varianceStatus).toBe("BALANCED");
    expect(result.blockers.length).toBe(0);
    expect(result.canSubmit).toBe(true);
  });

  it("calculates MoMo-only period accurately", () => {
    const momoTransactions = [
      {
        id: "tx_1",
        occurredAt: new Date("2026-10-15T10:00:00Z"),
        amount: new Prisma.Decimal("300.00"),
        direction: "IN" as const,
        status: MomoTransactionStatus.AUTO,
        categoryId: "cat_tithe",
        rawDescription: "Tithe payment",
      },
      {
        id: "tx_2",
        occurredAt: new Date("2026-10-16T12:00:00Z"),
        amount: new Prisma.Decimal("200.00"),
        direction: "IN" as const,
        status: MomoTransactionStatus.CONFIRMED,
        categoryId: "cat_harvest",
        rawDescription: "Harvest pledge",
      },
      {
        id: "tx_out",
        occurredAt: new Date("2026-10-16T14:00:00Z"),
        amount: new Prisma.Decimal("50.00"),
        direction: "OUT" as const,
        status: MomoTransactionStatus.IGNORED,
        categoryId: null,
        rawDescription: "MoMo airtime purchase",
      },
    ];

    const result = calculateReconciliation({
      categories,
      serviceRecords: [],
      momoTransactions,
      bookTotal: new Prisma.Decimal("500.00"),
      varianceReason: null,
      parallelRunActive: true,
    });

    expect(result.totals.cashTotal.toString()).toBe("0");
    expect(result.totals.momoTotal.toString()).toBe("500");
    expect(result.totals.expectedTotal.toString()).toBe("500");
    expect(result.totals.varianceStatus).toBe("BALANCED");
    expect(result.canSubmit).toBe(true);
  });

  it("handles variance in both directions (short and over)", () => {
    // Expected is 1000. Book is 950 -> Short by 50
    const shortResult = calculateReconciliation({
      categories,
      serviceRecords: [
        {
          id: "sr_1",
          serviceDate: new Date("2026-10-18"),
          status: ServiceStatus.COUNTED,
          title: null,
          countSheets: [{ categoryId: "cat_tithe", total: new Prisma.Decimal("1000.00") }],
        },
      ],
      momoTransactions: [],
      bookTotal: new Prisma.Decimal("950.00"),
      varianceReason: null,
      parallelRunActive: true,
    });

    expect(shortResult.totals.variance?.toString()).toBe("-50");
    expect(shortResult.totals.varianceStatus).toBe("SHORT");
    expect(shortResult.totals.varianceLabel).toContain("Short by");
    // Since reason is missing, it should be blocked
    expect(shortResult.blockers.some((b) => b.type === "UNEXPLAINED_VARIANCE")).toBe(true);
    expect(shortResult.canSubmit).toBe(false);

    // With reason provided, blocker resolves
    const explainedShort = calculateReconciliation({
      categories,
      serviceRecords: [
        {
          id: "sr_1",
          serviceDate: new Date("2026-10-18"),
          status: ServiceStatus.COUNTED,
          title: null,
          countSheets: [{ categoryId: "cat_tithe", total: new Prisma.Decimal("1000.00") }],
        },
      ],
      momoTransactions: [],
      bookTotal: new Prisma.Decimal("950.00"),
      varianceReason: "Counter error recorded on page 14 of the physical ledger.",
      parallelRunActive: true,
    });
    expect(explainedShort.blockers.length).toBe(0);
    expect(explainedShort.canSubmit).toBe(true);

    // Expected is 1000. Book is 1050 -> Over by 50
    const overResult = calculateReconciliation({
      categories,
      serviceRecords: [
        {
          id: "sr_1",
          serviceDate: new Date("2026-10-18"),
          status: ServiceStatus.COUNTED,
          title: null,
          countSheets: [{ categoryId: "cat_tithe", total: new Prisma.Decimal("1000.00") }],
        },
      ],
      momoTransactions: [],
      bookTotal: new Prisma.Decimal("1050.00"),
      varianceReason: "Tithe envelope added in paper register after count finalized.",
      parallelRunActive: true,
    });

    expect(overResult.totals.variance?.toString()).toBe("50");
    expect(overResult.totals.varianceStatus).toBe("OVER");
    expect(overResult.totals.varianceLabel).toContain("Over by");
    expect(overResult.canSubmit).toBe(true);
  });

  it("blocks submission when uncounted services or unreviewed MoMo exist", () => {
    const result = calculateReconciliation({
      categories,
      serviceRecords: [
        {
          id: "sr_uncounted",
          serviceDate: new Date("2026-10-18"),
          status: ServiceStatus.OPEN,
          title: "Evening Service",
          countSheets: [],
        },
      ],
      momoTransactions: [
        {
          id: "tx_unreviewed",
          occurredAt: new Date("2026-10-17"),
          amount: new Prisma.Decimal("100.00"),
          direction: "IN",
          status: MomoTransactionStatus.NEEDS_REVIEW,
          categoryId: null,
          rawDescription: "Unclear memo",
        },
      ],
      bookTotal: null,
      varianceReason: null,
      parallelRunActive: false,
    });

    expect(result.blockers.length).toBe(2);
    expect(result.blockers.some((b) => b.type === "MOMO_NEEDS_REVIEW")).toBe(true);
    expect(result.blockers.some((b) => b.type === "SERVICE_NOT_COUNTED")).toBe(true);
    expect(result.canSubmit).toBe(false);
  });
});
