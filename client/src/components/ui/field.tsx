import React, { useId } from "react";

export interface FieldProps {
  id?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children:
    | React.ReactNode
    | ((props: {
        id: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
      }) => React.ReactNode);
}

export function Field({
  id: explicitId,
  label,
  hint,
  error,
  required = false,
  className = "",
  children,
}: FieldProps) {
  const generatedId = useId();
  const fieldId = explicitId || generatedId;

  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  let content: React.ReactNode;

  if (typeof children === "function") {
    content = children({
      id: fieldId,
      "aria-describedby": describedBy,
      "aria-invalid": Boolean(error),
    });
  } else if (React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    content = React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      {
        id: (childProps.id as string) || fieldId,
        "aria-describedby":
          (childProps["aria-describedby"] as string) || describedBy,
        "aria-invalid":
          childProps["aria-invalid"] !== undefined
            ? childProps["aria-invalid"]
            : Boolean(error) || undefined,
        error: childProps.error !== undefined ? childProps.error : Boolean(error),
      }
    );
  } else {
    content = children;
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-ink"
        >
          {label}
          {required && (
            <span className="text-danger ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {content}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-danger font-medium"
        >
          {error}
        </p>
      )}
    </div>
  );
}
