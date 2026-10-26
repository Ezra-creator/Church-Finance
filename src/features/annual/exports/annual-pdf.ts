import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCedi } from "@/lib/money";
import { AnnualReportData, MONTH_NAMES_SHORT } from "../service";

function sanitizeForPdf(text: string): string {
  return text
    .replace(/[—–]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

export async function generateAnnualPdfBuffer(data: AnnualReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = currentPage.getSize();
  const margin = 40;

  const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const ink = rgb(0.11, 0.11, 0.09);
  const inkSoft = rgb(0.45, 0.44, 0.41);
  const ruleColor = rgb(0.85, 0.83, 0.79);

  let y = height - margin;

  const ensureSpace = (required: number) => {
    if (y < margin + required) {
      currentPage = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }
  };

  // Header
  currentPage.drawText(sanitizeForPdf(data.churchName.toUpperCase()), {
    x: margin,
    y,
    size: 13,
    font: fontSerifBold,
    color: ink,
  });
  y -= 15;

  currentPage.drawText(
    sanitizeForPdf(`${data.presbyteryName}  |  ANNUAL FINANCIAL REPORT - ${data.year}`),
    {
      x: margin,
      y,
      size: 9,
      font: fontSansBold,
      color: inkSoft,
    }
  );
  y -= 10;

  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: ink,
  });
  y -= 18;

  // 1. Annual Income Summary
  currentPage.drawText("1. ANNUAL INCOME BY CATEGORY", {
    x: margin,
    y,
    size: 9,
    font: fontSansBold,
    color: inkSoft,
  });
  y -= 14;

  const colCat = margin;
  const colTotal = width - margin - 80;

  for (const cat of data.income.categories) {
    ensureSpace(16);
    currentPage.drawText(sanitizeForPdf(cat.categoryName), {
      x: colCat,
      y,
      size: 8.5,
      font: fontSans,
      color: ink,
    });
    currentPage.drawText(sanitizeForPdf(formatCedi(cat.rowTotal)), {
      x: colTotal,
      y,
      size: 8.5,
      font: fontMonoBold,
      color: ink,
    });
    y -= 12;
    currentPage.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.25,
      color: ruleColor,
    });
    y -= 4;
  }

  // Total Income Row
  ensureSpace(20);
  currentPage.drawText("TOTAL ANNUAL INCOME", {
    x: colCat,
    y,
    size: 9,
    font: fontSansBold,
    color: ink,
  });
  currentPage.drawText(sanitizeForPdf(formatCedi(data.income.grandTotal)), {
    x: colTotal,
    y,
    size: 9.5,
    font: fontMonoBold,
    color: ink,
  });
  y -= 16;

  // 2. Disbursements & Expenses
  ensureSpace(40);
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: ink,
  });
  y -= 16;

  currentPage.drawText("2. ANNUAL DISBURSEMENTS & EXPENSES", {
    x: margin,
    y,
    size: 9,
    font: fontSansBold,
    color: inkSoft,
  });
  y -= 14;

  if (data.expenses.categories.length === 0) {
    currentPage.drawText("No recorded expense disbursements for this year.", {
      x: margin,
      y,
      size: 8.5,
      font: fontSans,
      color: inkSoft,
    });
    y -= 16;
  } else {
    for (const exp of data.expenses.categories) {
      ensureSpace(16);
      currentPage.drawText(sanitizeForPdf(exp.categoryName), {
        x: colCat,
        y,
        size: 8.5,
        font: fontSans,
        color: ink,
      });
      currentPage.drawText(sanitizeForPdf(formatCedi(exp.totalAmount)), {
        x: colTotal,
        y,
        size: 8.5,
        font: fontMonoBold,
        color: ink,
      });
      y -= 12;
      currentPage.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.25,
        color: ruleColor,
      });
      y -= 4;
    }

    // Total Expenses Row
    ensureSpace(20);
    currentPage.drawText("TOTAL ANNUAL DISBURSEMENTS", {
      x: colCat,
      y,
      size: 9,
      font: fontSansBold,
      color: ink,
    });
    currentPage.drawText(sanitizeForPdf(formatCedi(data.expenses.grandTotal)), {
      x: colTotal,
      y,
      size: 9.5,
      font: fontMonoBold,
      color: ink,
    });
    y -= 18;
  }

  // 3. Banking & District Obligations
  ensureSpace(60);
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: ink,
  });
  y -= 16;

  currentPage.drawText("3. BANKING & DISTRICT ALLOCATIONS", {
    x: margin,
    y,
    size: 9,
    font: fontSansBold,
    color: inkSoft,
  });
  y -= 14;

  currentPage.drawText(
    sanitizeForPdf(
      `Total Deposited to Bank: ${formatCedi(data.deposits.totalDeposited)}  (Cash: ${formatCedi(data.deposits.cashDepositsTotal)} | MoMo: ${formatCedi(data.deposits.momoTransfersTotal)})`
    ),
    {
      x: margin,
      y,
      size: 8.5,
      font: fontMono,
      color: ink,
    }
  );
  y -= 14;

  currentPage.drawText(
    sanitizeForPdf(
      `District Remittance Due: ${formatCedi(data.districtRemittance.totalDue)}   Paid: ${formatCedi(data.districtRemittance.totalPaid)}   Outstanding: ${formatCedi(data.districtRemittance.totalOutstanding)}`
    ),
    {
      x: margin,
      y,
      size: 8.5,
      font: fontMono,
      color: ink,
    }
  );
  y -= 20;

  // 4. Net Operating Position
  ensureSpace(45);
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: ink,
  });
  y -= 16;

  currentPage.drawText("ANNUAL NET OPERATING POSITION", {
    x: margin,
    y,
    size: 10,
    font: fontSansBold,
    color: ink,
  });

  currentPage.drawText(sanitizeForPdf(formatCedi(data.netOperatingSurplus)), {
    x: colTotal - 20,
    y,
    size: 11,
    font: fontMonoBold,
    color: ink,
  });
  y -= 30;

  // Authentication & Signatures
  ensureSpace(40);
  currentPage.drawText("Finance Secretary Signature: __________________     Parish Treasurer Signature: __________________", {
    x: margin,
    y,
    size: 8,
    font: fontSans,
    color: inkSoft,
  });

  return pdfDoc.save();
}
