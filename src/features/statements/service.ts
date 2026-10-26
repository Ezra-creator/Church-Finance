import { prisma } from "@/server/db";
import {
  Prisma,
  ServiceStatus,
  MomoTransactionStatus,
  ReconciliationStatus,
} from "@prisma/client";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { formatCedi } from "@/lib/money";
import { formatAccraDate, formatAccraDateTime, nowUtc } from "@/lib/dates";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface StatementLineItem {
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  categoryName: string;
  categoryCode: string;
  method: "CASH" | "MOMO";
  receiptOrRef: string | null;
  amount: Prisma.Decimal;
}

export interface StatementMonthSummary {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "January 2026"
  total: Prisma.Decimal;
}

export interface StatementCategorySummary {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  total: Prisma.Decimal;
}

export interface MemberGivingStatement {
  member: {
    id: string;
    fullName: string;
    memberNumber: string | null;
    phone: string | null;
  };
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string; // YYYY-MM-DD
  churchName: string;
  presbyteryName: string;
  items: StatementLineItem[];
  monthlyTotals: StatementMonthSummary[];
  categoryTotals: StatementCategorySummary[];
  grandTotal: Prisma.Decimal;
  generatedAt: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Normalizes string text so standard fonts in pdf-lib won't throw on special characters.
 */
function sanitizeForPdf(text: string): string {
  return text
    .replace(/[—–]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

/**
 * Builds the data model for a member's giving statement over a date range.
 * Strictly excludes unattributed giving (only records with exact memberId match).
 * Only includes cash giving in COUNTED or LOCKED service records,
 * and MoMo transactions matched to the member in locked or confirmed periods.
 */
export async function getMemberGivingStatement(
  memberId: string,
  rangeStartStr: string,
  rangeEndStr: string
): Promise<MemberGivingStatement> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new AppError("NOT_FOUND", "Member not found.");
  }

  const startDate = new Date(rangeStartStr + "T00:00:00.000Z");
  const endDate = new Date(rangeEndStr + "T23:59:59.999Z");

  const settings = await prisma.churchSettings.findUnique({
    where: { id: "singleton" },
  });

  // 1. Gather Cash Giving Entries strictly attributed to this member
  const cashEntries = await prisma.givingEntry.findMany({
    where: {
      memberId: member.id, // Strictly matched
      serviceRecord: {
        serviceDate: {
          gte: new Date(rangeStartStr + "T00:00:00.000Z"),
          lte: new Date(rangeEndStr + "T00:00:00.000Z"),
        },
        status: {
          in: [ServiceStatus.COUNTED, ServiceStatus.LOCKED],
        },
      },
    },
    include: {
      serviceRecord: true,
      category: true,
      receipt: true,
    },
    orderBy: {
      serviceRecord: { serviceDate: "asc" },
    },
  });

  // 2. Gather MoMo Giving Transactions strictly attributed to this member
  const momoTransactions = await prisma.momoTransaction.findMany({
    where: {
      memberId: member.id, // Strictly matched
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: [MomoTransactionStatus.CONFIRMED, MomoTransactionStatus.AUTO],
      },
      OR: [
        { locked: true },
        { period: { status: ReconciliationStatus.SUBMITTED } },
        { import: { rolledBackAt: null } },
      ],
    },
    include: {
      category: true,
    },
    orderBy: {
      occurredAt: "asc",
    },
  });

  // 3. Assemble and sort all line items
  const items: StatementLineItem[] = [];

  for (const entry of cashEntries) {
    const dStr = entry.serviceRecord.serviceDate.toISOString().slice(0, 10);
    const mKey = dStr.slice(0, 7);
    items.push({
      date: dStr,
      monthKey: mKey,
      categoryName: entry.category.name,
      categoryCode: entry.category.code,
      method: "CASH",
      receiptOrRef: entry.receipt?.number ?? null,
      amount: entry.amount,
    });
  }

  for (const tx of momoTransactions) {
    const dStr = tx.occurredAt.toISOString().slice(0, 10);
    const mKey = dStr.slice(0, 7);
    items.push({
      date: dStr,
      monthKey: mKey,
      categoryName: tx.category?.name ?? "General Offering",
      categoryCode: tx.category?.code ?? "OTHER",
      method: "MOMO",
      receiptOrRef: tx.externalRef ?? null,
      amount: tx.amount,
    });
  }

