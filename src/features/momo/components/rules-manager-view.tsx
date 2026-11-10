"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Role, RuleMatchType, MomoTransactionDirection } from "@prisma/client";
import {
  Plus,
  Search,
  Check,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import {
  createClassificationRuleAction,
  updateClassificationRuleAction,
  reorderClassificationRulesAction,
} from "../actions";
import {
  classifyTransaction,
  detectRuleConflicts,
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

  const [pattern, setPattern] = useState("");
  const [matchType, setMatchType] = useState<RuleMatchType>(RuleMatchType.CONTAINS_WORD);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [priority, setPriority] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const [testPhrase, setTestPhrase] = useState("");

  const [isPending, startTransition] = useTransition();

  const canEdit = userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

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

    return {
      type: "NO_MATCH" as const,
    };
  }, [testPhrase, rules, categories]);

  const handleOpenCreate = () => {
    setEditingRuleId(null);
    setPattern("");
    setMatchType(RuleMatchType.CONTAINS_WORD);
    setCategoryId(categories[0]?.id || "");
    setPriority(rules.length + 1);
    setIsActive(true);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (rule: ClassificationRuleItem) => {
    setEditingRuleId(rule.id);
    setPattern(rule.pattern);
    setMatchType(rule.matchType);
    setCategoryId(rule.categoryId);
    setPriority(rule.priority);
    setIsActive(rule.active);
    setIsSheetOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim()) return;

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
          addToast({ type: "bad", message: res.error.message });
          return;
        }

        const cat = categories.find((c) => c.id === categoryId);
        setRules((prev) =>
          prev.map((r) =>
            r.id === editingRuleId
              ? {
                  ...r,
                  pattern: pattern.trim(),
                  matchType,
                  categoryId,
                  priority,
                  active: isActive,
                  category: cat ? { id: cat.id, name: cat.name, code: cat.code } : r.category,
                }
              : r
          )
        );
        addToast({ type: "ok", message: `Rule "${pattern.trim()}" updated.` });
      } else {
        const res = await createClassificationRuleAction({
          pattern: pattern.trim(),
          matchType,
          categoryId,
          priority,
          active: isActive,
        });

        if (!res.success) {
          addToast({ type: "bad", message: res.error.message });
          return;
        }

        const cat = categories.find((c) => c.id === categoryId);
        const newRule: ClassificationRuleItem = {
          id: res.data.id,
          pattern: pattern.trim(),
          matchType,
          priority: priority,
          active: isActive,
          categoryId,
          category: cat ? { id: cat.id, name: cat.name, code: cat.code } : { id: categoryId, name: "Category", code: "CAT" },
        };

        setRules((prev) => [...prev, newRule]);
        addToast({ type: "ok", message: `Rule "${pattern.trim()}" created.` });
      }

      setIsSheetOpen(false);
    });
  };

  const handleToggleActive = (rule: ClassificationRuleItem) => {
    if (!canEdit) return;

    startTransition(async () => {
      const nextActive = !rule.active;
      const res = await updateClassificationRuleAction({
        id: rule.id,
        pattern: rule.pattern,
        matchType: rule.matchType,
        categoryId: rule.categoryId,
        priority: rule.priority,
        active: nextActive,
      });

      if (!res.success) {
        addToast({ type: "bad", message: res.error.message });
        return;
      }

      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, active: nextActive } : r))
      );
      addToast({
        type: "ok",
        message: `Rule "${rule.pattern}" ${nextActive ? "activated" : "disabled"}.`,
      });
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (!canEdit) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const newRules = [...rules];
    const temp = newRules[index];
    newRules[index] = newRules[targetIndex];
    newRules[targetIndex] = temp;

    const reordered = newRules.map((r, i) => ({
      ...r,
      priority: i + 1,
    }));

    setRules(reordered);

    startTransition(async () => {
      const res = await reorderClassificationRulesAction(reordered.map((r) => r.id));
      if (!res.success) {
        addToast({ type: "bad", message: res.error.message });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Classification rules"
        description="Priority-ordered patterns used to automatically classify Mobile money statement transactions."
        action={
          <div className="flex items-center gap-2">
            <Link href="/money/momo">
              <Button variant="ghost" size="sm">
                Back to Mobile money
              </Button>
            </Link>
            {canEdit && (
              <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-1.5 stroke-[1.75]" />
                New rule
              </Button>
            )}
          </div>
        }
      />

      {/* Simulator Section */}
      <div className="p-4 bg-surface border border-border rounded-panel space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted stroke-[1.75]" />
          <span className="text-caption font-medium text-text">
            Live simulation against active rules
          </span>
        </div>

        <input
          type="text"
          value={testPhrase}
          onChange={(e) => setTestPhrase(e.target.value)}
          placeholder="e.g. monthly pledge, welfare contribution, project offering"
          className="w-full text-body bg-surface border border-border rounded-control p-2.5 text-text placeholder:text-muted focus:outline-none focus:border-border-strong"
        />

        {testPhrase.trim() && testResult && (
          <div className="pt-2 text-caption flex items-center gap-2">
            {testResult.type === "AUTO" && (
              <div className="flex items-center gap-2 text-ok-ink">
                <Check className="w-4 h-4 stroke-[1.75]" />
                <span>
                  Matches <strong>{testResult.categoryName}</strong> via Rule #{testResult.rule?.priority} (&ldquo;{testResult.rule?.pattern}&rdquo;)
                </span>
              </div>
            )}

            {testResult.type === "NO_MATCH" && (
              <div className="flex items-center gap-2 text-muted">
                <AlertCircle className="w-4 h-4 stroke-[1.75]" />
                <span>
                  No active rule matched this phrase. Would be sent to review queue.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rules List Ordered By Priority */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lead font-normal text-text">
            Rules priority order ({rules.length})
          </h3>
          <span className="text-caption text-muted">
            Evaluated in priority order (1 = highest)
          </span>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-panel text-muted text-body">
            No classification rules established yet. Create rules to automatically classify transactions.
          </div>
        ) : (
          <div className="border border-border rounded-panel divide-y divide-border bg-surface">
            {rules.map((rule, idx) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between p-3.5 transition-colors ${
                  rule.active ? "hover:bg-hover" : "opacity-50 bg-hover"
                }`}
              >
                {/* Left: Priority and Pattern info */}
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <span className="w-7 text-center text-caption font-medium text-muted tnum">
                    #{rule.priority}
                  </span>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body font-medium text-text truncate">
                        {`"${rule.pattern}"`}
                      </span>
                      <span className="text-caption px-1.5 py-0.5 bg-hover text-muted rounded-control">
                        {rule.matchType === "CONTAINS_WORD" ? "Word match" : "Contains substring"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-caption">
                      <Badge variant="Balanced">{rule.category.name}</Badge>
                      <span className="text-muted text-caption">
                        ({rule.category.code})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Reorder, Active Toggle, Edit */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canEdit && (
                    <>
                      <div className="flex items-center gap-1 mr-2">
                        <button
                          type="button"
                          disabled={idx === 0 || isPending}
                          onClick={() => handleMove(idx, "up")}
                          className="px-2 py-1 text-caption hover:bg-hover disabled:opacity-20 text-muted rounded-control"
                          title="Move up"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          disabled={idx === rules.length - 1 || isPending}
                          onClick={() => handleMove(idx, "down")}
                          className="px-2 py-1 text-caption hover:bg-hover disabled:opacity-20 text-muted rounded-control"
                          title="Move down"
                        >
                          Down
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(rule)}
                        className={`text-caption px-2.5 py-1 rounded-control border transition-colors ${
                          rule.active
                            ? "border-ok text-ok-ink bg-ok-tint"
                            : "border-border text-muted bg-hover"
                        }`}
                        title="Toggle active"
                      >
                        {rule.active ? "Active" : "Disabled"}
                      </button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(rule)}
                      >
                        Edit
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
        title={editingRuleId ? "Edit classification rule" : "Create classification rule"}
        description="Define a pattern to automatically assign transactions to a church giving category."
      >
        <form onSubmit={handleSaveRule} className="space-y-4 pt-2">
          <div>
            <label className="text-caption font-medium text-muted block mb-1">
              Pattern or phrase
            </label>
            <input
              type="text"
              required
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. welfare, building, pledge, dues"
              className="w-full text-body bg-surface border border-border rounded-control p-2.5 text-text focus:outline-none focus:border-border-strong"
            />
            <p className="text-caption text-muted mt-1">
              Text will be matched after lowercase and punctuation normalization.
            </p>
          </div>

          <div>
            <label htmlFor="rule-match-type" className="text-caption font-medium text-muted block mb-1">
              Match type
            </label>
            <select
              id="rule-match-type"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as RuleMatchType)}
              className="w-full text-body bg-surface border border-border rounded-control p-2.5 text-text focus:outline-none focus:border-border-strong"
            >
              <option value={RuleMatchType.CONTAINS_WORD}>
                Whole word match (avoids false substrings)
              </option>
              <option value={RuleMatchType.CONTAINS}>
                Contains substring anywhere
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="rule-category" className="text-caption font-medium text-muted block mb-1">
              Assign to giving category
            </label>
            <select
              id="rule-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-body bg-surface border border-border rounded-control p-2.5 text-text focus:outline-none focus:border-border-strong"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.code})
                </option>
              ))}
            </select>
          </div>

          {formConflicts.length > 0 && (
            <InlineAlert
              variant="warn"
              title="Potential rule conflict detected"
              description={`The pattern "${pattern}" overlaps with existing rule #${formConflicts[0].priority} ("${formConflicts[0].pattern}") assigned to a different category. Higher priority rules take precedence.`}
            />
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              id="rule-active-checkbox"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded-control border-border text-accent focus:ring-accent"
            />
            <label htmlFor="rule-active-checkbox" className="text-caption text-text">
              Active rule (evaluated during statement imports)
            </label>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending
                ? "Saving..."
                : editingRuleId
                ? "Update rule"
                : "Create rule"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
