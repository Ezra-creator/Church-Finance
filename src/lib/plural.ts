const pr = new Intl.PluralRules("en-GB");
const nf = new Intl.NumberFormat("en-GB");

/**
 * Formats a count with pluralized word using Intl.PluralRules and formatted thousands separator.
 * e.g. plural(1, "category", "categories") -> "1 category"
 * e.g. plural(12, "payment", "payments") -> "12 payments"
 */
export function plural(n: number, one: string, other: string): string {
  const rule = pr.select(n);
  const formattedNumber = nf.format(n);
  const word = rule === "one" ? one : other;
  return `${formattedNumber} ${word}`;
}

/**
 * Returns just the pluralized word without the number prefix.
 */
export function pluralWord(n: number, one: string, other: string): string {
  const rule = pr.select(n);
  return rule === "one" ? one : other;
}

