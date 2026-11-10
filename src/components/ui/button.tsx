"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-control select-none text-[14px] leading-[20px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-hover border border-transparent",
        secondary:
          "bg-surface text-text border border-border-strong hover:bg-hover active:bg-hover",
        outline:
          "bg-surface text-text border border-border-strong hover:bg-hover active:bg-hover",
        ghost:
          "bg-transparent text-text border border-transparent hover:bg-hover active:bg-hover",
        quiet:
          "bg-transparent text-text border border-transparent hover:bg-hover active:bg-hover",
        danger:
          "bg-surface text-bad-ink border border-bad hover:bg-bad-tint active:bg-bad-tint",
      },
      size: {
        default: "h-[40px] px-4 touch-target",
        sm: "h-[36px] px-3 text-[13px]",
        lg: "h-[44px] px-6",
        icon: "h-[40px] w-[40px] p-0 touch-target",
        quantity: "h-[56px] w-[56px] p-0 touch-target-qty",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "default",
      isLoading = false,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? "true" : undefined}
        onClick={(e) => {
          if (isLoading) {
            e.preventDefault();
            return;
          }
          if (onClick) onClick(e);
        }}
        className={twMerge(clsx(buttonVariants({ variant, size }), className))}
        {...props}
      >
        {isLoading && (
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
