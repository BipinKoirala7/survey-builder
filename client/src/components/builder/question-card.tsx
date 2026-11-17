import React from "react";
import type { QuestionFormData, ShowIfFormData } from "./schema";
import type { QuestionType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GripIcon, TrashIcon, ChevronDownIcon } from "@/components/ui/icons";
import { OptionsEditor } from "./options-editor";
import { ConditionEditor } from "./condition-editor";

export interface QuestionCardProps {
  index: number;
  totalQuestions: number;
  question: QuestionFormData;
  allQuestions: QuestionFormData[];
  onChange: (updatedQuestion: QuestionFormData) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  errors?: {
    label?: string;
    options?: string;
    showIf?: string;
    id?: string;
  };
  warning?: string | null;
  onDismissWarning?: () => void;
  disabled?: boolean;
  // Drag and drop props
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export function QuestionCard({
  index,
  totalQuestions,
  question,
  allQuestions,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  errors,
  warning,
  onDismissWarning,
  disabled = false,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: QuestionCardProps) {
  const handleTypeChange = (newType: QuestionType) => {
    let updatedOptions = [...question.options];

    if (newType === "single" || newType === "multi") {
      if (updatedOptions.length < 2) {
        updatedOptions = ["Option 1", "Option 2"];
      }
    } else {
      updatedOptions = [];
    }

    onChange({
      ...question,
      type: newType,
      options: updatedOptions,
    });
  };

  const handleLabelChange = (newLabel: string) => {
    onChange({
      ...question,
      label: newLabel,
    });
  };

  const handleRequiredChange = (newRequired: boolean) => {
    onChange({
      ...question,
      required: newRequired,
    });
  };

  const handleOptionsChange = (newOptions: string[]) => {
    onChange({
      ...question,
      options: newOptions,
    });
  };

  const handleShowIfChange = (newShowIf: ShowIfFormData | null) => {
    onChange({
      ...question,
      showIf: newShowIf,
    });
  };

  return (
    <div
      id={`question-card-${question.id}`}
      draggable={!disabled && Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`bg-surface border rounded-xl p-5 shadow-xs transition-all ${
        isDragging
          ? "opacity-50 border-primary ring-2 ring-primary/20 scale-[0.99]"
          : "border-line hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle, Question Number and Move Up/Down */}
        <div className="flex flex-col items-center gap-1 pt-1 select-none shrink-0">
          <div
            className="p-1 rounded text-muted hover:text-ink cursor-grab active:cursor-grabbing hover:bg-canvas transition-colors"
            title="Drag to reorder"
            aria-label={`Drag to reorder question ${index + 1}`}
          >
            <GripIcon className="w-5 h-5 text-muted" />
          </div>
          <span className="text-xs font-bold text-muted bg-canvas px-1.5 py-0.5 rounded border border-line">
            Q{index + 1}
          </span>
          <div className="flex flex-col gap-0.5 mt-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={disabled || index === 0}
              aria-label={`Move question ${index + 1} up`}
              title="Move up"
              className="p-1 rounded text-muted hover:text-ink hover:bg-canvas disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDownIcon className="w-3.5 h-3.5 rotate-180" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={disabled || index === totalQuestions - 1}
              aria-label={`Move question ${index + 1} down`}
              title="Move down"
              className="p-1 rounded text-muted hover:text-ink hover:bg-canvas disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Top row: Label, Type Select, Required checkbox, Delete */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-muted mb-1">
                Question text <span className="text-danger">*</span>
              </label>
              <Input
                value={question.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Question text"
                disabled={disabled}
                hasError={Boolean(errors?.label)}
                className="font-medium"
              />
              {errors?.label && (
                <p role="alert" className="text-xs text-danger font-medium mt-1">
                  {errors.label}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-muted mb-1">
                Type
              </label>
              <Select
                value={question.type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                disabled={disabled}
              >
                <option value="text">Text input</option>
                <option value="single">Multiple choice (single select)</option>
                <option value="multi">Checkboxes (multi select)</option>
                <option value="rating">Rating 1 to 5</option>
              </Select>
            </div>

            <div className="sm:col-span-2 flex items-center pt-6">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-ink">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => handleRequiredChange(e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-line text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                />
                Required
              </label>
            </div>

            <div className="sm:col-span-1 flex justify-end pt-5">
              <button
                type="button"
                onClick={onDelete}
                disabled={disabled}
                className="p-2 rounded-lg text-muted hover:text-danger hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-danger transition-colors disabled:opacity-50"
                aria-label={`Delete question ${index + 1}`}
                title="Delete question"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Options Editor for single / multi */}
          {(question.type === "single" || question.type === "multi") && (
            <div className="pt-2">
              <OptionsEditor
                options={question.options}
                onChange={handleOptionsChange}
                error={errors?.options}
                disabled={disabled}
              />
            </div>
          )}

          {/* Rating preview */}
          {question.type === "rating" && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-muted mb-2">
                Preview (Rating 1 - 5)
              </label>
              <div className="flex items-center gap-2 select-none" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((num) => (
                  <div
                    key={num}
                    className="w-9 h-9 rounded-full border border-line bg-canvas/80 text-muted flex items-center justify-center text-xs font-semibold"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text preview */}
          {question.type === "text" && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-muted mb-1">
                Preview (Text response)
              </label>
              <Input
                disabled
                placeholder="Respondent will type their answer here..."
                className="bg-canvas/60 text-muted cursor-not-allowed border-dashed text-xs"
                tabIndex={-1}
                readOnly
              />
            </div>
          )}

          {/* Condition Editor */}
          <ConditionEditor
            currentQuestionIndex={index}
            allQuestions={allQuestions}
            showIf={question.showIf}
            onChange={handleShowIfChange}
            error={errors?.showIf}
            warning={warning}
            onDismissWarning={onDismissWarning}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
