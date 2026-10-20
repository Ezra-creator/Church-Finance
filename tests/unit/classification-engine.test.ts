import { describe, it, expect } from "vitest";
import {
  MomoTransactionDirection,
  MomoTransactionStatus,
  RuleMatchType,
} from "@prisma/client";
import {
  normalizeDescription,
  matchesPattern,
  classifyTransaction,
  detectRuleConflicts,
  ClassificationRuleLike,
} from "@/features/momo/classification/engine";

describe("Classification Engine", () => {
  describe("normalizeDescription", () => {
    it("lowercases and collapses extra spaces and punctuation", () => {
      expect(normalizeDescription("  TITHE - Oct. 2026 / Kwame Mensah!  ")).toBe(
        "tithe oct 2026 kwame mensah"
      );
    });

    it("collapses common Ghanaian spelling variations", () => {
      expect(normalizeDescription("monthly tith payment")).toBe(
        "monthly tithe payment"
      );
      expect(normalizeDescription("sunday offring")).toBe(
        "sunday offering"
      );
      expect(normalizeDescription("annual hrvest plegde")).toBe(
        "annual harvest pledge"
      );
      expect(normalizeDescription("freewil and welfare donation")).toBe(
        "freewill and welfare donation"
      );
    });
  });

  describe("matchesPattern", () => {
    it("matches full word boundaries with CONTAINS_WORD", () => {
      expect(
        matchesPattern("tithe for november", "tithe", RuleMatchType.CONTAINS_WORD)
      ).toBe(true);
      // "antithetical" contains "tithe" as substring, but not as whole word
      expect(
        matchesPattern("antithetical payment", "tithe", RuleMatchType.CONTAINS_WORD)
      ).toBe(false);
    });

    it("matches substrings with CONTAINS", () => {
      expect(
        matchesPattern("specialharvestoffering", "harvest", RuleMatchType.CONTAINS)
      ).toBe(true);
    });
  });

  describe("classifyTransaction", () => {
    const rules: ClassificationRuleLike[] = [
      {
        id: "rule_tithe",
        pattern: "tithe",
        matchType: RuleMatchType.CONTAINS_WORD,
        categoryId: "cat_tithe",
        priority: 1,
        active: true,
      },
      {
        id: "rule_harvest",
        pattern: "harvest",
        matchType: RuleMatchType.CONTAINS,
        categoryId: "cat_special",
        priority: 2,
        active: true,
      },
      {
        id: "rule_freewill",
        pattern: "offering",
        matchType: RuleMatchType.CONTAINS_WORD,
        categoryId: "cat_freewill",
        priority: 3,
        active: true,
      },
    ];

    it("assigns IGNORED to OUT transactions", () => {
      const res = classifyTransaction(
        MomoTransactionDirection.OUT,
        "Tithe payment transfer",
        rules
      );
      expect(res.status).toBe(MomoTransactionStatus.IGNORED);
      expect(res.categoryId).toBeNull();
    });

    it("assigns AUTO when exactly one rule matches", () => {
      const res = classifyTransaction(
        MomoTransactionDirection.IN,
        "November Tithe Payment",
        rules
      );
      expect(res.status).toBe(MomoTransactionStatus.AUTO);
      expect(res.categoryId).toBe("cat_tithe");
      expect(res.matchedRuleId).toBe("rule_tithe");
    });

    it("assigns AUTO to higher priority rule when multiple tiers match", () => {
      // Both tithe (priority 1) and offering (priority 3) appear
      const res = classifyTransaction(
        MomoTransactionDirection.IN,
        "Sunday tithe and offering",
        rules
      );
      // Priority 1 wins cleanly
      expect(res.status).toBe(MomoTransactionStatus.AUTO);
      expect(res.categoryId).toBe("cat_tithe");
    });

    it("assigns NEEDS_REVIEW when conflicting categories match at the same priority tier", () => {
      const conflictingRules: ClassificationRuleLike[] = [
        {
          id: "r1",
          pattern: "support",
          matchType: RuleMatchType.CONTAINS,
          categoryId: "cat_freewill",
          priority: 1,
          active: true,
        },
        {
          id: "r2",
          pattern: "support",
          matchType: RuleMatchType.CONTAINS,
          categoryId: "cat_special",
          priority: 1,
          active: true,
        },
      ];

      const res = classifyTransaction(
        MomoTransactionDirection.IN,
        "Parish support fund",
        conflictingRules
      );
      expect(res.status).toBe(MomoTransactionStatus.NEEDS_REVIEW);
      expect(res.categoryId).toBeNull();
    });

    it("assigns NEEDS_REVIEW when no rules match", () => {
      const res = classifyTransaction(
        MomoTransactionDirection.IN,
        "Payment from 0244123456",
        rules
      );
      expect(res.status).toBe(MomoTransactionStatus.NEEDS_REVIEW);
      expect(res.categoryId).toBeNull();
    });
  });

  describe("detectRuleConflicts", () => {
    const existingRules: ClassificationRuleLike[] = [
      {
        id: "rule_1",
        pattern: "tithe",
        matchType: RuleMatchType.CONTAINS_WORD,
        categoryId: "cat_tithe",
        priority: 1,
        active: true,
      },
    ];

    it("detects conflict when new pattern overlaps with different category", () => {
      const conflicts = detectRuleConflicts(
        "tithe payment",
        RuleMatchType.CONTAINS,
        "cat_freewill",
        existingRules
      );
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].id).toBe("rule_1");
    });

    it("ignores overlap when category is the same", () => {
      const conflicts = detectRuleConflicts(
        "monthly tithe",
        RuleMatchType.CONTAINS,
        "cat_tithe",
        existingRules
      );
      expect(conflicts.length).toBe(0);
    });
  });
});
