import React from "react";
import { clsx } from "clsx";
import { formatMoney, toDecimal, CediValue } from "@/lib/money";

export interface MoneyTextProps {
  amount: CediValue | null | undefined;
  currency?: string;
  className?: string;
  showSign?: boolean;
}

export function MoneyText({
  amount,
  currency = "GH₵",
  className,
}: MoneyTextProps) {
  const dec = amount !== null && amount !== undefined && amount !== "" ? toDecimal(amount) : null;
  const isNegative = dec !== null && dec.isNegative();
  const formatted = formatMoney(amount, currency);

  return (
    <span
      className={clsx(
        "tnum tabular-nums",
        isNegative ? "text-bad-ink" : "text-text",
        className
      )}
    >
      {formatted}
    </span>
  );
}