  // Sort chronologically
  items.sort((a, b) => a.date.localeCompare(b.date));

  // 4. Summaries by Month and Category
  const monthMap = new Map<string, Prisma.Decimal>();
  const categoryMap = new Map<
    string,
    { categoryId: string; categoryName: string; categoryCode: string; total: Prisma.Decimal }
  >();

  let grandTotal = new Prisma.Decimal(0);

  for (const item of items) {
    grandTotal = grandTotal.add(item.amount);

    // Monthly
    const curMonth = monthMap.get(item.monthKey) || new Prisma.Decimal(0);
    monthMap.set(item.monthKey, curMonth.add(item.amount));

    // Category
    const curCat = categoryMap.get(item.categoryCode) || {
      categoryId: item.categoryCode,
      categoryName: item.categoryName,
      categoryCode: item.categoryCode,
      total: new Prisma.Decimal(0),
    };
    curCat.total = curCat.total.add(item.amount);
    categoryMap.set(item.categoryCode, curCat);
  }

  const monthlyTotals: StatementMonthSummary[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mKey, total]) => {
      const [year, monthNum] = mKey.split("-");
      const mIdx = parseInt(monthNum, 10) - 1;
      const monthLabel = `${MONTH_NAMES[mIdx] || monthNum} ${year}`;
      return {
        monthKey: mKey,
        monthLabel,
        total,
      };
    });

  const categoryTotals: StatementCategorySummary[] = Array.from(
    categoryMap.values()
  ).sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return {
    member: {
      id: member.id,
      fullName: member.fullName,
      memberNumber: member.memberNumber,
      phone: member.phone,
    },
    rangeStart: rangeStartStr,
    rangeEnd: rangeEndStr,
    churchName: settings?.churchName || "Presbyterian Church of Ghana",
    presbyteryName: settings?.presbyteryName || "Local Presbytery",
    items,
    monthlyTotals,
    categoryTotals,
    grandTotal,
    generatedAt: nowUtc().toISOString(),
  };
}

/**
 * Generates a PDF document from a MemberGivingStatement model.
 */
