import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/lib/errors";

export interface IdempotencyRecord<T = unknown> {
  key: string;
  userId: string;
  operation: string;
  response: T;
  createdAt: Date;
}

/**
 * Checks if a valid, unexpired idempotency record already exists for the given key.
 * If found and matches the same user and operation, returns the cached response.
 * If found but with a mismatched user or operation, throws a CONFLICT AppError.
 */
export async function checkIdempotentRequest<T = unknown>(
  key: string,
  userId: string,
  operation: string
): Promise<T | null> {
  if (!key || key.trim() === "") return null;

  const record = await prisma.idempotencyKey.findUnique({
    where: { key },
  });

  if (!record) return null;

  // Key expired
  if (record.expiresAt < new Date()) {
    await prisma.idempotencyKey.delete({ where: { key } }).catch(() => {});
    return null;
  }

  // Key collision with different user or operation
  if (record.userId !== userId || record.operation !== operation) {
    throw new AppError(
      "CONFLICT",
      "Idempotency key collision detected for different user or operation."
    );
  }

  return record.responseJson as T;
}

/**
 * Saves the response of a completed operation within an active transaction.
 * Defaults to a 48-hour expiration window.
 */
export async function saveIdempotentResponse<T>(
  tx: Prisma.TransactionClient,
  key: string,
  userId: string,
  operation: string,
  response: T,
  ttlHours: number = 48
): Promise<void> {
  if (!key || key.trim() === "") return;

  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await tx.idempotencyKey.upsert({
    where: { key },
    create: {
      key,
      userId,
      operation,
      responseJson: response as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
    update: {
      operation,
      responseJson: response as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
  });
}

/**
 * Routine cleanup of expired idempotency keys.
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  const result = await prisma.idempotencyKey.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
