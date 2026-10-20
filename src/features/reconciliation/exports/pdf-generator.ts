import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ReconciliationReportData } from "../report-data";

function sanitizeForPdf(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/GH[₵c]/g, "GHS ")
    .replace(/₵/g, "GHS ")
    .replace(/•/g, "-")
    .replace(/—/g, "-");
}

/**
 * Generates a clean, serverless-compatible PDF document from ReconciliationReportData.
 */
export async function generateReconciliationPdf(
  data: ReconciliationReportData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
  const { width, height } = page.getSize();

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

  // Church Name (Serif heading)
  page.drawText(sanitizeForPdf(data.churchName), {
    x: margin,
    y: y - 18,
    size: 20,
    font: serifBold,
    color: inkColor,
  });
  y -= 32;

  // Presbytery Name
  page.drawText(sanitizeForPdf(data.presbyteryName.toUpperCase()), {
    x: margin,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  y -= 16;

  // Week range subtitle
  page.drawText(sanitizeForPdf(`WEEKLY FINANCIAL RETURN • ${data.weekRange}`), {
    x: margin,
    y,
    size: 10,
    font: sansRegular,
    color: inkColor,
  });
  y -= 25;

  // Hairline rule above table
  page.drawLine({
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

  page.drawText("Giving Category", {
    x: colCategory,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  page.drawText("Cash Counted", {
    x: colCash,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  page.drawText("Mobile Money", {
    x: colMomo,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  page.drawText("Total Received", {
    x: colTotal,
    y,
    size: 9,
    font: sansBold,
    color: softColor,
  });
  y -= 10;

  // Line below header
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: ruleColor,
  });
  y -= 16;

  // Table rows
  for (const row of data.incomeCategories) {
    page.drawText(sanitizeForPdf(row.name), {
      x: colCategory,
      y,
      size: 9.5,
      font: sansRegular,
      color: inkColor,
    });
    page.drawText(sanitizeForPdf(row.cashFormatted), {
      x: colCash,
      y,
      size: 9.5,
      font: monoRegular,
      color: inkColor,
    });
    page.drawText(sanitizeForPdf(row.momoFormatted), {
      x: colMomo,
      y,
      size: 9.5,
      font: monoRegular,
      color: inkColor,
    });
    page.drawText(sanitizeForPdf(row.totalFormatted), {
      x: colTotal,
      y,
      size: 9.5,
      font: monoRegular,
      color: inkColor,
    });

    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: ruleColor,
    });
    y -= 14;
  }

  // Totals Row
  y -= 2;
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: width - margin, y: y + 8 },
    thickness: 1,
    color: inkColor,
  });

  page.drawText("TOTAL INCOME", {
    x: colCategory,
    y,
    size: 10,
    font: sansBold,
    color: inkColor,
  });
  page.drawText(sanitizeForPdf(data.totals.cashFormatted), {
    x: colCash,
    y,
    size: 10,
    font: monoBold,
    color: inkColor,
  });
  page.drawText(sanitizeForPdf(data.totals.momoFormatted), {
    x: colMomo,
    y,
    size: 10,
    font: monoBold,
    color: inkColor,
  });
  page.drawText(sanitizeForPdf(data.totals.expectedFormatted), {
    x: colTotal,
    y,
    size: 10,
    font: monoBold,
    color: inkColor,
  });

  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: inkColor,
  });
  y -= 25;

  // Variance & Book Comparison (if present)
  if (data.totals.bookFormatted) {
    page.drawText("PARALLEL RUN BOOK COMPARISON", {
      x: margin,
      y,
      size: 8.5,
      font: sansBold,
      color: softColor,
    });
    y -= 14;

    page.drawText(
      sanitizeForPdf(
        `Recorded in Paper Books: ${data.totals.bookFormatted}   -   System Expected: ${data.totals.expectedFormatted}   -   ${data.totals.varianceLabel || "Balanced"}`
      ),
      {
        x: margin,
        y,
        size: 9,
        font: monoRegular,
        color: inkColor,
      }
    );
    y -= 14;

    if (data.varianceReason) {
      page.drawText(sanitizeForPdf(`Variance Reason: "${data.varianceReason}"`), {
        x: margin,
        y,
        size: 9,
        font: serifRegular,
        color: softColor,
      });
      y -= 16;
    }
    y -= 15;
  }

  // Submission info
  page.drawText(
    sanitizeForPdf(
      `Prepared & Submitted by: ${data.preparedByName} on ${data.submittedAtFormatted} (Report v${data.version})`
    ),
    {
      x: margin,
      y,
      size: 8.5,
      font: sansRegular,
      color: softColor,
    }
  );
  y -= 45;

  // Signatures
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 200, y },
    thickness: 0.75,
    color: inkColor,
  });
  page.drawLine({
    start: { x: width - margin - 200, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: inkColor,
  });
  y -= 14;

  page.drawText("Finance Secretary Signature", {
    x: margin,
    y,
    size: 8.5,
    font: sansRegular,
    color: softColor,
  });
  page.drawText("Parish Treasurer Signature", {
    x: width - margin - 200,
    y,
    size: 8.5,
    font: sansRegular,
    color: softColor,
  });

  return pdfDoc.save();
}
