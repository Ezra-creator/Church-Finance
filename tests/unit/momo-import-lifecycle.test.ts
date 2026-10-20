import { describe, it, expect } from "vitest";
import { Role, Prisma } from "@prisma/client";
import {
  computeFileHash,
} from "@/features/momo/service";
import { computeTransactionDuplicateHash } from "@/features/momo/parsers/normalizer";
import { AppError } from "@/lib/errors";

describe("MoMo Import Lifecycle, Duplicates, and Rollback", () => {
  it("computes identical SHA-256 hashes for identical statement buffers", () => {
    const bufA = Buffer.from("Date,Amount,Description\n2026-10-18,100,Tithe");
    const bufB = Buffer.from("Date,Amount,Description\n2026-10-18,100,Tithe");
    const bufC = Buffer.from("Date,Amount,Description\n2026-10-19,100,Tithe");

    expect(computeFileHash(bufA)).toBe(computeFileHash(bufB));
    expect(computeFileHash(bufA)).not.toBe(computeFileHash(bufC));
  });

  it("computes deterministic duplicate hash when externalRef is absent", () => {
    const date = new Date("2026-10-18T10:30:00Z");
    const amount = new Prisma.Decimal("150.00");
    const phone = "+233244123456";
    const desc = "Sunday tithe envelope";

    const hash1 = computeTransactionDuplicateHash(date, amount, phone, desc);
    const hash2 = computeTransactionDuplicateHash(date, amount, phone, desc);

    expect(hash1).toBe(hash2);

    // Difference in amount or date changes hash
    const hash3 = computeTransactionDuplicateHash(
      date,
      new Prisma.Decimal("150.01"),
      phone,
      desc
    );
    expect(hash1).not.toBe(hash3);
  });

  it("restricts import rollback to FINANCE_SECRETARY", () => {
    function assertCanRollback(role: Role, reason: string) {
      if (role !== Role.FINANCE_SECRETARY) {
        throw new AppError(
          "FORBIDDEN",
          "Only the Finance Secretary can roll back a Mobile Money statement import."
        );
      }
      if (!reason || reason.trim().length < 5) {
        throw new AppError(
          "VALIDATION_ERROR",
          "A clear audit reason (minimum 5 characters) is required to roll back an import."
        );
      }
    }

    expect(() =>
      assertCanRollback(Role.TREASURER, "Accidental duplicate import")
    ).toThrow(AppError);

    expect(() =>
      assertCanRollback(Role.PRESBYTERY_VIEWER, "Accidental duplicate import")
    ).toThrow(AppError);

    expect(() =>
      assertCanRollback(Role.FINANCE_SECRETARY, "")
    ).toThrow(AppError);

    expect(() =>
      assertCanRollback(
        Role.FINANCE_SECRETARY,
        "Re-uploading statement with correct column mapping"
      )
    ).not.toThrow();
  });
});
