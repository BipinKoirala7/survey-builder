import React from "react";
import { XIcon } from "./icons";

export type AlertVariant = "error" | "success" | "info" | "warning";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  onClose,
  action,
  className = "",
}: AlertProps) {
  const variantStyles = {
    error: "bg-red-50 border-red-200 text-red-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    info: "bg-indigo-50 border-indigo-200 text-indigo-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
  }[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-xl border p-4 text-sm transition-all ${variantStyles} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {title && <h5 className="font-semibold mb-1">{title}</h5>}
          <div className="text-sm opacity-90 leading-relaxed">{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 -mr-1 -mt-1 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current"
            aria-label="Dismiss alert"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
