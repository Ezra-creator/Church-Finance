import React from "react";
import { requireUser } from "@/server/guards";
import {
  listClassificationRules,
  listGivingCategories,
  ClassificationRuleWithRelations,
} from "@/features/momo/queries";
import { RulesManagerView } from "@/features/momo/components/rules-manager-view";

export const metadata = {
  title: "Classification Rules — PUCA Finance",
};

export default async function MomoRulesPage() {
  const user = await requireUser();

  const [rulesData, categories] = await Promise.all([
    listClassificationRules(),
    listGivingCategories(),
  ]);

  const formattedRules = rulesData.map((rule: ClassificationRuleWithRelations) => ({
    id: rule.id,
    pattern: rule.pattern,
    matchType: rule.matchType,
    priority: rule.priority,
    active: rule.active,
    categoryId: rule.categoryId,
    category: {
      id: rule.category.id,
      name: rule.category.name,
      code: rule.category.code,
    },
    createdBy: rule.createdBy,
  }));

  return (
    <RulesManagerView
      initialRules={formattedRules}
      categories={categories}
      userRole={user.role}
    />
  );
}
