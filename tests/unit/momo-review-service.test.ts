import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import {
  classifySingleTransactionSchema,
  bulkClassifyTransactionsSchema,
  rollbackImportSchema,
  createClassificationRuleSchema,
} from "@/features/momo/schemas";
import { normalizeDescription } from "@/features/momo/classification/engine";

describe("MoMo Review and Rollback Schemas & Validation", () => {
  it("validates classifySingleTransaction input with optional rememberRule", () => {
    const valid = classifySingleTransactionSchema.safeParse({
      transactionId: "tx_123",
      categoryId: "cat_456",
      rememberRule: true,
    });
    expect(valid.success).toBe(true);

    const missingTx = classifySingleTransactionSchema.safeParse({
      transactionId: "",
      categoryId: "cat_456",
    });
    expect(missingTx.success).toBe(false);
  });

  it("validates bulkClassifyTransactions requiring at least one transactionId", () => {
    const emptyBatch = bulkClassifyTransactionsSchema.safeParse({
      transactionIds: [],
      categoryId: "cat_456",
    });
    expect(emptyBatch.success).toBe(false);

    const validBatch = bulkClassifyTransactionsSchema.safeParse({
      transactionIds: ["tx_1", "tx_2", "tx_3"],
      categoryId: "cat_456",
    });
    expect(validBatch.success).toBe(true);
    if (validBatch.success) {
      expect(validBatch.data.transactionIds.length).toBe(3);
    }
  });

  it("enforces rollback reason of at least 5 characters", () => {
    const shortReason = rollbackImportSchema.safeParse({
      importId: "import_123",
      reason: "bad",
    });
    expect(shortReason.success).toBe(false);

    const validRollback = rollbackImportSchema.safeParse({
      importId: "import_123",
      reason: "Wrong bank statement uploaded by mistake.",
    });
    expect(validRollback.success).toBe(true);
  });

  it("creates rule from learned wording after normalisation", () => {
    const rawNarration = "Tithe & Offering for October 2026!";
    const normalized = normalizeDescription(rawNarration);
    expect(normalized).toBe("tithe offering for october 2026");

    const ruleParsed = createClassificationRuleSchema.safeParse({
      pattern: normalized,
      matchType: "CONTAINS_WORD",
      categoryId: "cat_tithe",
      priority: 5,
      active: true,
    });
    expect(ruleParsed.success).toBe(true);
  });
});
