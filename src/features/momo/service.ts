import crypto from "crypto";
import {
  MomoImport,
  MomoTransaction,
  ClassificationRule,
  ParserProfile,
  Role,
  StatementFileType,
  MomoTransactionStatus,
  RuleMatchType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import {
  ParserProfileConfig,
  NormalizedStatementRow,
  ParseRowError,
} from "./parsers/types";
import {
  getStatementParser,
  validateAndDetectStatementFile,
} from "./parsers/registry";
import { computeTransactionDuplicateHash } from "./parsers/normalizer";
import {
  classifyTransaction,
  normalizeDescription,
  detectRuleConflicts,
} from "./classification/engine";
import {
  ClassifySingleTransactionInput,
  BulkClassifyTransactionsInput,
  CreateClassificationRuleInput,
  UpdateClassificationRuleInput,
  RollbackImportInput,
  CreateParserProfileInput,
} from "./schemas";

export interface ImportPreviewResult {
  fileName: string;
  fileHash: string;
  fileType: StatementFileType;
  rowsTotal: number;
  rowsValid: number;
  rowsDuplicate: number;
  rowsSkipped: number;
  periodStart: string | null;
  periodEnd: string | null;
  previewRows: Array<{
    rowIndex: number;
    occurredAt: string;
    direction: string;
    amount: string;
    externalRef: string | null;
    rawDescription: string;
    counterpartyName: string | null;
    counterpartyPhone: string | null;
    prospectiveCategory: { id: string; name: string } | null;
    prospectiveStatus: MomoTransactionStatus;
    matchedMember: { id: string; fullName: string } | null;
    isDuplicate: boolean;
  }>;
  errors: ParseRowError[];
}

/**
 * Calculates SHA-256 hash of a file buffer to uniquely identify statement files.
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export interface StatementFileInspection {
  fileName: string;
  fileType: StatementFileType;
  headers: string[];
  sampleRows: Record<string, string>[];
}

/**
 * Inspects a statement file to discover columns and sample rows for mapping.
 */
export async function inspectStatementFile(
  buffer: Buffer,
  fileName: string,
  headerRow: number = 1
): Promise<StatementFileInspection> {
  const fileType = validateAndDetectStatementFile(fileName, buffer.length);
  const parser = getStatementParser(fileType);
  const { headers, sampleRows } = await parser.inspect(buffer, headerRow);

  return {
    fileName,
    fileType,
    headers,
    sampleRows,
  };
}

/**
 * Previews statement import without writing any records to the database.
 */
export async function previewImport(
  buffer: Buffer,
  fileName: string,
  profile: ParserProfileConfig
): Promise<ImportPreviewResult> {
  const fileType = validateAndDetectStatementFile(fileName, buffer.length);
  const fileHash = computeFileHash(buffer);

  // Check if this exact file has already been imported and not rolled back
  const existingImport = await prisma.momoImport.findFirst({
    where: {
      fileHash,
      rolledBackAt: null,
    },
  });

  if (existingImport) {
    throw new AppError(
      "CONFLICT",
      `The file "${fileName}" has already been imported into PUCA Finance on ${existingImport.createdAt.toLocaleDateString()}. Duplicate file uploads are prevented.`
    );
  }

  // Parse using the polymorphic parser
  const parser = getStatementParser(fileType);
  const parsed = await parser.parse(buffer, profile);

  // Fetch active classification rules, members, and categories for preview
  const [activeRules, activeMembers, categories] = await Promise.all([
    prisma.classificationRule.findMany({
      where: { active: true },
      orderBy: { priority: "asc" },
    }),
    prisma.member.findMany({
      where: { active: true },
      select: { id: true, fullName: true, phone: true },
    }),
    prisma.givingCategory.findMany({
      where: { active: true },
    }),
  ]);

  const memberPhoneMap = new Map<string, { id: string; fullName: string }>();
  for (const m of activeMembers) {
    if (m.phone) memberPhoneMap.set(m.phone, { id: m.id, fullName: m.fullName });
  }

  const categoryMap = new Map<string, { id: string; name: string }>();
  for (const c of categories) {
    categoryMap.set(c.id, { id: c.id, name: c.name });
  }

  // Pre-load externalRefs and duplicate hashes for duplicate detection
  const externalRefs = parsed.rows
    .map((r) => r.externalRef)
    .filter((ref): ref is string => ref !== null);

  const existingExternalRefs = new Set<string>();
  if (externalRefs.length > 0) {
    const existing = await prisma.momoTransaction.findMany({
      where: { externalRef: { in: externalRefs } },
      select: { externalRef: true },
    });
    for (const item of existing) {
      if (item.externalRef) existingExternalRefs.add(item.externalRef);
    }
  }

  // Compute duplicate hashes for rows lacking an external reference
  const rowsNeedingHash = parsed.rows.filter((r) => !r.externalRef);
  const duplicateHashes = rowsNeedingHash.map((r) =>
    computeTransactionDuplicateHash(
      r.occurredAt,
      r.amount,
      r.counterpartyPhone,
      r.rawDescription
    )
  );

  const existingHashes = new Set<string>();
  if (duplicateHashes.length > 0) {
    const existing = await prisma.momoTransaction.findMany({
      where: { duplicateHash: { in: duplicateHashes } },
      select: { duplicateHash: true },
    });
    for (const item of existing) {
      if (item.duplicateHash) existingHashes.add(item.duplicateHash);
    }
  }

  let duplicateCount = 0;
  const previewRows: ImportPreviewResult["previewRows"] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const r = parsed.rows[i];

    let isDuplicate = false;
    if (r.externalRef) {
      isDuplicate = existingExternalRefs.has(r.externalRef);
    } else {
      const hash = computeTransactionDuplicateHash(
        r.occurredAt,
        r.amount,
        r.counterpartyPhone,
        r.rawDescription
      );
      isDuplicate = existingHashes.has(hash);
    }

    if (isDuplicate) {
      duplicateCount++;
    }

    // Include the first 25 rows in the prospective preview
    if (previewRows.length < 25) {
      const matchedMember = r.counterpartyPhone
        ? memberPhoneMap.get(r.counterpartyPhone) || null
        : null;

      const classification = classifyTransaction(
        r.direction,
        r.rawDescription,
        activeRules
      );

      previewRows.push({
        rowIndex: r.rowIndex,
        occurredAt: r.occurredAt.toISOString(),
        direction: r.direction,
        amount: r.amount.toFixed(2),
        externalRef: r.externalRef,
        rawDescription: r.rawDescription,
        counterpartyName: r.counterpartyName,
        counterpartyPhone: r.counterpartyPhone,
        prospectiveCategory: classification.categoryId
          ? categoryMap.get(classification.categoryId) || null
          : null,
        prospectiveStatus: classification.status,
        matchedMember,
        isDuplicate,
      });
    }
  }

  const rowsTotal = parsed.rows.length + parsed.errors.length;
  const rowsValid = parsed.rows.length - duplicateCount;

  return {
    fileName,
    fileHash,
    fileType,
    rowsTotal,
    rowsValid,
    rowsDuplicate: duplicateCount,
    rowsSkipped: parsed.errors.length,
    periodStart: parsed.periodStart?.toISOString() || null,
    periodEnd: parsed.periodEnd?.toISOString() || null,
    previewRows,
    errors: parsed.errors,
  };
}

