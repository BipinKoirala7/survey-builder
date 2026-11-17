import React from "react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string;
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, hasError, disabled, children, ...props }, ref) => {
    const isError = Boolean(error || hasError);

    const baseClasses =
      "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-canvas disabled:cursor-not-allowed";

    const stateClasses = isError
      ? "border-danger focus:ring-danger focus:border-danger"
      : "border-line focus:ring-primary focus:border-transparent";

    return (
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={isError ? "true" : undefined}
        className={`${baseClasses} ${stateClasses} ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";
