import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "quiet" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-control select-none text-label disabled:opacity-50 disabled:pointer-events-none transition-colors duration-120";

    const variantStyles = {
      primary:
        "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-hover border border-transparent",
      secondary:
        "bg-surface text-text border border-border hover:bg-hover active:bg-hover",
      outline:
        "bg-surface text-text border border-border hover:bg-hover active:bg-hover",
      ghost:
        "bg-transparent text-muted hover:text-text hover:bg-hover border border-transparent",
      quiet:
        "bg-transparent text-muted hover:text-text hover:bg-hover border border-transparent",
      danger:
        "bg-bad text-on-accent hover:bg-bad-ink border border-transparent",
      destructive:
        "bg-bad text-on-accent hover:bg-bad-ink border border-transparent",
    };

    // 40px desktop, 44px phone
    const sizeStyles = {
      sm: "h-11 sm:h-10 px-3 gap-1.5",
      md: "h-11 sm:h-10 px-4 gap-2",
      lg: "h-11 sm:h-10 px-5 gap-2",
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
