import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import { verifyCredentials, MAX_FAILED_ATTEMPTS } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

describe("Account Lockout Logic", () => {
  const testEmail = "lockout-test@puca.local";
  const validPassword = "CorrectPassword123#";
  let precomputedHash: string;

  beforeAll(async () => {
    precomputedHash = await bcrypt.hash(validPassword, 12);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    await prisma.user.create({
      data: {
        name: "Lockout Tester",
        email: testEmail,
        passwordHash: precomputedHash,
        role: Role.TREASURER,
        active: true,
        mustChangePassword: false,
        failedLogins: 0,
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  it("increments failedLogins on invalid password and locks account on 5th attempt", async () => {
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      try {
        await verifyCredentials(testEmail, "WrongPassword");
        expect.unreachable("Expected invalid credentials error");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe("INVALID_CREDENTIALS");
        expect((err as AppError).message).toBe("Email or password is incorrect.");
      }

      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      expect(user?.failedLogins).toBe(i);
      expect(user?.lockedUntil).toBeNull();
    }

    // 5th attempt: triggers lockout
    try {
      await verifyCredentials(testEmail, "WrongPassword");
      expect.unreachable("Expected account locked error");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("ACCOUNT_LOCKED");
      expect((err as AppError).message).toContain("temporarily locked");
    }

    const lockedUser = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(lockedUser?.failedLogins).toBe(5);
    expect(lockedUser?.lockedUntil).not.toBeNull();

    const minutesRemaining =
      (lockedUser!.lockedUntil!.getTime() - Date.now()) / (60 * 1000);
    expect(minutesRemaining).toBeGreaterThan(14);
    expect(minutesRemaining).toBeLessThanOrEqual(15);
  });

  it("blocks subsequent attempts while account is locked, even with correct password", async () => {
    await prisma.user.update({
      where: { email: testEmail },
      data: {
        failedLogins: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await expect(
      verifyCredentials(testEmail, validPassword)
    ).rejects.toThrowError("Account is temporarily locked");
  });

  it("resets failedLogins on successful login", async () => {
    await prisma.user.update({
      where: { email: testEmail },
      data: { failedLogins: 3 },
    });

    const user = await verifyCredentials(testEmail, validPassword);
    expect(user.failedLogins).toBe(0);
    expect(user.lockedUntil).toBeNull();
    expect(user.lastLoginAt).not.toBeNull();
  });
});