/**
 * Commits a parsed statement import transactionally into the database.
 */
export async function commitImport(
  buffer: Buffer,
  fileName: string,
  profile: ParserProfileConfig,
  actorId: string
): Promise<MomoImport> {
  const fileType = validateAndDetectStatementFile(fileName, buffer.length);
  const fileHash = computeFileHash(buffer);

  const parser = getStatementParser(fileType);
  const parsed = await parser.parse(buffer, profile);

  if (parsed.rows.length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "No valid transaction rows found in the uploaded statement."
    );
  }

  // Pre-load rules and members for classification & phone matching
  const [activeRules, activeMembers] = await Promise.all([
    prisma.classificationRule.findMany({
      where: { active: true },
      orderBy: { priority: "asc" },
    }),
    prisma.member.findMany({
      where: { active: true },
      select: { id: true, phone: true },
    }),
  ]);

  const memberPhoneMap = new Map<string, string>();
  for (const m of activeMembers) {
    if (m.phone) memberPhoneMap.set(m.phone, m.id);
  }

  return withAudit(async (tx) => {
    // Verify fileHash has not been inserted concurrently
    const existing = await tx.momoImport.findFirst({
      where: { fileHash, rolledBackAt: null },
    });
    if (existing) {
      throw new AppError(
        "CONFLICT",
        `This file (${fileName}) has already been imported.`
      );
    }

    // Ensure parser profile exists in DB or find one by ID
    let profileId = profile.id;
    if (!profileId) {
      const createdProfile = await tx.parserProfile.create({
        data: {
          name: profile.name,
          fileType: profile.fileType,
          headerRow: profile.headerRow,
          columnMap: profile.columnMap as unknown as Prisma.InputJsonValue,
          dateFormat: profile.dateFormat,
          amountSign: profile.amountSign,
        },
      });
      profileId = createdProfile.id;
    }

    // Create the MomoImport record
    const momoImport = await tx.momoImport.create({
      data: {
        fileName,
        fileHash,
        parserProfileId: profileId,
        uploadedById: actorId,
        rowsTotal: parsed.rows.length + parsed.errors.length,
        rowsImported: 0,
        rowsDuplicate: 0,
        rowsSkipped: parsed.errors.length,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
      },
    });

    let importedCount = 0;
    let duplicateCount = 0;

    for (const row of parsed.rows) {
      // Check duplicate status
      let isDuplicate = false;
      let dupHash: string | null = null;

      if (row.externalRef) {
        const existingRef = await tx.momoTransaction.findFirst({
          where: { externalRef: row.externalRef },
        });
        if (existingRef) isDuplicate = true;
      } else {
        dupHash = computeTransactionDuplicateHash(
          row.occurredAt,
          row.amount,
          row.counterpartyPhone,
          row.rawDescription
        );
        const existingHash = await tx.momoTransaction.findFirst({
          where: { duplicateHash: dupHash },
        });
        if (existingHash) isDuplicate = true;
      }

      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      // Member phone matching
      const memberId = row.counterpartyPhone
        ? memberPhoneMap.get(row.counterpartyPhone) || null
        : null;

      // Classification
      const classification = classifyTransaction(
        row.direction,
        row.rawDescription,
        activeRules
      );

      const normDesc = normalizeDescription(row.rawDescription);

      await tx.momoTransaction.create({
        data: {
          importId: momoImport.id,
          externalRef: row.externalRef,
          occurredAt: row.occurredAt,
          direction: row.direction,
          amount: row.amount,
          counterpartyName: row.counterpartyName,
          counterpartyPhone: row.counterpartyPhone,
          rawDescription: row.rawDescription,
          normalizedDescription: normDesc,
          categoryId: classification.categoryId,
          memberId,
          status: classification.status,
          matchedRuleId: classification.matchedRuleId,
          rawRow: row.rawRow as unknown as Prisma.InputJsonValue,
          duplicateHash: dupHash,
        },
      });

      importedCount++;
    }

    // Update import record with final row counts
    const updatedImport = await tx.momoImport.update({
      where: { id: momoImport.id },
      data: {
        rowsImported: importedCount,
        rowsDuplicate: duplicateCount,
      },
    });

    return {
      result: updatedImport,
      audit: {
        actorId,
        action: "MOMO_IMPORT_COMMIT",
        entityType: "MomoImport",
        entityId: updatedImport.id,
        after: {
          id: updatedImport.id,
          fileName: updatedImport.fileName,
          rowsImported: updatedImport.rowsImported,
          rowsDuplicate: updatedImport.rowsDuplicate,
          rowsSkipped: updatedImport.rowsSkipped,
          periodStart: updatedImport.periodStart?.toISOString(),
          periodEnd: updatedImport.periodEnd?.toISOString(),
        },
      },
    };
  });
}

