import { PDFDocument, StandardFonts, rgb, PDFPage } from "pdf-lib";
import { ReconciliationReportData } from "../report-data";

function sanitizeForPdf(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/GH[₵c]/g, "GHS ")
    .replace(/₵/g, "GHS ")
    .replace(/•/g, "-")
    .replace(/—/g, "-")
    .replace(/[“”]/g, '"');
}

/**
 * Generates a clean, serverless-compatible PDF document from ReconciliationReportData.
 * Includes income categories, disbursements/expenses, bank deposits, and held balances.
 */
export async function generateReconciliationPdf(
  data: ReconciliationReportData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4 in points
  const { width, height } = currentPage.getSize();

  // Load standard fonts
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const sansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const monoRegular = await pdfDoc.embedFont(StandardFonts.Courier);
  const monoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const margin = 50;
  let y = height - margin;

  const inkColor = rgb(0.11, 0.11, 0.09); // #1C1B18
  const softColor = rgb(0.34, 0.33, 0.31); // #57534E
  const ruleColor = rgb(0.85, 0.84, 0.82); // Hairline border

  function ensureSpace(needed: number) {
    if (y - needed < margin + 60) {
      currentPage = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }
  }

  // Church Name (Serif heading)
  currentPage.drawText(sanitizeForPdf(data.churchName), {
    x: margin,
    y: y - 18,
    size: 20,
    font: serifBold,
    color: inkColor,
  });
  y -= 32;

  // Presbytery Name
  currentPage.drawText(sanitizeForPdf(data.presbyteryName.toUpperCase()), {
    x: margin,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  y -= 16;

  // Week range subtitle
  currentPage.drawText(sanitizeForPdf(`WEEKLY FINANCIAL RETURN • ${data.weekRange}`), {
    x: margin,
    y,
    size: 10,
    font: sansRegular,
    color: inkColor,
  });
  y -= 25;

  // Hairline rule above table
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: inkColor,
  });
  y -= 15;

  // Table header
  const colCategory = margin;
  const colCash = 280;
  const colMomo = 380;
  const colTotal = 480;

  currentPage.drawText("Giving Category", {
    x: colCategory,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  currentPage.drawText("Cash Counted", {
    x: colCash,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  currentPage.drawText("Mobile Money", {
    x: colMomo,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  currentPage.drawText("Total", {
    x: colTotal,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });

  y -= 8;
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: ruleColor,
  });
  y -= 14;

  // Category rows
  for (const cat of data.incomeCategories) {
    ensureSpace(20);
    currentPage.drawText(sanitizeForPdf(cat.name), {
      x: colCategory,
      y,
      size: 9,
      font: sansRegular,
      color: inkColor,
    });
    currentPage.drawText(sanitizeForPdf(cat.cashFormatted), {
      x: colCash,
      y,
      size: 9,
      font: monoRegular,
      color: inkColor,
    });
    currentPage.drawText(sanitizeForPdf(cat.momoFormatted), {
      x: colMomo,
      y,
      size: 9,
      font: monoRegular,
      color: inkColor,
    });
    currentPage.drawText(sanitizeForPdf(cat.totalFormatted), {
      x: colTotal,
      y,
      size: 9,
      font: monoRegular,
      color: inkColor,
    });

    y -= 6;
    currentPage.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: ruleColor,
    });
    y -= 14;
  }

  // Totals Row
  ensureSpace(30);
  y -= 2;
  currentPage.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: width - margin, y: y + 8 },
    thickness: 1,
    color: inkColor,
  });

  currentPage.drawText("TOTAL INCOME", {
    x: colCategory,
    y,
    size: 9.5,
    font: sansBold,
    color: inkColor,
  });
  currentPage.drawText(sanitizeForPdf(data.totals.cashFormatted), {
    x: colCash,
    y,
    size: 9.5,
    font: monoBold,
    color: inkColor,
  });
  currentPage.drawText(sanitizeForPdf(data.totals.momoFormatted), {
    x: colMomo,
    y,
    size: 9.5,
    font: monoBold,
    color: inkColor,
  });
  currentPage.drawText(sanitizeForPdf(data.totals.expectedFormatted), {
    x: colTotal,
    y,
    size: 9.5,
    font: monoBold,
    color: inkColor,
  });

  y -= 6;
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: inkColor,
  });
  y -= 20;

  // Variance & Book Comparison (if present)
  if (data.totals.bookFormatted) {
    ensureSpace(45);
    currentPage.drawText("PARALLEL RUN BOOK COMPARISON", {
      x: margin,
      y,
      size: 8,
      font: sansBold,
      color: softColor,
    });
    y -= 12;

    currentPage.drawText(
      sanitizeForPdf(
        `Paper Book Total: ${data.totals.bookFormatted}   -   System Expected: ${data.totals.expectedFormatted}   -   ${data.totals.varianceLabel || "Balanced"}`
      ),
      {
        x: margin,
        y,
        size: 8.5,
        font: monoRegular,
        color: inkColor,
      }
    );
    y -= 12;

    if (data.varianceReason) {
      currentPage.drawText(sanitizeForPdf(`Variance Reason: "${data.varianceReason}"`), {
        x: margin,
        y,
        size: 8.5,
        font: serifRegular,
        color: softColor,
      });
      y -= 14;
    }
    y -= 10;
  }

  // Phase 6: District Remittance Allocation Line
  if (data.districtAmountDueFormatted) {
    ensureSpace(35);
    currentPage.drawText("DISTRICT REMITTANCE OBLIGATION", {
      x: margin,
      y,
      size: 8,
      font: sansBold,
      color: softColor,
    });
    y -= 12;

    currentPage.drawText(
      sanitizeForPdf(
        `Amount Due to District: ${data.districtAmountDueFormatted}   (from active allocation rules)`
      ),
      {
        x: margin,
        y,
        size: 8.5,
        font: monoRegular,
        color: inkColor,
      }
    );
    y -= 16;
  }

  // Phase 5: Expenses table if present
  if (data.expenseCategories.length > 0 && data.expenseTotals) {
    ensureSpace(60);
    currentPage.drawText("DISBURSEMENTS & EXPENSES", {
      x: margin,
      y,
      size: 9,
      font: sansBold,
      color: softColor,
    });
    y -= 14;

    const expColName = margin;
    const expColCash = 250;
    const expColMomo = 330;
    const expColBank = 410;
    const expColTotal = 490;

    currentPage.drawText("Expense Category", { x: expColName, y, size: 8, font: sansBold, color: softColor });
    currentPage.drawText("Cash", { x: expColCash, y, size: 8, font: sansBold, color: softColor });
    currentPage.drawText("MoMo", { x: expColMomo, y, size: 8, font: sansBold, color: softColor });
    currentPage.drawText("Bank", { x: expColBank, y, size: 8, font: sansBold, color: softColor });
    currentPage.drawText("Total", { x: expColTotal, y, size: 8, font: sansBold, color: softColor });

    y -= 6;
    currentPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: ruleColor });
    y -= 12;

    for (const ec of data.expenseCategories) {
      ensureSpace(18);
      currentPage.drawText(sanitizeForPdf(ec.name), { x: expColName, y, size: 8, font: sansRegular, color: inkColor });
      currentPage.drawText(sanitizeForPdf(ec.cashFormatted), { x: expColCash, y, size: 8, font: monoRegular, color: inkColor });
      currentPage.drawText(sanitizeForPdf(ec.momoFormatted), { x: expColMomo, y, size: 8, font: monoRegular, color: inkColor });
      currentPage.drawText(sanitizeForPdf(ec.bankFormatted), { x: expColBank, y, size: 8, font: monoRegular, color: inkColor });
      currentPage.drawText(sanitizeForPdf(ec.totalFormatted), { x: expColTotal, y, size: 8, font: monoRegular, color: inkColor });

      y -= 5;
      currentPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: ruleColor });
      y -= 12;
    }

    // Expense totals
    ensureSpace(24);
    currentPage.drawText("TOTAL EXPENSES", { x: expColName, y, size: 8.5, font: sansBold, color: inkColor });
    currentPage.drawText(sanitizeForPdf(data.expenseTotals.cashFormatted), { x: expColCash, y, size: 8.5, font: monoBold, color: inkColor });
    currentPage.drawText(sanitizeForPdf(data.expenseTotals.momoFormatted), { x: expColMomo, y, size: 8.5, font: monoBold, color: inkColor });
    currentPage.drawText(sanitizeForPdf(data.expenseTotals.bankFormatted), { x: expColBank, y, size: 8.5, font: monoBold, color: inkColor });
    currentPage.drawText(sanitizeForPdf(data.expenseTotals.grandTotalFormatted), { x: expColTotal, y, size: 8.5, font: monoBold, color: inkColor });

    y -= 6;
    currentPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: inkColor });
    y -= 20;
  }

  // Phase 5: Banking & Held Funds section if present
  if (data.banking) {
    ensureSpace(60);
    currentPage.drawText("BANK DEPOSITS & HELD FUNDS", {
      x: margin,
      y,
      size: 9,
      font: sansBold,
      color: softColor,
    });
    y -= 12;

    if (data.banking.deposits.length > 0) {
      for (const d of data.banking.deposits) {
        ensureSpace(14);
        currentPage.drawText(
          sanitizeForPdf(`• ${d.dateFormatted}: ${d.kindLabel} (${d.amountFormatted}) Ref: ${d.bankReference}`),
          { x: margin + 8, y, size: 8, font: monoRegular, color: inkColor }
        );
        y -= 12;
      }
    } else {
      currentPage.drawText("No bank deposits were recorded during this week.", {
        x: margin + 8,
        y,
        size: 8,
        font: serifRegular,
        color: softColor,
      });
      y -= 12;
    }

    ensureSpace(20);
    currentPage.drawText(
      sanitizeForPdf(
        `Held at Week End: Cash Held: ${data.banking.cashHeldFormatted}   -   MoMo Held: ${data.banking.momoHeldFormatted}   -   Total Held: ${data.banking.totalHeldFormatted}`
      ),
      { x: margin, y, size: 8.5, font: monoBold, color: inkColor }
    );
    y -= 25;
  }

  // Submission info & Signatures
  ensureSpace(80);
  currentPage.drawText(
    sanitizeForPdf(
      `Prepared & Submitted by: ${data.preparedByName} on ${data.submittedAtFormatted} (Report v${data.version})`
    ),
    {
      x: margin,
      y,
      size: 8,
      font: sansRegular,
      color: softColor,
    }
  );
  y -= 40;

  // Signatures lines
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: margin + 200, y },
    thickness: 0.75,
    color: inkColor,
  });
  currentPage.drawLine({
    start: { x: width - margin - 200, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: inkColor,
  });
  y -= 12;

  currentPage.drawText("Finance Secretary Signature", {
    x: margin,
    y,
    size: 8,
    font: sansRegular,
    color: softColor,
  });
  currentPage.drawText("Parish Treasurer Signature", {
    x: width - margin - 200,
    y,
    size: 8,
    font: sansRegular,
    color: softColor,
  });

  return pdfDoc.save();
}
