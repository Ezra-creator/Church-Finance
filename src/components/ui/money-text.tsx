import React from "react";
import { clsx } from "clsx";
import { formatMoney, toDecimal, CediValue } from "@/lib/money";

export interface MoneyTextProps {
  amount: CediValue | null | undefined;
  variant?: "inline" | "headline";
  emptyAsHyphen?: boolean;
  className?: string;
}

export function MoneyText({
  amount,
  variant = "inline",
  emptyAsHyphen = false,
  className,
}: MoneyTextProps) {
  const dec = amount !== null && amount !== undefined ? toDecimal(amount) : null;
  const isNegative = dec ? dec.isNegative() : false;
  const isHyphen = emptyAsHyphen && (!dec || dec.isZero());
  const text = formatMoney(amount, { emptyAsHyphen });

  const variantClass = variant === "headline" ? "figure" : "body";
  const colorClass = isHyphen ? "text-muted" : isNegative ? "text-bad-ink" : "text-text";

  return (
    <span className={clsx("num inline-block", variantClass, colorClass, className)}>
      {text}
    </span>
  );
}