/**
 * Rolls back an imported statement.
 * Secretary only, allowed only when no affected period is submitted/locked.
 */
export async function rollbackImport(
  input: RollbackImportInput,
  actorId: string,
  actorRole: Role
): Promise<MomoImport> {
  if (actorRole !== Role.FINANCE_SECRETARY) {
    throw new AppError(
      "FORBIDDEN",
      "Only the Finance Secretary can roll back a Mobile Money statement import."
    );
  }

  const momoImport = await prisma.momoImport.findUnique({
    where: { id: input.importId },
    include: { transactions: true },
  });

  if (!momoImport) {
    throw new AppError("NOT_FOUND", "Import record not found.");
  }

  if (momoImport.rolledBackAt) {
    throw new AppError("CONFLICT", "This statement import has already been rolled back.");
  }

  const hasLocked = momoImport.transactions.some((tx) => tx.locked);
  if (hasLocked) {
    throw new AppError(
      "LOCKED_RECORD",
      "Cannot roll back this statement import because one or more transactions belong to a submitted reconciliation period."
    );
  }

  return withAudit(async (tx) => {
    // Delete transactions associated with this import
    await tx.momoTransaction.deleteMany({
      where: { importId: input.importId },
    });

    const updated = await tx.momoImport.update({
      where: { id: input.importId },
      data: {
        rolledBackAt: new Date(),
        rolledBackById: actorId,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "MOMO_IMPORT_ROLLBACK",
        entityType: "MomoImport",
        entityId: input.importId,
        reason: input.reason.trim(),
        before: {
          fileName: momoImport.fileName,
          rowsImported: momoImport.rowsImported,
        },
        after: {
          rolledBackAt: updated.rolledBackAt?.toISOString(),
          rolledBackById: actorId,
        },
      },
    };
  });
}

/**
 * Classifies a single transaction from the review queue and optionally saves a learned rule.
 */
export async function classifySingleTransaction(
  input: ClassifySingleTransactionInput,
  actorId: string
): Promise<MomoTransaction> {
  const transaction = await prisma.momoTransaction.findUnique({
    where: { id: input.transactionId },
  });

  if (!transaction) {
    throw new AppError("NOT_FOUND", "Transaction not found.");
  }

  if (transaction.locked) {
    throw new AppError(
      "LOCKED_RECORD",
      "This transaction belongs to a submitted reconciliation period and cannot be reclassified without an unlock."
    );
  }

  return withAudit(async (tx) => {
    let newRuleId: string | null = null;

    if (input.rememberRule && input.rulePattern) {
      const cleanPattern = input.rulePattern.trim();
      const existingRules = await tx.classificationRule.findMany();

      const ruleMatchType = input.matchType ?? RuleMatchType.CONTAINS_WORD;
      const conflicts = detectRuleConflicts(
        cleanPattern,
        ruleMatchType,
        input.categoryId,
        existingRules
      );

      if (conflicts.length > 0) {
        // Log or handle conflict: save rule at lower priority
      }

      // Determine next priority (max + 1)
      const maxPriority = existingRules.reduce(
        (max, r) => Math.max(max, r.priority),
        0
      );

      const createdRule = await tx.classificationRule.create({
        data: {
          pattern: cleanPattern,
          matchType: ruleMatchType,
          categoryId: input.categoryId,
          priority: maxPriority + 1,
          active: true,
          createdById: actorId,
        },
      });

      newRuleId = createdRule.id;
    }

    const updated = await tx.momoTransaction.update({
      where: { id: input.transactionId },
      data: {
        categoryId: input.categoryId,
        status: MomoTransactionStatus.CONFIRMED,
        reviewedById: actorId,
        reviewedAt: new Date(),
        matchedRuleId: newRuleId || transaction.matchedRuleId,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "MOMO_TRANSACTION_CLASSIFY",
        entityType: "MomoTransaction",
        entityId: input.transactionId,
        before: {
          status: transaction.status,
          categoryId: transaction.categoryId,
        },
        after: {
          status: updated.status,
          categoryId: updated.categoryId,
          rememberedRuleId: newRuleId,
        },
      },
    };
  });
}

/**
 * Bulk classifies multiple selected transactions to a category.
 */
export async function bulkClassifyTransactions(
  input: BulkClassifyTransactionsInput,
  actorId: string
): Promise<{ count: number }> {
  const lockedCount = await prisma.momoTransaction.count({
    where: {
      id: { in: input.transactionIds },
      locked: true,
    },
  });

  if (lockedCount > 0) {
    throw new AppError(
      "LOCKED_RECORD",
      "One or more selected transactions belong to a submitted reconciliation period and cannot be reclassified without an unlock."
    );
  }

  return withAudit(async (tx) => {
    const updateResult = await tx.momoTransaction.updateMany({
      where: {
        id: { in: input.transactionIds },
      },
      data: {
        categoryId: input.categoryId,
        status: MomoTransactionStatus.CONFIRMED,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
    });

    return {
      result: { count: updateResult.count },
      audit: {
        actorId,
        action: "MOMO_TRANSACTION_BULK_CLASSIFY",
        entityType: "MomoTransaction",
        entityId: input.transactionIds[0] || "bulk",
        after: {
          categoryId: input.categoryId,
          count: updateResult.count,
          transactionIds: input.transactionIds,
        },
      },
    };
  });
}

/**
 * Creates or saves a ParserProfile.
 */
export async function createParserProfile(
  input: CreateParserProfileInput,
  actorId: string
): Promise<ParserProfile> {
  return withAudit(async (tx) => {
    const profile = await tx.parserProfile.create({
      data: {
        name: input.name.trim(),
        fileType: input.fileType,
        headerRow: input.headerRow,
        columnMap: input.columnMap as unknown as Prisma.InputJsonValue,
        dateFormat: input.dateFormat,
        amountSign: input.amountSign,
      },
    });

    return {
      result: profile,
      audit: {
        actorId,
        action: "PARSER_PROFILE_CREATE",
        entityType: "ParserProfile",
        entityId: profile.id,
        after: {
          name: profile.name,
          fileType: profile.fileType,
          headerRow: profile.headerRow,
        },
      },
    };
  });
}

/**
 * Rules service: create, update, toggle active, reorder.
 */
export async function createClassificationRule(
  input: CreateClassificationRuleInput,
  actorId: string
): Promise<ClassificationRule> {
  const cleanPattern = input.pattern.trim();

  return withAudit(async (tx) => {
    const rule = await tx.classificationRule.create({
      data: {
        pattern: cleanPattern,
        matchType: input.matchType,
        categoryId: input.categoryId,
        priority: input.priority,
        active: input.active,
        createdById: actorId,
      },
    });

    return {
      result: rule,
      audit: {
        actorId,
        action: "CLASSIFICATION_RULE_CREATE",
        entityType: "ClassificationRule",
        entityId: rule.id,
        after: {
          pattern: rule.pattern,
          matchType: rule.matchType,
          categoryId: rule.categoryId,
          priority: rule.priority,
        },
      },
    };
  });
}

export async function updateClassificationRule(
  input: UpdateClassificationRuleInput,
  actorId: string
): Promise<ClassificationRule> {
  const existing = await prisma.classificationRule.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Classification rule not found.");
  }

  return withAudit(async (tx) => {
    const updated = await tx.classificationRule.update({
      where: { id: input.id },
      data: {
        pattern: input.pattern.trim(),
        matchType: input.matchType,
        categoryId: input.categoryId,
        priority: input.priority,
        active: input.active,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "CLASSIFICATION_RULE_UPDATE",
        entityType: "ClassificationRule",
        entityId: input.id,
        before: {
          pattern: existing.pattern,
          matchType: existing.matchType,
          categoryId: existing.categoryId,
          priority: existing.priority,
          active: existing.active,
        },
        after: {
          pattern: updated.pattern,
          matchType: updated.matchType,
          categoryId: updated.categoryId,
          priority: updated.priority,
          active: updated.active,
        },
      },
    };
  });
}

export async function reorderClassificationRules(
  orderedIds: string[],
  actorId: string
): Promise<{ success: boolean }> {
  return withAudit(async (tx) => {
    for (let index = 0; index < orderedIds.length; index++) {
      await tx.classificationRule.update({
        where: { id: orderedIds[index] },
        data: { priority: index + 1 },
      });
    }

    return {
      result: { success: true },
      audit: {
        actorId,
        action: "CLASSIFICATION_RULES_REORDER",
        entityType: "ClassificationRule",
        entityId: "bulk",
        after: { orderedIds },
      },
    };
  });
}
