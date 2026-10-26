import { prisma } from "@/server/db";
import { Prisma, DistrictAllocationRule } from "@prisma/client";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { CreateAllocationRuleInput, CloseAllocationRuleInput } from "./schemas";

/**
 * Subtracts 1 day from a YYYY-MM-DD date string, returning UTC Date.
 */
function getPreviousDayDate(dateStr: string): Date {
  const date = new Date(dateStr + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() - 1);
  return date;
}

/**
 * Fetches all district allocation rules, ordered by category and effective date.
 */
export async function getAllocationRules() {
  return prisma.districtAllocationRule.findMany({
    include: {
      category: true,
    },
    orderBy: [
      { category: { sortOrder: "asc" } },
      { effectiveFrom: "desc" },
    ],
  });
}

/**
 * Creates a new district allocation rule.
 * Rules never overlap per category. Changing a percentage automatically
 * closes an existing open rule (setting effectiveTo to the day prior)
 * and opens the new rule.
 */
export async function createAllocationRule(
  input: CreateAllocationRuleInput,
  actorId: string
): Promise<DistrictAllocationRule> {
  const category = await prisma.givingCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category) {
    throw new AppError("NOT_FOUND", "Giving category not found.");
  }

  const newFromDate = new Date(input.effectiveFrom + "T00:00:00.000Z");
  const newFromStr = input.effectiveFrom;
  const percentage = new Prisma.Decimal(input.percentage);

  // Fetch all existing rules for this category
  const existingRules = await prisma.districtAllocationRule.findMany({
    where: { categoryId: input.categoryId },
    orderBy: { effectiveFrom: "asc" },
  });

  let ruleToClose: DistrictAllocationRule | null = null;
  let closeDate: Date | null = null;

  for (const rule of existingRules) {
    const fromStr = rule.effectiveFrom.toISOString().slice(0, 10);
    const toStr = rule.effectiveTo ? rule.effectiveTo.toISOString().slice(0, 10) : null;

    if (!toStr) {
      // Currently open rule
      if (newFromStr <= fromStr) {
        throw new AppError(
          "VALIDATION_ERROR",
          `A new rule cannot start on or before the active rule's start date (${fromStr}).`
        );
      }
      ruleToClose = rule;
      closeDate = getPreviousDayDate(newFromStr);
    } else {
      // Historical closed rule: ensure no overlap
      // Overlap occurs if newFromStr is between fromStr and toStr (inclusive)
      if (newFromStr >= fromStr && newFromStr <= toStr) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Rule start date (${newFromStr}) overlaps with a historical rule (${fromStr} to ${toStr}).`
        );
      }
    }
  }

  return withAudit(async (tx) => {
    // 1. If an active rule exists, close it
    if (ruleToClose && closeDate) {
      await tx.districtAllocationRule.update({
        where: { id: ruleToClose.id },
        data: { effectiveTo: closeDate },
      });
    }

    // 2. Create the new rule
    const newRule = await tx.districtAllocationRule.create({
      data: {
        categoryId: input.categoryId,
        percentage,
        effectiveFrom: newFromDate,
        effectiveTo: null,
      },
      include: {
        category: true,
      },
    });

    return {
      result: newRule,
      audit: {
        actorId,
        action: "DISTRICT_ALLOCATION_RULE_CREATE",
        entityType: "DistrictAllocationRule",
        entityId: newRule.id,
        after: {
          categoryId: newRule.categoryId,
          categoryName: category.name,
          percentage: newRule.percentage.toString(),
          effectiveFrom: input.effectiveFrom,
          closedRuleId: ruleToClose ? ruleToClose.id : null,
          closedRuleTo: closeDate ? closeDate.toISOString().slice(0, 10) : null,
        },
      },
    };
  });
}

/**
 * Explicitly closes an allocation rule.
 */
export async function closeAllocationRule(
  input: CloseAllocationRuleInput,
  actorId: string
): Promise<DistrictAllocationRule> {
  const rule = await prisma.districtAllocationRule.findUnique({
    where: { id: input.ruleId },
    include: { category: true },
  });

  if (!rule) {
    throw new AppError("NOT_FOUND", "Allocation rule not found.");
  }

  const toDate = new Date(input.effectiveTo + "T00:00:00.000Z");
  const fromStr = rule.effectiveFrom.toISOString().slice(0, 10);

  if (input.effectiveTo < fromStr) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Effective to date (${input.effectiveTo}) cannot be earlier than effective from date (${fromStr}).`
    );
  }

  return withAudit(async (tx) => {
    const updated = await tx.districtAllocationRule.update({
      where: { id: rule.id },
      data: { effectiveTo: toDate },
      include: { category: true },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "DISTRICT_ALLOCATION_RULE_CLOSE",
        entityType: "DistrictAllocationRule",
        entityId: rule.id,
        before: {
          effectiveTo: rule.effectiveTo ? rule.effectiveTo.toISOString().slice(0, 10) : null,
        },
        after: {
          effectiveTo: input.effectiveTo,
        },
      },
    };
  });
}
