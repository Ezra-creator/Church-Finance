import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-[2px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none text-sm";

    const variantStyles = {
      primary:
        "bg-ink text-paper border border-ink hover:bg-ink/90 active:bg-black",
      secondary:
        "bg-transparent text-ink border border-rule hover:border-rule-strong hover:bg-ink/[0.03]",
      outline:
        "bg-transparent text-ink border border-rule hover:border-rule-strong hover:bg-ink/[0.03]",
      quiet:
        "bg-transparent text-ink hover:bg-ink/[0.04] border border-transparent",
      destructive:
        "bg-variance text-paper border border-variance hover:bg-variance/90",
    };

    const sizeStyles = {
      sm: "min-h-[36px] px-3 py-1.5 text-xs gap-1.5",
      md: "min-h-[44px] px-4 py-2 text-sm gap-2",
      lg: "min-h-[48px] px-6 py-2.5 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)
        )}
        {...props}
      >
        {isLoading && (
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
