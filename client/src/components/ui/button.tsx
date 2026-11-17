import React from "react";
import Link, { type LinkProps } from "next/link";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function getButtonClassName({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}): string {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none cursor-pointer";

  const sizeClasses = {
    sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
    md: "text-sm px-4 py-2 rounded-lg gap-2",
  }[size];

  const variantClasses = {
    primary:
      "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary shadow-xs",
    secondary:
      "bg-surface text-ink border border-line hover:bg-canvas focus-visible:ring-primary shadow-xs",
    danger:
      "bg-danger text-white hover:bg-red-700 focus-visible:ring-danger shadow-xs",
    ghost:
      "bg-transparent text-ink hover:bg-line/40 focus-visible:ring-primary",
  }[variant];

  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "";

  return [baseClasses, sizeClasses, variantClasses, disabledClasses, className]
    .filter(Boolean)
    .join(" ");
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={getButtonClassName({
          variant,
          size,
          className,
          disabled: isDisabled,
        })}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  disabled = false,
  className,
  children,
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={getButtonClassName({
        variant,
        size,
        className,
        disabled,
      })}
      {...props}
    >
      {children}
    </Link>
  );
}
