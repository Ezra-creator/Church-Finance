import { NextRequest, NextResponse } from "next/server";
import { requireSecretaryOrTreasurer } from "@/server/guards";
import { createBulkAnnualStatementsZip } from "@/features/statements/service";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSecretaryOrTreasurer();
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear();

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year parameter." }, { status: 400 });
    }

    const { zipBuffer, countGenerated } = await createBulkAnnualStatementsZip(
      year,
      user.id
    );

    const filename = `Giving_Statements_${year}_Bulk_${countGenerated}_members.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate bulk statements." },
      { status: 500 }
    );
  }
}
