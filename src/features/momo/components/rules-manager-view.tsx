"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Role, RuleMatchType, MomoTransactionDirection } from "@prisma/client";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Edit2,
} from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { StatusMark } from "@/components/ui/status-mark";
import { useToast } from "@/components/ui/toast";
import {
  createClassificationRuleAction,
  updateClassificationRuleAction,
  reorderClassificationRulesAction,
} from "../actions";
import {
  classifyTransaction,
  detectRuleConflicts,
  normalizeDescription,
} from "../classification/engine";

export interface ClassificationRuleItem {
  id: string;
  pattern: string;
  matchType: RuleMatchType;
  priority: number;
  active: boolean;
  categoryId: string;
  category: { id: string; name: string; code: string };
  createdBy?: { id: string; name: string | null; email: string | null } | null;
}

export interface RulesManagerViewProps {
  initialRules: ClassificationRuleItem[];
  categories: Array<{ id: string; name: string; code: string }>;
  userRole: Role;
}

export function RulesManagerView({
  initialRules,
  categories,
  userRole,
}: RulesManagerViewProps) {
  const { addToast } = useToast();
  const [rules, setRules] = useState<ClassificationRuleItem[]>(initialRules);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form state
  const [pattern, setPattern] = useState("");
  const [matchType, setMatchType] = useState<RuleMatchType>(RuleMatchType.CONTAINS_WORD);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [priority, setPriority] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Test phrase state
  const [testPhrase, setTestPhrase] = useState("");

  const [isPending, startTransition] = useTransition();

  const canEdit = userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  // Real-time conflict detection for the form
  const formConflicts = useMemo(() => {
    if (!pattern.trim() || !categoryId) return [];
    return detectRuleConflicts(
      pattern.trim(),
      matchType,
      categoryId,
      rules,
      editingRuleId || undefined
    );
  }, [pattern, matchType, categoryId, rules, editingRuleId]);

  // Real-time test of phrase
  const testResult = useMemo(() => {
    if (!testPhrase.trim()) return null;

    const activeRules = rules.filter((r) => r.active);
    const result = classifyTransaction(
      MomoTransactionDirection.IN,
      testPhrase,
      activeRules
    );

    if (result.status === "AUTO" && result.categoryId) {
      const cat = categories.find((c) => c.id === result.categoryId);
      const matchedRule = rules.find((r) => r.id === result.matchedRuleId);
      return {
        type: "AUTO" as const,
        categoryName: cat?.name || "Matched Category",
        rule: matchedRule,
      };
    }

    // Check if conflicting
    const norm = normalizeDescription(testPhrase);
    const matchingRules = activeRules.filter((r) => {
      const rNorm = normalizeDescription(r.pattern);
      if (r.matchType === "CONTAINS_WORD") {
        const regex = new RegExp(`(^|\\s)${rNorm}(\\s|$)`, "i");
        return regex.test(norm);
      }
      return norm.includes(rNorm);
    });

    const distinctCatIds = Array.from(new Set(matchingRules.map((r) => r.categoryId)));
    if (distinctCatIds.length > 1) {
      const conflictingCats = distinctCatIds
        .map((cid) => categories.find((c) => c.id === cid)?.name)
        .filter(Boolean);
      return {
        type: "CONFLICT" as const,
        conflictingCategories: conflictingCats.join(" vs "),
        matchingCount: matchingRules.length,
      };
    }

    return {
      type: "NO_MATCH" as const,
    };
  }, [testPhrase, rules, categories]);

  // Open add sheet
  const handleOpenAdd = () => {
    setEditingRuleId(null);
    setPattern("");
    setMatchType(RuleMatchType.CONTAINS_WORD);
    setCategoryId(categories[0]?.id || "");
    setPriority(rules.length + 1);
    setIsActive(true);
    setIsSheetOpen(true);
  };

  // Open edit sheet
  const handleOpenEdit = (rule: ClassificationRuleItem) => {
    setEditingRuleId(rule.id);
    setPattern(rule.pattern);
    setMatchType(rule.matchType);
    setCategoryId(rule.categoryId);
    setPriority(rule.priority);
    setIsActive(rule.active);
    setIsSheetOpen(true);
  };

  // Save rule (create or update)
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim() || !categoryId) return;

    startTransition(async () => {
      if (editingRuleId) {
        const res = await updateClassificationRuleAction({
          id: editingRuleId,
          pattern: pattern.trim(),
          matchType,
          categoryId,
          priority,
          active: isActive,
        });

        if (!res.success) {
          addToast("error", res.error.message);
          return;
        }

        const chosenCat = categories.find((c) => c.id === categoryId)!;
        setRules((prev) =>
          prev.map((r) =>
            r.id === editingRuleId
              ? {
                  ...r,
                  pattern: pattern.trim(),
                  matchType,
                  categoryId,
                  category: chosenCat,
                  priority,
                  active: isActive,
                }
              : r
          ).sort((a, b) => a.priority - b.priority)
        );

        addToast("success", "Rule updated successfully.");
      } else {
        const res = await createClassificationRuleAction({
          pattern: pattern.trim(),
          matchType,
          categoryId,
          priority,
          active: isActive,
        });

        if (!res.success) {
          addToast("error", res.error.message);
          return;
        }

        const chosenCat = categories.find((c) => c.id === categoryId)!;
        const newRule: ClassificationRuleItem = {
          id: res.data.id,
          pattern: pattern.trim(),
          matchType,
          priority,
          active: isActive,
          categoryId,
          category: chosenCat,
        };

        setRules((prev) => [...prev, newRule].sort((a, b) => a.priority - b.priority));
        addToast("success", "Classification rule created.");
      }

      setIsSheetOpen(false);
    });
  };

  // Toggle active
  const handleToggleActive = (rule: ClassificationRuleItem) => {
    if (!canEdit) return;

    startTransition(async () => {
      const res = await updateClassificationRuleAction({
        id: rule.id,
        pattern: rule.pattern,
        matchType: rule.matchType,
        categoryId: rule.categoryId,
        priority: rule.priority,
        active: !rule.active,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r))
      );
      addToast("success", rule.active ? "Rule disabled." : "Rule enabled.");
    });
  };

  // Reorder priority
  const handleMove = (index: number, direction: "up" | "down") => {
    if (!canEdit) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const updated = [...rules];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Re-assign priorities
    const reordered = updated.map((r, i) => ({ ...r, priority: i + 1 }));
    setRules(reordered);

    startTransition(async () => {
      const ids = reordered.map((r) => r.id);
      const res = await reorderClassificationRulesAction(ids);
      if (!res.success) {
        addToast("error", res.error.message);
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <RuleHeading
        eyebrow="Automation Rules"
        title="Payment Classification Rules"
        description="Patterns and keywords used to automatically categorize incoming MoMo statement descriptions into parish giving funds."
        action={
          <div className="flex items-center gap-2">
            <Link href="/money/momo">
              <Button variant="quiet" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                MoMo register
              </Button>
            </Link>
            {canEdit && (
              <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add rule
              </Button>
            )}
          </div>
        }
      />

      {/* "Test a phrase" Field */}
      <div className="p-4 bg-ink/[0.02] border border-rule rounded-[2px] space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-wider text-ink font-semibold flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-ink-soft" />
            Test a statement narration
          </label>
          <span className="text-[11px] font-mono text-ink-soft">
            Live simulation against active rules
          </span>
        </div>

        <input
          type="text"
          value={testPhrase}
          onChange={(e) => setTestPhrase(e.target.value)}
          placeholder="e.g. tithe for month of october or harvest thanksgiving..."
          className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2.5 text-ink font-mono focus:outline-none focus:border-ink placeholder:text-ink-soft/50"
        />

        {testPhrase.trim() && testResult && (
          <div className="pt-2 text-xs font-mono flex items-center gap-2">
            {testResult.type === "AUTO" && (
              <div className="flex items-center gap-2 text-balanced">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Matches <strong>{testResult.categoryName}</strong> via Rule #{testResult.rule?.priority} (&ldquo;{testResult.rule?.pattern}&rdquo;)
                </span>
              </div>
            )}
            {testResult.type === "CONFLICT" && (
              <div className="flex items-center gap-2 text-attention">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  Conflicting categories: <strong>{testResult.conflictingCategories}</strong>. Would be flagged for Needs Review.
                </span>
              </div>
            )}
            {testResult.type === "NO_MATCH" && (
              <div className="flex items-center gap-2 text-ink-soft">
                <HelpCircle className="w-4 h-4" />
                <span>
                  No active rule matched this phrase. Would be sent to &ldquo;Needs a label&rdquo; review queue.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ruled List of Rules Ordered By Priority */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b-2 border-rule-strong">
          <h3 className="text-xs uppercase tracking-wider font-semibold font-mono text-ink-soft">
            Rules Priority Order ({rules.length})
          </h3>
          <span className="text-[11px] font-mono text-ink-soft">
            Evaluated in priority order (1 = highest)
          </span>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-rule rounded-[2px] text-ink-soft text-sm">
            No classification rules established yet. Create rules to automatically classify transactions.
          </div>
        ) : (
          <div className="divide-y divide-rule border border-rule rounded-[2px] bg-paper">
            {rules.map((rule, idx) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between p-3 transition-colors ${
                  rule.active ? "hover:bg-ink/[0.015]" : "opacity-50 bg-ink/[0.01]"
                }`}
              >
                {/* Left: Priority and Pattern info */}
                <div className="flex items-center gap-4 min-w-0 pr-4">
                  {/* Priority rank */}
                  <div className="w-6 text-center font-mono text-xs font-semibold text-ink-soft tabular-nums">
                    #{rule.priority}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold font-mono text-ink truncate">
                        {`"${rule.pattern}"`}
                      </span>
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-ink/5 text-ink-soft rounded-[1px]">
                        {rule.matchType === "CONTAINS_WORD" ? "Word match" : "Contains substring"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <StatusMark tone="balanced" label={rule.category.name} />
                      <span className="text-ink-soft text-[10px] font-mono">
                        ({rule.category.code})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Reorder, Active Toggle, Edit */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canEdit && (
                    <>
                      <div className="flex items-center gap-0.5 mr-2">
                        <button
                          type="button"
                          disabled={idx === 0 || isPending}
                          onClick={() => handleMove(idx, "up")}
                          className="p-1 hover:bg-ink/5 disabled:opacity-20 text-ink rounded-[1px]"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === rules.length - 1 || isPending}
                          onClick={() => handleMove(idx, "down")}
                          className="p-1 hover:bg-ink/5 disabled:opacity-20 text-ink rounded-[1px]"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(rule)}
                        className={`text-xs font-mono px-2 py-0.5 rounded-[1px] border transition-colors ${
                          rule.active
                            ? "border-balanced/30 text-balanced bg-balanced/5"
                            : "border-rule text-ink-soft bg-ink/5"
                        }`}
                        title="Toggle active"
                      >
                        {rule.active ? "Active" : "Disabled"}
                      </button>

                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => handleOpenEdit(rule)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Rule Sheet */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={editingRuleId ? "Edit Classification Rule" : "Create Classification Rule"}
        description="Define a pattern to automatically assign transactions to a church giving category."
      >
        <form onSubmit={handleSaveRule} className="space-y-5 pt-3">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
              Pattern / Phrase <span className="text-variance">*</span>
            </label>
            <input
              type="text"
              required
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. tithe, harvest, welfare, project"
              className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
            />
            <p className="text-[11px] text-ink-soft mt-1">
              Text will be matched after lowercase and punctuation normalisation.
            </p>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
              Match Type
            </label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as RuleMatchType)}
              className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
            >
              <option value={RuleMatchType.CONTAINS_WORD}>
                Word Boundary (CONTAINS_WORD) — matches whole words only
              </option>
              <option value={RuleMatchType.CONTAINS}>
                Substring (CONTAINS) — matches anywhere in text
              </option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
              Giving Category <span className="text-variance">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
              Priority Rank
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
              className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
            />
            <p className="text-[11px] text-ink-soft mt-1">
              Lower numbers run first. Conflicting rules at the same priority level trigger manual review.
            </p>
          </div>

          {/* Conflict warning banner if overlapping rules found */}
          {formConflicts.length > 0 && (
            <div className="p-3 bg-attention/10 border border-attention text-attention text-xs rounded-[2px] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Rule Conflict Warning</span>
              </div>
              <p className="leading-relaxed">
                This pattern overlaps with existing Rule #{formConflicts[0].priority} (&ldquo;{formConflicts[0].pattern}&rdquo;) assigned to a different category. If a transaction matches both, it will require manual review.
              </p>
            </div>
          )}

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded-[2px] border-rule text-ink focus:ring-0"
              />
              <span className="text-sm font-medium text-ink">Active rule</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-rule">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setIsSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {editingRuleId ? "Save Changes" : "Create Rule"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
