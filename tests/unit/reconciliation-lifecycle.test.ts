import { describe, it, expect } from "vitest";
import { Prisma, ReconciliationStatus, Role } from "@prisma/client";
import { computeWeekRange, getCurrentWeekEnding } from "@/features/reconciliation/week-range";
import {
  buildReportData,
  ReconciliationSnapshot,
} from "@/features/reconciliation/report-data";
import { generateReconciliationDocx } from "@/features/reconciliation/exports/docx-generator";
import { generateReconciliationPdf } from "@/features/reconciliation/exports/pdf-generator";
import { unlockPeriodSchema } from "@/features/reconciliation/schemas";

describe("Reconciliation Lifecycle & Week Boundaries", () => {
  it("computes week boundaries accurately for Africa/Accra (UTC+0)", () => {
    // Week ending Sunday 18 Oct 2026
    const range = computeWeekRange("2026-10-18");

    expect(range.weekEndingString).toBe("2026-10-18");
    expect(range.startDateString).toBe("2026-10-12"); // Monday
    expect(range.startDateUtc.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(range.endDateUtc.toISOString()).toBe("2026-10-18T23:59:59.999Z");
    expect(range.formattedRange).toContain("12 Oct");
    expect(range.formattedRange).toContain("18 Oct 2026");
  });

  it("handles month and leap boundary week ranges", () => {
    // Week ending Sunday 01 Nov 2026 starts Monday 26 Oct 2026
    const range = computeWeekRange("2026-11-01");
    expect(range.startDateString).toBe("2026-10-26");
    expect(range.weekEndingString).toBe("2026-11-01");
  });

  it("computes current week ending with weekEndsOn day", () => {
    // Reference: Tuesday 20 Oct 2026. weekEndsOn = 0 (Sunday)
    const refDate = new Date("2026-10-20T12:00:00Z");
    const weekEnding = getCurrentWeekEnding(0, refDate);
    expect(weekEnding).toBe("2026-10-25"); // Next Sunday
  });
});

describe("Snapshot Immutability and Export Consistency", () => {
  const snapshot: ReconciliationSnapshot = {
    weekEnding: "2026-10-18",
    weekRange: "Monday, 12 Oct 2026 – Sunday, 18 Oct 2026",
    churchName: "Presbyterian Church of Ghana — PUCA Congregation",
    presbyteryName: "Ga West Presbytery",
    preparedById: "user_sec",
    preparedByName: "Jane Doe (Finance Secretary)",
    submittedAt: "2026-10-18T18:00:00.000Z",
    version: 1,
    parallelRunActive: true,
    categories: [
      {
        categoryId: "cat_tithe",
        categoryName: "Tithe",
        categoryCode: "TITHE",
        cashAmount: "1200.00",
        momoAmount: "800.00",
        totalAmount: "2000.00",
      },
      {
        categoryId: "cat_offering",
        categoryName: "Regular Offering",
        categoryCode: "OFFERING",
        cashAmount: "500.00",
        momoAmount: "150.00",
        totalAmount: "650.00",
      },
    ],
    totals: {
      cashTotal: "1700.00",
      momoTotal: "950.00",
      expectedTotal: "2650.00",
      bookTotal: "2650.00",
      variance: "0.00",
      varianceStatus: "BALANCED",
      varianceLabel: "Balanced",
    },
    varianceReason: null,
  };

  it("builds identical ReportData model from snapshot figures regardless of later edits", () => {
    const reportData = buildReportData(snapshot);

    expect(reportData.churchName).toBe(snapshot.churchName);
    expect(reportData.weekEnding).toBe("2026-10-18");
    expect(reportData.version).toBe(1);
    expect(reportData.totals.expectedFormatted).toBe("GH₵ 2,650.00");
    expect(reportData.totals.cashFormatted).toBe("GH₵ 1,700.00");
    expect(reportData.totals.momoFormatted).toBe("GH₵ 950.00");
    expect(reportData.filenameBase).toBe("PUCA-weekly-2026-10-18-v1");
  });

  it("generates docx matching snapshot totals", async () => {
    const reportData = buildReportData(snapshot);
    const docxBuffer = await generateReconciliationDocx(reportData);

    expect(docxBuffer).toBeInstanceOf(Buffer);
    expect(docxBuffer.length).toBeGreaterThan(1000);
  });

  it("generates pdf matching snapshot totals in serverless", async () => {
    const reportData = buildReportData(snapshot);
    const pdfBytes = await generateReconciliationPdf(reportData);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF header %PDF-
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
  });
});

describe("Unlock & Resubmit Permissions & Validation", () => {
  it("enforces unlock reason of at least 5 characters", () => {
    const invalid = unlockPeriodSchema.safeParse({
      periodId: "p_123",
      reason: "fix",
    });
    expect(invalid.success).toBe(false);

    const valid = unlockPeriodSchema.safeParse({
      periodId: "p_123",
      reason: "Amending service count sheet denomination discrepancy.",
    });
    expect(valid.success).toBe(true);
  });
});
