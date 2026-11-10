import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Data table"
      className="w-full overflow-x-auto border border-border rounded-panel bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <table
        className={twMerge(
          "w-full text-left border-collapse text-body text-text",
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={twMerge(
        "bg-surface border-b border-border text-caption font-medium text-muted select-none h-10",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={twMerge("divide-y divide-border", className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={twMerge(
        "h-11 transition-colors duration-120 hover:bg-hover bg-surface",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  className,
  children,
  align = "left",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      className={twMerge(
        clsx(
          "px-4 text-caption font-medium text-muted whitespace-nowrap",
          align === "right" && "text-right tnum tabular-nums",
          align === "center" && "text-center",
          align === "left" && "text-left",
          className
        )
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  align = "left",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={twMerge(
        clsx(
          "px-4 text-body text-text whitespace-nowrap",
          align === "right" && "text-right tnum tabular-nums",
          align === "center" && "text-center",
          align === "left" && "text-left",
          className
        )
      )}
      {...props}
    >
      {children}
    </td>
  );
}