export async function generateStatementPdf(
  statement: MemberGivingStatement
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = currentPage.getSize();
  const margin = 45;

  const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const ink = rgb(0.11, 0.11, 0.09); // #1C1B18
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
  currentPage.drawText(sanitizeForPdf(statement.churchName.toUpperCase()), {
    x: margin,
    y,
    size: 14,
    font: fontSerifBold,
    color: ink,
  });
  y -= 16;

  currentPage.drawText(
    sanitizeForPdf(`${statement.presbyteryName}  |  OFFICIAL GIVING STATEMENT`),
    {
      x: margin,
      y,
      size: 9,
      font: fontSansBold,
      color: inkSoft,
    }
  );
  y -= 12;

  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: ink,
  });
  y -= 20;

  // Member & Statement Metadata Box
  const memberNumStr = statement.member.memberNumber ? ` [ID: ${statement.member.memberNumber}]` : "";
  currentPage.drawText(sanitizeForPdf(`MEMBER: ${statement.member.fullName}${memberNumStr}`), {
    x: margin,
    y,
    size: 11,
    font: fontSansBold,
    color: ink,
  });

  const rangeFormatted = `${statement.rangeStart} to ${statement.rangeEnd}`;
  currentPage.drawText(sanitizeForPdf(`PERIOD: ${rangeFormatted}`), {
    x: width - margin - 180,
    y,
    size: 9.5,
    font: fontMonoBold,
    color: ink,
  });
  y -= 16;

  if (statement.member.phone) {
    currentPage.drawText(sanitizeForPdf(`Phone: ${statement.member.phone}`), {
      x: margin,
      y,
      size: 9,
      font: fontSans,
      color: inkSoft,
    });
  }

  currentPage.drawText(
    sanitizeForPdf(`Issued: ${formatAccraDate(new Date(statement.generatedAt))}`),
    {
      x: width - margin - 180,
      y,
      size: 8.5,
      font: fontSans,
      color: inkSoft,
    }
  );
  y -= 16;

  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: ruleColor,
  });
  y -= 16;

  // Category Summary Box
  currentPage.drawText("GIVING BY CATEGORY", {
    x: margin,
    y,
    size: 9,
    font: fontSansBold,
    color: inkSoft,
  });
  y -= 14;

  for (const cat of statement.categoryTotals) {
    ensureSpace(20);
    currentPage.drawText(sanitizeForPdf(cat.categoryName), {
      x: margin + 10,
      y,
      size: 9,
      font: fontSans,
      color: ink,
    });
    currentPage.drawText(sanitizeForPdf(formatCedi(cat.total)), {
      x: 350,
      y,
      size: 9.5,
      font: fontMonoBold,
      color: ink,
    });
    y -= 14;
  }
  y -= 6;

  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: ruleColor,
  });
  y -= 16;

  // Transactions Table Header
  currentPage.drawText("ITEMISED RECORD OF CONTRIBUTIONS", {
    x: margin,
    y,
    size: 9,
    font: fontSansBold,
    color: inkSoft,
  });
  y -= 16;

  const colDate = margin;
  const colMethod = margin + 75;
  const colCat = margin + 140;
  const colRef = margin + 290;
  const colAmt = width - margin - 70;

  currentPage.drawText("Date", { x: colDate, y, size: 8, font: fontSansBold, color: inkSoft });
  currentPage.drawText("Method", { x: colMethod, y, size: 8, font: fontSansBold, color: inkSoft });
  currentPage.drawText("Giving Category", { x: colCat, y, size: 8, font: fontSansBold, color: inkSoft });
  currentPage.drawText("Receipt / Ref", { x: colRef, y, size: 8, font: fontSansBold, color: inkSoft });
  currentPage.drawText("Amount", { x: colAmt, y, size: 8, font: fontSansBold, color: inkSoft });
  y -= 6;

  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: ink,
  });
  y -= 14;

  if (statement.items.length === 0) {
    currentPage.drawText("No verified giving recorded for this member during the specified period.", {
      x: margin,
      y,
      size: 9,
      font: fontSans,
      color: inkSoft,
    });
    y -= 20;
  } else {
    for (const item of statement.items) {
      ensureSpace(16);

      currentPage.drawText(sanitizeForPdf(item.date), {
        x: colDate,
        y,
        size: 8.5,
        font: fontMono,
        color: ink,
      });

      currentPage.drawText(item.method, {
        x: colMethod,
        y,
        size: 8,
        font: fontSans,
        color: inkSoft,
      });

      currentPage.drawText(sanitizeForPdf(item.categoryName.slice(0, 26)), {
        x: colCat,
        y,
        size: 8.5,
        font: fontSans,
        color: ink,
      });

      currentPage.drawText(sanitizeForPdf((item.receiptOrRef || "-").slice(0, 18)), {
        x: colRef,
        y,
        size: 8,
        font: fontMono,
        color: inkSoft,
      });

      currentPage.drawText(sanitizeForPdf(formatCedi(item.amount)), {
        x: colAmt,
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
      y -= 8;
    }
  }

  // Grand Total Line
  ensureSpace(40);
  y -= 8;
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: ink,
  });
  y -= 16;

  currentPage.drawText("TOTAL CONTRIBUTIONS:", {
    x: margin,
    y,
    size: 11,
    font: fontSansBold,
    color: ink,
  });

  currentPage.drawText(sanitizeForPdf(formatCedi(statement.grandTotal)), {
    x: colAmt - 30,
    y,
    size: 13,
    font: fontMonoBold,
    color: ink,
  });
  y -= 30;

  // Footer Authentication notice
  ensureSpace(40);
  currentPage.drawText(
    sanitizeForPdf("This is an official church financial record generated from the parish ledger system."),
    {
      x: margin,
      y,
      size: 8,
      font: fontSerif,
      color: inkSoft,
    }
  );

  return pdfDoc.save();
}

/**
 * Generates a statement for a member, creates a StatementLog entry,
 * writes an audit log, and returns the PDF buffer and statement data.
 */
export async function createAndLogMemberStatement(
  memberId: string,
  rangeStartStr: string,
  rangeEndStr: string,
  actorId: string
): Promise<{ statement: MemberGivingStatement; pdfBuffer: Uint8Array }> {
  const statement = await getMemberGivingStatement(
    memberId,
    rangeStartStr,
    rangeEndStr
  );
  const pdfBuffer = await generateStatementPdf(statement);

  const startDate = new Date(rangeStartStr + "T00:00:00.000Z");
  const endDate = new Date(rangeEndStr + "T00:00:00.000Z");

  await withAudit(async (tx) => {
    const log = await tx.statementLog.create({
      data: {
        memberId,
        rangeStart: startDate,
        rangeEnd: endDate,
        generatedById: actorId,
      },
    });

    return {
      result: log,
      audit: {
        actorId,
        action: "MEMBER_STATEMENT_GENERATED",
        entityType: "Member",
        entityId: memberId,
        after: {
          memberId,
          memberName: statement.member.fullName,
          rangeStart: rangeStartStr,
          rangeEnd: rangeEndStr,
          grandTotal: statement.grandTotal.toString(),
          itemCount: statement.items.length,
        },
      },
    };
  });

  return { statement, pdfBuffer };
}

