import {
  MomoTransactionDirection,
  MomoTransactionStatus,
  RuleMatchType,
} from "@prisma/client";

export interface ClassificationRuleLike {
  id: string;
  pattern: string;
  matchType: RuleMatchType;
  categoryId: string;
  priority: number; // Lower number = higher priority
  active: boolean;
}

export interface ClassificationResult {
  categoryId: string | null;
  matchedRuleId: string | null;
  status: MomoTransactionStatus;
}

/**
 * Normalises transaction narrative text for consistent pattern matching:
 * 1. Lowercase
 * 2. Collapse common Ghanaian church finance spelling variations
 * 3. Strip punctuation
 * 4. Collapse extra whitespaces
 */
export function normalizeDescription(text: string | null | undefined): string {
  if (!text) return "";

  let norm = text.toLowerCase();

  // Strip punctuation except spaces and alphanumeric characters
  norm = norm.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'@+]/g, " ");

  // Collapse common spelling variations
  norm = norm
    .replace(/\b(thite|tith|tythe|tihe)\b/g, "tithe")
    .replace(/\b(offring|ofering|ofrin|offrin)\b/g, "offering")
    .replace(/\b(freewil|freewl|friwill)\b/g, "freewill")
    .replace(/\b(specail|spesial|spcial)\b/g, "special")
    .replace(/\b(hrvest|harvst|havest)\b/g, "harvest")
    .replace(/\b(pledg|plegde)\b/g, "pledge")
    .replace(/\b(donatn|dontn|donatin)\b/g, "donation")
    .replace(/\b(welfare|welfar)\b/g, "welfare");

  // Collapse multiple whitespace characters into a single space
  return norm.replace(/\s+/g, " ").trim();
}

/**
 * Checks if a normalized pattern matches normalized text according to matchType.
 */
export function matchesPattern(
  normalizedText: string,
  rawPattern: string,
  matchType: RuleMatchType
): boolean {
  const normPattern = normalizeDescription(rawPattern);
  if (!normPattern) return false;

  if (matchType === RuleMatchType.CONTAINS_WORD) {
    // Regex word boundary matching
    const escaped = normPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(normalizedText);
  }

  // Substring match
  return normalizedText.includes(normPattern);
}

/**
 * Pure classification engine:
 * - If direction is OUT: returns IGNORED (unless manually altered later).
 * - Sorts active rules by priority (ascending: 1 > 2 > 3).
 * - Evaluates rules in priority tiers.
 * - If exactly one distinct category matches in the highest matching priority tier: AUTO.
 * - If multiple conflicting categories match: NEEDS_REVIEW.
 * - If zero rules match: NEEDS_REVIEW.
 */
export function classifyTransaction(
  direction: MomoTransactionDirection,
  rawDescription: string,
  activeRules: ClassificationRuleLike[]
): ClassificationResult {
  // Business rule: OUT transactions are stored with IGNORED unless the secretary marks them.
  if (direction === MomoTransactionDirection.OUT) {
    return {
      categoryId: null,
      matchedRuleId: null,
      status: MomoTransactionStatus.IGNORED,
    };
  }

  const normalized = normalizeDescription(rawDescription);
  if (!normalized) {
    return {
      categoryId: null,
      matchedRuleId: null,
      status: MomoTransactionStatus.NEEDS_REVIEW,
    };
  }

  // Filter and sort active rules by priority (ascending)
  const sortedRules = [...activeRules]
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority);

  // Group rules by priority tier
  const priorityTiers = new Map<number, ClassificationRuleLike[]>();
  for (const rule of sortedRules) {
    const list = priorityTiers.get(rule.priority) || [];
    list.push(rule);
    priorityTiers.set(rule.priority, list);
  }

  const sortedPriorities = Array.from(priorityTiers.keys()).sort((a, b) => a - b);

  for (const priority of sortedPriorities) {
    const rulesInTier = priorityTiers.get(priority)!;
    const matchingRules = rulesInTier.filter((rule) =>
      matchesPattern(normalized, rule.pattern, rule.matchType)
    );

    if (matchingRules.length > 0) {
      const distinctCategoryIds = Array.from(
        new Set(matchingRules.map((r) => r.categoryId))
      );

      // Conflict: multiple different categories matched at this priority tier
      if (distinctCategoryIds.length > 1) {
        return {
          categoryId: null,
          matchedRuleId: null,
          status: MomoTransactionStatus.NEEDS_REVIEW,
        };
      }

      // Exactly one distinct category matched
      return {
        categoryId: distinctCategoryIds[0],
        matchedRuleId: matchingRules[0].id,
        status: MomoTransactionStatus.AUTO,
      };
    }
  }

  // No rules matched
  return {
    categoryId: null,
    matchedRuleId: null,
    status: MomoTransactionStatus.NEEDS_REVIEW,
  };
}

/**
 * Detects conflicts between an existing set of rules and a proposed new rule.
 * Returns overlapping rules with different categories.
 */
export function detectRuleConflicts(
  newPattern: string,
  newMatchType: RuleMatchType,
  newCategoryId: string,
  existingRules: ClassificationRuleLike[],
  currentRuleId?: string
): ClassificationRuleLike[] {
  const normNewPattern = normalizeDescription(newPattern);
  if (!normNewPattern) return [];

  return existingRules.filter((r) => {
    if (currentRuleId && r.id === currentRuleId) return false;
    if (r.categoryId === newCategoryId) return false; // Same category is not a conflict

    const normExistingPattern = normalizeDescription(r.pattern);

    // Check bidirectional match
    const newMatchesExisting = matchesPattern(
      normNewPattern,
      r.pattern,
      r.matchType
    );
    const existingMatchesNew = matchesPattern(
      normExistingPattern,
      newPattern,
      newMatchType
    );

    return newMatchesExisting || existingMatchesNew;
  });
}
