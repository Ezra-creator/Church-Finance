import { describe, it, expect, vi } from "vitest";
import { DepositKind, DepositStatus, Role } from "@prisma/client";
import { recordDepositSchema } from "@/features/deposits/schemas";
import { confirmDeposit } from "@/features/deposits/service";
import { AppError } from "@/lib/errors";
import { prisma } from "@/server/db";
import { buildDepositFixture } from "../factories/deposit.factory";

describe("Deposit Lifecycle & Validation", () => {
  it("enforces slip attachment requirement for cash deposits in schema", () => {
    // Missing attachmentId for CASH_DEPOSIT
    const invalidCashDeposit = {
      depositDate: "2026-10-21",
      kind: DepositKind.CASH_DEPOSIT,
      amount: "500.00",
      bankReference: "SLIP-9988",
      carriedById: "user_sec",
      attachmentId: null,
    };

    const res = recordDepositSchema.safeParse(invalidCashDeposit);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("deposit slip photo is required for cash deposits");
    }

    // Valid CASH_DEPOSIT with attachmentId
    const validCashDeposit = {
      ...invalidCashDeposit,
      attachmentId: "att_slip_123",
    };
    expect(recordDepositSchema.safeParse(validCashDeposit).success).toBe(true);
  });

  it("permits MoMo bank transfers without slip attachment", () => {
    const validMomoTransfer = {
      depositDate: "2026-10-21",
      kind: DepositKind.MOMO_TRANSFER,
      amount: "1200.00",
      bankReference: "TRANSFER-REF-100",
      carriedById: "user_sec",
      attachmentId: null,
    };

    const res = recordDepositSchema.safeParse(validMomoTransfer);
    expect(res.success).toBe(true);
  });

  it("restricts deposit confirmation strictly to Treasurer role", async () => {
    await expect(
      confirmDeposit("dep_1", "user_sec", Role.FINANCE_SECRETARY)
    ).rejects.toThrow("Only the Treasurer can confirm bank deposits.");
  });

  it("prevents re-confirming already confirmed deposits (immutability)", async () => {
    const confirmedFixture = buildDepositFixture({
      id: "dep_confirmed_1",
      status: DepositStatus.CONFIRMED,
    });

    vi.spyOn(prisma.deposit, "findUnique").mockResolvedValueOnce(confirmedFixture);

    await expect(
      confirmDeposit("dep_confirmed_1", "user_treasurer", Role.TREASURER)
    ).rejects.toThrow("This deposit has already been confirmed.");
  });
});
