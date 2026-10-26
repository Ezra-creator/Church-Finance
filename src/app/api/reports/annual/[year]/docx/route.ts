import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/guards";
import { getAnnualReportData } from "@/features/annual/service";
import { generateAnnualDocxBuffer } from "@/features/annual/exports/annual-docx";
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
    const docxBuffer = await generateAnnualDocxBuffer(data);

    const filename = `PUCA_Annual_Report_${year}.docx`;

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}
