import { prisma } from "@/server/db";
import { AppError } from "@/lib/errors";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Database-backed rate limiter for sensitive endpoints and actions.
 * Tracks usage points per key with an expiration window.
 */
export async function consumeRateLimit(
  key: string,
  maxPoints: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date();

  // Clean up expired attempts for this key
  await prisma.rateLimitAttempt
    .deleteMany({
      where: {
        key,
        expiresAt: { lt: now },
      },
    })
    .catch(() => {});

  // Aggregate current points within active window
  const aggregate = await prisma.rateLimitAttempt.aggregate({
    where: {
      key,
      expiresAt: { gte: now },
    },
    _sum: { points: true },
  });

  const currentPoints = aggregate._sum.points ?? 0;

  if (currentPoints >= maxPoints) {
    const nextExpiring = await prisma.rateLimitAttempt.findFirst({
      where: { key, expiresAt: { gte: now } },
      orderBy: { expiresAt: "asc" },
      select: { expiresAt: true },
    });

    const resetInSeconds = nextExpiring
      ? Math.max(1, Math.ceil((nextExpiring.expiresAt.getTime() - now.getTime()) / 1000))
      : windowSeconds;

    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  // Record this consumption
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  await prisma.rateLimitAttempt.create({
    data: {
      key,
      points: 1,
      expiresAt,
    },
  });

  return {
    allowed: true,
    remaining: Math.max(0, maxPoints - currentPoints - 1),
    resetInSeconds: windowSeconds,
  };
}

/**
 * Asserts rate limit, throwing AppError with clear user-facing message if exceeded.
 */
export async function assertRateLimit(
  key: string,
  maxPoints: number,
  windowSeconds: number,
  actionDescription: string = "requests"
): Promise<void> {
  const result = await consumeRateLimit(key, maxPoints, windowSeconds);

  if (!result.allowed) {
    throw new AppError(
      "FORBIDDEN",
      `Rate limit exceeded for ${actionDescription}. Please wait ${result.resetInSeconds} seconds before trying again.`
    );
  }
}
