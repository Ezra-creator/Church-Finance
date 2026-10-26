import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredIdempotencyKeys } from "@/features/idempotency/service";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await cleanupExpiredIdempotencyKeys();
    return NextResponse.json({
      success: true,
      cleanedKeys: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to cleanup expired idempotency keys." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
