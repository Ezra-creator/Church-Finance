import { NextRequest, NextResponse } from "next/server";
import { requireSecretaryOrTreasurer } from "@/server/guards";
import { createAndLogMemberStatement } from "@/features/statements/service";
import { AppError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSecretaryOrTreasurer();
    const { id: memberId } = await params;

    const { searchParams } = new URL(request.url);
    const currentYear = new Date().getUTCFullYear();
    const from = searchParams.get("from") || `${currentYear}-01-01`;
    const to = searchParams.get("to") || `${currentYear}-12-31`;

    const { statement, pdfBuffer } = await createAndLogMemberStatement(
      memberId,
      from,
      to,
      user.id
    );

    const safeName = statement.member.fullName.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Statement_${from}_to_${to}_${safeName}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "NOT_FOUND" ? 404 : 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate statement." },
      { status: 500 }
    );
  }
}
