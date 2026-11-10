/**
 * Formats a count with the correct singular or plural noun.
 * Example: plural(1, "category", "categories") -> "1 category"
 * Example: plural(2, "category", "categories") -> "2 categories"
 */
export function plural(
  count: number | string,
  singular: string,
  pluralForm?: string
): string {
  const numericCount = typeof count === "string" ? parseInt(count, 10) || 0 : count;
  const isOne = numericCount === 1;

  if (isOne) {
    return `${numericCount} ${singular}`;
  }

  const resolvedPlural = pluralForm || (singular.endsWith("y") && !singular.endsWith("ay") && !singular.endsWith("ey") && !singular.endsWith("oy") && !singular.endsWith("uy")
    ? `${singular.slice(0, -1)}ies`
    : `${singular}s`);

  return `${numericCount} ${resolvedPlural}`;
}
