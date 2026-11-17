import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";

export interface OptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function OptionsEditor({
  options,
  onChange,
  error,
  disabled = false,
}: OptionsEditorProps) {
  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onChange(updated);
  };

  const handleAddOption = () => {
    const nextNumber = options.length + 1;
    onChange([...options, `Option ${nextNumber}`]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      // Still allow removal or keep minimum 2 options
      const updated = options.filter((_, i) => i !== index);
      onChange(updated);
      return;
    }
    const updated = options.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
          Options ({options.length})
        </label>
        {options.length < 2 && (
          <span className="text-xs text-danger font-medium">
            At least 2 options required
          </span>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted w-5 text-right">
              {idx + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <Input
                value={option}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                disabled={disabled}
                hasError={Boolean(error && !option.trim())}
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveOption(idx)}
              disabled={disabled || options.length <= 2}
              className={`p-2 rounded-lg text-muted hover:text-danger hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-danger transition-colors ${
                options.length <= 2
                  ? "opacity-40 cursor-not-allowed hover:text-muted hover:bg-transparent"
                  : ""
              }`}
              title={
                options.length <= 2
                  ? "Minimum 2 options required"
                  : "Remove option"
              }
              aria-label={`Remove option ${idx + 1}`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger font-medium mt-1">
          {error}
        </p>
      )}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAddOption}
          disabled={disabled}
          className="text-xs font-medium"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add option
        </Button>
      </div>
    </div>
  );
}
