import React, { useId } from "react";
import type { QuestionFormData, ShowIfFormData } from "./schema";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

export interface ConditionEditorProps {
  currentQuestionIndex: number;
  allQuestions: QuestionFormData[];
  showIf: ShowIfFormData | null;
  onChange: (showIf: ShowIfFormData | null) => void;
  error?: string;
  disabled?: boolean;
  warning?: string | null;
  onDismissWarning?: () => void;
}

export function ConditionEditor({
  currentQuestionIndex,
  allQuestions,
  showIf,
  onChange,
  error,
  disabled = false,
  warning,
  onDismissWarning,
}: ConditionEditorProps) {
  const toggleId = useId();

  // Find all earlier questions that are eligible (single, multi, rating)
  const earlierQuestions = allQuestions
    .slice(0, currentQuestionIndex)
    .filter((q) => q.type === "single" || q.type === "multi" || q.type === "rating");

  const hasEligibleQuestions = earlierQuestions.length > 0;
  const isEnabled = Boolean(showIf);

  const selectedQuestion = showIf
    ? earlierQuestions.find((q) => q.id === showIf.questionId)
    : undefined;

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange(null);
      return;
    }

    if (!hasEligibleQuestions) {
      // Cannot set valid condition yet, but we initialize with empty or null
      onChange(null);
      return;
    }

    const firstDep = earlierQuestions[0];
    const operator = firstDep.type === "multi" ? "includes" : "equals";
    const defaultValue =
      firstDep.type === "rating"
        ? 1
        : firstDep.options[0] || "Option 1";

    onChange({
      questionId: firstDep.id,
      operator,
      value: defaultValue,
    });
  };

  const handleQuestionChange = (newQuestionId: string) => {
    const target = earlierQuestions.find((q) => q.id === newQuestionId);
    if (!target) return;

    const operator = target.type === "multi" ? "includes" : "equals";
    const defaultValue =
      target.type === "rating"
        ? 1
        : target.options[0] || "";

    onChange({
      questionId: newQuestionId,
      operator,
      value: defaultValue,
    });
  };

  const handleOperatorChange = (newOperator: "equals" | "notEquals" | "includes") => {
    if (!showIf) return;
    onChange({
      ...showIf,
      operator: newOperator,
    });
  };

  const handleValueChange = (newValue: string) => {
    if (!showIf) return;
    const finalValue =
      selectedQuestion?.type === "rating" ? Number(newValue) : newValue;

    onChange({
      ...showIf,
      value: finalValue,
    });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-line/70">
      {warning && (
        <Alert
          variant="warning"
          onClose={onDismissWarning}
          className="py-2 px-3 text-xs"
        >
          {warning}
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <label
          htmlFor={toggleId}
          className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-ink"
        >
          <input
            id={toggleId}
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded border-line text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
          />
          Show only if...
        </label>
        {isEnabled && (
          <span className="text-xs text-muted">Conditional visibility</span>
        )}
      </div>

      {isEnabled && (
        <div className="bg-canvas/60 rounded-lg p-3 border border-line/60 space-y-3">
          {!hasEligibleQuestions ? (
            <p className="text-xs text-muted">
              No earlier choice or rating questions available to depend on. Add or move a multiple choice, checkbox, or rating question above this one.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Question selector */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  When question
                </label>
                <Select
                  value={showIf?.questionId || ""}
                  onChange={(e) => handleQuestionChange(e.target.value)}
                  disabled={disabled}
                  className="text-xs py-1.5"
                >
                  {earlierQuestions.map((q) => {
                    const originalIndex = allQuestions.findIndex((x) => x.id === q.id);
                    const qNum = originalIndex !== -1 ? originalIndex + 1 : "?";
                    const labelText = q.label.trim() || "Untitled question";
                    const truncated =
                      labelText.length > 25 ? `${labelText.slice(0, 25)}...` : labelText;
                    return (
                      <option key={q.id} value={q.id}>
                        Q{qNum}: {truncated}
                      </option>
                    );
                  })}
                </Select>
              </div>

              {/* Operator selector */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Operator
                </label>
                {selectedQuestion?.type === "multi" ? (
                  <Select
                    value="includes"
                    disabled
                    className="text-xs py-1.5 bg-canvas cursor-not-allowed"
                  >
                    <option value="includes">includes</option>
                  </Select>
                ) : (
                  <Select
                    value={showIf?.operator || "equals"}
                    onChange={(e) =>
                      handleOperatorChange(
                        e.target.value as "equals" | "notEquals" | "includes"
                      )
                    }
                    disabled={disabled}
                    className="text-xs py-1.5"
                  >
                    <option value="equals">is</option>
                    <option value="notEquals">is not</option>
                  </Select>
                )}
              </div>

              {/* Value selector */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Value
                </label>
                {selectedQuestion?.type === "rating" ? (
                  <Select
                    value={String(showIf?.value ?? 1)}
                    onChange={(e) => handleValueChange(e.target.value)}
                    disabled={disabled}
                    className="text-xs py-1.5"
                  >
                    {[1, 2, 3, 4, 5].map((val) => (
                      <option key={val} value={val}>
                        {val} {val === 1 ? "Star" : "Stars"}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Select
                    value={String(showIf?.value ?? "")}
                    onChange={(e) => handleValueChange(e.target.value)}
                    disabled={disabled}
                    className="text-xs py-1.5"
                  >
                    {(selectedQuestion?.options || []).map((opt, optIdx) => (
                      <option key={optIdx} value={opt}>
                        {opt || `(Option ${optIdx + 1})`}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-danger font-medium">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
