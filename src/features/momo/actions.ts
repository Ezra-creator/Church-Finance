"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { handleActionError, successResult, Result } from "@/lib/errors";
import {
  previewImport,
  commitImport,
  rollbackImport,
  classifySingleTransaction,
  bulkClassifyTransactions,
  createClassificationRule,
  updateClassificationRule,
  reorderClassificationRules,
  createParserProfile,
  inspectStatementFile,
  ImportPreviewResult,
  StatementFileInspection,
} from "./service";
import {
  parserProfileSchema,
  createParserProfileSchema,
  classifySingleTransactionSchema,
  bulkClassifyTransactionsSchema,
  createClassificationRuleSchema,
  updateClassificationRuleSchema,
  rollbackImportSchema,
  CreateParserProfileInput,
  ClassifySingleTransactionInput,
  BulkClassifyTransactionsInput,
  CreateClassificationRuleInput,
  UpdateClassificationRuleInput,
  RollbackImportInput,
} from "./schemas";
import { ParserProfileConfig } from "./parsers/types";

export async function inspectStatementFileAction(
  formData: FormData
): Promise<Result<StatementFileInspection>> {
  try {
    await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);

    const file = formData.get("file") as File | null;
    if (!file) {
      throw new Error("No file provided for inspection.");
    }

    const headerRowStr = formData.get("headerRow") as string | null;
    const headerRow = headerRowStr ? parseInt(headerRowStr, 10) : 1;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const inspection = await inspectStatementFile(buffer, file.name, headerRow);
    return successResult(inspection);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createParserProfileAction(
  rawInput: CreateParserProfileInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = createParserProfileSchema.parse(rawInput);
    const profile = await createParserProfile(input, user.id);
    return successResult({ id: profile.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function previewImportAction(
  formData: FormData
): Promise<Result<ImportPreviewResult>> {
  try {
    await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);

    const file = formData.get("file") as File | null;
    if (!file) {
      throw new Error("No file provided for preview.");
    }

    const profileJson = formData.get("profile") as string | null;
    if (!profileJson) {
      throw new Error("Parser profile configuration missing.");
    }

    const rawProfile = JSON.parse(profileJson);
    const validatedProfile = parserProfileSchema.parse(rawProfile);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await previewImport(
      buffer,
      file.name,
      validatedProfile as ParserProfileConfig
    );

    return successResult(preview);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function commitImportAction(
  formData: FormData
): Promise<Result<{ id: string; rowsImported: number; rowsDuplicate: number }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);

    const file = formData.get("file") as File | null;
    if (!file) {
      throw new Error("No file provided for import.");
    }

    const profileJson = formData.get("profile") as string | null;
    if (!profileJson) {
      throw new Error("Parser profile configuration missing.");
    }

    const rawProfile = JSON.parse(profileJson);
    const validatedProfile = parserProfileSchema.parse(rawProfile);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const momoImport = await commitImport(
      buffer,
      file.name,
      validatedProfile as ParserProfileConfig,
      user.id
    );

    revalidatePath("/money/momo");
    revalidatePath("/money/momo/review");
    return successResult({
      id: momoImport.id,
      rowsImported: momoImport.rowsImported,
      rowsDuplicate: momoImport.rowsDuplicate,
    });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function rollbackImportAction(
  rawInput: RollbackImportInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY);
    const input = rollbackImportSchema.parse(rawInput);

    const result = await rollbackImport(input, user.id, user.role);

    revalidatePath("/money/momo");
    return successResult({ id: result.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function classifySingleTransactionAction(
  rawInput: ClassifySingleTransactionInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = classifySingleTransactionSchema.parse(rawInput);

    const result = await classifySingleTransaction(input, user.id);

    revalidatePath("/money/momo");
    revalidatePath("/money/momo/review");
    return successResult({ id: result.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function bulkClassifyTransactionsAction(
  rawInput: BulkClassifyTransactionsInput
): Promise<Result<{ count: number }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = bulkClassifyTransactionsSchema.parse(rawInput);

    const result = await bulkClassifyTransactions(input, user.id);

    revalidatePath("/money/momo");
    revalidatePath("/money/momo/review");
    return successResult(result);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createClassificationRuleAction(
  rawInput: CreateClassificationRuleInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = createClassificationRuleSchema.parse(rawInput);

    const rule = await createClassificationRule(input, user.id);

    revalidatePath("/money/momo/rules");
    return successResult({ id: rule.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateClassificationRuleAction(
  rawInput: UpdateClassificationRuleInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = updateClassificationRuleSchema.parse(rawInput);

    const rule = await updateClassificationRule(input, user.id);

    revalidatePath("/money/momo/rules");
    return successResult({ id: rule.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function reorderClassificationRulesAction(
  orderedIds: string[]
): Promise<Result<{ success: boolean }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const result = await reorderClassificationRules(orderedIds, user.id);

    revalidatePath("/money/momo/rules");
    return successResult(result);
  } catch (error) {
    return handleActionError(error);
  }
}
