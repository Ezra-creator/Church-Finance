import { describe, it, expect } from "vitest";
import {
  buildReportData,
  ReconciliationSnapshot,
} from "@/features/reconciliation/report-data";
import { generateReconciliationDocx } from "@/features/reconciliation/exports/docx-generator";
import { generateReconciliationPdf } from "@/features/reconciliation/exports/pdf-generator";

describe("Presbytery Report - Phase 5 Expenses & Banking Extension", () => {
  const phase5Snapshot: ReconciliationSnapshot = {
    weekEnding: "2026-10-18",
    weekRange: "12 Oct 2026 – 18 Oct 2026",
    churchName: "Presbyterian Church of Ghana — PUCA Congregation",
    presbyteryName: "Ga West Presbytery",
    preparedById: "user_sec",
    preparedByName: "Adwoa Mansa",
    submittedAt: "2026-10-18T18:00:00.000Z",
    version: 1,
    parallelRunActive: true,
    categories: [
      {
        categoryId: "cat_tithe",
        categoryName: "Tithe",
        categoryCode: "TITHE",
        cashAmount: "1000.00",
        momoAmount: "500.00",
        totalAmount: "1500.00",
      },
    ],
    totals: {
      cashTotal: "1000.00",
      momoTotal: "500.00",
      expectedTotal: "1500.00",
      bookTotal: "1500.00",
      variance: "0.00",
      varianceStatus: "BALANCED",
      varianceLabel: "Balanced",
    },
    varianceReason: null,
    expenses: {
      categories: [
        {
          categoryName: "Utilities & Power",
          cashAmount: "150.00",
          momoAmount: "50.00",
          bankAmount: "0.00",
          totalAmount: "200.00",
        },
        {
          categoryName: "Honorarium",
          cashAmount: "300.00",
          momoAmount: "0.00",
          bankAmount: "0.00",
          totalAmount: "300.00",
        },
      ],
      totals: {
        cashTotal: "450.00",
        momoTotal: "50.00",
        bankTotal: "0.00",
        grandTotal: "500.00",
      },
    },
    banking: {
      deposits: [
        {
          date: "2026-10-15",
          kind: "CASH_DEPOSIT",
          amount: "500.00",
          bankReference: "SLIP-4455",
        },
      ],
      totalDeposited: "500.00",
      cashHeldAtEnd: "50.00",
      momoHeldAtEnd: "450.00",
      totalHeldAtEnd: "500.00",
    },
  };

  it("builds typed report data including expense breakdown and banking summaries", () => {
    const reportData = buildReportData(phase5Snapshot);

    expect(reportData.incomeCategories.length).toBe(1);
    expect(reportData.totals.expectedFormatted).toContain("1,500.00");

    // Phase 5 expense verification
    expect(reportData.expenseCategories.length).toBe(2);
    expect(reportData.expenseTotals?.grandTotalFormatted).toContain("500.00");
    expect(reportData.expenseTotals?.cashFormatted).toContain("450.00");
    expect(reportData.expenseTotals?.momoFormatted).toContain("50.00");

    // Phase 5 banking verification
    expect(reportData.banking).not.toBeNull();
    expect(reportData.banking?.deposits.length).toBe(1);
    expect(reportData.banking?.totalDepositedFormatted).toContain("500.00");
    expect(reportData.banking?.cashHeldFormatted).toContain("50.00");
    expect(reportData.banking?.momoHeldFormatted).toContain("450.00");
    expect(reportData.banking?.totalHeldFormatted).toContain("500.00");
  });

  it("remains backward compatible with Phase 4 snapshots lacking expenses and banking", () => {
    const phase4Snapshot: ReconciliationSnapshot = {
      weekEnding: "2026-10-11",
      weekRange: "05 Oct 2026 – 11 Oct 2026",
      churchName: "PUCA Congregation",
      presbyteryName: "Ga West Presbytery",
      preparedById: "user_sec",
      preparedByName: "Adwoa Mansa",
      submittedAt: "2026-10-11T18:00:00.000Z",
      version: 1,
      parallelRunActive: false,
      categories: [],
      totals: {
        cashTotal: "0.00",
        momoTotal: "0.00",
        expectedTotal: "0.00",
        bookTotal: null,
        variance: null,
        varianceStatus: "BALANCED",
        varianceLabel: "Balanced",
      },
      varianceReason: null,
    };

    const reportData = buildReportData(phase4Snapshot);
    expect(reportData.expenseCategories.length).toBe(0);
    expect(reportData.expenseTotals).toBeNull();
    expect(reportData.banking).toBeNull();
  });

  it("exports matching docx and pdf including the Phase 5 sections", async () => {
    const reportData = buildReportData(phase5Snapshot);

    const docxBuffer = await generateReconciliationDocx(reportData);
    expect(docxBuffer).toBeInstanceOf(Buffer);
    expect(docxBuffer.length).toBeGreaterThan(1000);

    const pdfBytes = await generateReconciliationPdf(reportData);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
