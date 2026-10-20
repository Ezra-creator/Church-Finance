import { NextRequest, NextResponse } from "next/server";
import { Role, ReconciliationStatus } from "@prisma/client";
import { requireUser } from "@/server/guards";
import { getReconciliationPeriodById } from "@/features/reconciliation/queries";
import {
  buildReportData,
  ReconciliationSnapshot,
} from "@/features/reconciliation/report-data";
import { generateReconciliationDocx } from "@/features/reconciliation/exports/docx-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const period = await getReconciliationPeriodById(id);
    if (!period) {
      return new NextResponse("Reconciliation period not found.", { status: 404 });
    }

    // Presbytery Viewer can only access submitted reports
    if (
      user.role === Role.PRESBYTERY_VIEWER &&
      period.status !== ReconciliationStatus.SUBMITTED
    ) {
      return new NextResponse(
        "Presbytery Viewers are permitted to download finalized, submitted reports only.",
        { status: 403 }
      );
    }

    if (!period.snapshot || typeof period.snapshot !== "object") {
      return new NextResponse(
        "Report snapshot has not been finalized yet. The period must be submitted to produce a signed report.",
        { status: 400 }
      );
    }

    const reportData = buildReportData(period.snapshot as unknown as ReconciliationSnapshot);
    const buffer = await generateReconciliationDocx(reportData);

    const filename = `${reportData.filenameBase}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-transform",
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message || "Internal server error.", {
      status: 500,
    });
  }
}