/**
 * Bulk generation: creates a ZIP containing PDFs for all active members
 * who had verified giving in the specified year.
 * Writes a StatementLog and audit entry for each generated statement.
 */
export async function createBulkAnnualStatementsZip(
  year: number,
  actorId: string,
  options?: { memberIds?: string[] }
): Promise<{ zipBuffer: Buffer; countGenerated: number }> {
  const rangeStartStr = `${year}-01-01`;
  const rangeEndStr = `${year}-12-31`;

  const whereClause: Prisma.MemberWhereInput = {
    active: true,
    ...(options?.memberIds && options.memberIds.length > 0
      ? { id: { in: options.memberIds } }
      : {}),
  };

  const activeMembers = await prisma.member.findMany({
    where: whereClause,
    orderBy: { fullName: "asc" },
  });

  const zip = new JSZip();
  let countGenerated = 0;

  for (const member of activeMembers) {
    const statement = await getMemberGivingStatement(
      member.id,
      rangeStartStr,
      rangeEndStr
    );

    // Only include in annual batch if they gave in that year
    if (statement.items.length > 0) {
      const pdfBytes = await generateStatementPdf(statement);
      const safeName = member.fullName.replace(/[^a-zA-Z0-9]/g, "_");
      const idPrefix = member.memberNumber ? `${member.memberNumber}_` : "";
      const filename = `Giving_Statement_${year}_${idPrefix}${safeName}.pdf`;

      zip.file(filename, pdfBytes);
      countGenerated++;

      // Log generation with audit
      await withAudit(async (tx) => {
        const log = await tx.statementLog.create({
          data: {
            memberId: member.id,
            rangeStart: new Date(rangeStartStr + "T00:00:00.000Z"),
            rangeEnd: new Date(rangeEndStr + "T00:00:00.000Z"),
            generatedById: actorId,
          },
        });

        return {
          result: log,
          audit: {
            actorId,
            action: "MEMBER_STATEMENT_BULK_GENERATED",
            entityType: "Member",
            entityId: member.id,
            after: {
              year,
              memberId: member.id,
              memberName: member.fullName,
              grandTotal: statement.grandTotal.toString(),
            },
          },
        };
      });
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return { zipBuffer, countGenerated };
}

/**
 * Retrieves the statement generation history for a member.
 */
export async function getMemberStatementHistory(memberId: string) {
  return prisma.statementLog.findMany({
    where: { memberId },
    include: {
      generatedBy: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Returns a monthly giving matrix (12 months) for a given member and year.
 * Used for the member ledger detail screen.
 */
export async function getMemberAnnualLedger(memberId: string, year: number) {
  const startStr = `${year}-01-01`;
  const endStr = `${year}-12-31`;

  const statement = await getMemberGivingStatement(memberId, startStr, endStr);

  const months = MONTH_NAMES.map((name, index) => {
    const monthNum = String(index + 1).padStart(2, "0");
    const monthKey = `${year}-${monthNum}`;
    const monthItems = statement.items.filter((it) => it.monthKey === monthKey);

    let cashTotal = new Prisma.Decimal(0);
    let momoTotal = new Prisma.Decimal(0);
    let monthTotal = new Prisma.Decimal(0);

    for (const item of monthItems) {
      if (item.method === "CASH") {
        cashTotal = cashTotal.add(item.amount);
      } else {
        momoTotal = momoTotal.add(item.amount);
      }
      monthTotal = monthTotal.add(item.amount);
    }

    return {
      monthKey,
      monthName: name,
      cashTotal,
      momoTotal,
      total: monthTotal,
      items: monthItems,
    };
  });

  return {
    member: statement.member,
    year,
    months,
    categoryTotals: statement.categoryTotals,
    grandTotal: statement.grandTotal,
  };
}
