import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/guards";
import { getAnnualReportData } from "@/features/annual/service";
import { generateAnnualPdfBuffer } from "@/features/annual/exports/annual-pdf";
import { AppError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  try {
    await requireUser();
    const { year: yearStr } = await params;
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year parameter." }, { status: 400 });
    }

    const data = await getAnnualReportData(year);
    const pdfBytes = await generateAnnualPdfBuffer(data);

    const filename = `PUCA_Annual_Report_${year}.pdf`;

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}
