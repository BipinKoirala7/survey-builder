import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, hasError, disabled, rows = 3, ...props }, ref) => {
    const isError = Boolean(error || hasError);

    const baseClasses =
      "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-canvas disabled:cursor-not-allowed";

    const stateClasses = isError
      ? "border-danger focus:ring-danger focus:border-danger"
      : "border-line focus:ring-primary focus:border-transparent";

    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        aria-invalid={isError ? "true" : undefined}
        className={`${baseClasses} ${stateClasses} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
