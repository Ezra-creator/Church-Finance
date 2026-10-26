import { Prisma } from "@prisma/client";

export interface AllocationRuleItem {
  id: string;
  categoryId: string;
  percentage: Prisma.Decimal | number | string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
}

export interface PeriodCategorySnapshot {
  categoryId: string;
  categoryName?: string;
  categoryCode?: string;
  totalAmount: Prisma.Decimal | number | string;
}

export interface CategoryAllocationBreakdown {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  totalAmount: Prisma.Decimal;
  percentage: Prisma.Decimal;
  amountDue: Prisma.Decimal;
}

export interface RemittanceComputationResult {
  totalDue: Prisma.Decimal;
  categoryBreakdown: CategoryAllocationBreakdown[];
}

/**
 * Normalizes a date or date-string to UTC YYYY-MM-DD for comparison.
 */
function normalizeDateStr(date: Date | string): string {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Checks if a rule is effective on a given date string (YYYY-MM-DD).
 */
export function isRuleEffectiveOn(
  rule: AllocationRuleItem,
  dateStr: string
): boolean {
  const fromStr = normalizeDateStr(rule.effectiveFrom);
  if (dateStr < fromStr) {
    return false;
  }
  if (rule.effectiveTo) {
    const toStr = normalizeDateStr(rule.effectiveTo);
    if (dateStr > toStr) {
      return false;
    }
  }
  return true;
}

/**
 * Pure function: computes district remittance amount due for a period snapshot
 * against allocation rules effective on the period's week-ending date.
 *
 * Each category's due = totalAmount * (percentage / 100), rounded to 2 decimal places.
 */
export function computeRemittance(
  categories: PeriodCategorySnapshot[],
  rules: AllocationRuleItem[],
  weekEndingDate: Date | string
): RemittanceComputationResult {
  const dateStr = normalizeDateStr(weekEndingDate);
  const effectiveRules = rules.filter((r) => isRuleEffectiveOn(r, dateStr));

  // Map categoryId -> effective rule
  const ruleMap = new Map<string, AllocationRuleItem>();
  for (const rule of effectiveRules) {
    ruleMap.set(rule.categoryId, rule);
  }

  let totalDue = new Prisma.Decimal(0);
  const categoryBreakdown: CategoryAllocationBreakdown[] = [];

  for (const cat of categories) {
    const totalAmount = new Prisma.Decimal(cat.totalAmount.toString());
    const rule = ruleMap.get(cat.categoryId);

    if (rule) {
      const percentage = new Prisma.Decimal(rule.percentage.toString());
      // amountDue = round(totalAmount * (percentage / 100), 2)
      const amountDue = totalAmount
        .mul(percentage)
        .div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      totalDue = totalDue.add(amountDue);

      categoryBreakdown.push({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName || cat.categoryId,
        categoryCode: cat.categoryCode || "",
        totalAmount,
        percentage,
        amountDue,
      });
    } else {
      categoryBreakdown.push({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName || cat.categoryId,
        categoryCode: cat.categoryCode || "",
        totalAmount,
        percentage: new Prisma.Decimal(0),
        amountDue: new Prisma.Decimal(0),
      });
    }
  }

  return {
    totalDue,
    categoryBreakdown,
  };
}
