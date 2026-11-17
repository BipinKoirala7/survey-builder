"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Survey, SurveyInput, SurveyStatus, QuestionType } from "@/lib/types";
import { apiPost, apiPut, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  ArrowLeftIcon,
  CopyIcon,
  CheckIcon,
  PlusIcon,
} from "@/components/ui/icons";
import {
  surveyFormSchema,
  type SurveyFormData,
  type QuestionFormData,
} from "./schema";
import { QuestionCard } from "./question-card";

export interface SurveyBuilderProps {
  initialSurvey?: Survey | null;
  isNew?: boolean;
}

export function SurveyBuilder({
  initialSurvey,
  isNew = false,
}: SurveyBuilderProps) {
  const router = useRouter();

  // Form State
  const [surveyId, setSurveyId] = useState<string | null>(
    initialSurvey?._id || null
  );
  const [title, setTitle] = useState<string>(initialSurvey?.title || "");
  const [description, setDescription] = useState<string>(
    initialSurvey?.description || ""
  );
  const [status, setStatus] = useState<SurveyStatus>(
    initialSurvey?.status || "draft"
  );
  const [questions, setQuestions] = useState<QuestionFormData[]>(() => {
    if (!initialSurvey?.questions) return [];
    return [...initialSurvey.questions]
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        id: q.id,
        type: q.type,
        label: q.label,
        required: Boolean(q.required),
        options: [...(q.options || [])],
        showIf: q.showIf ? { ...q.showIf } : null,
      }));
  });

  // UI State
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [unhandledIssues, setUnhandledIssues] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Field validation errors
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [questionErrors, setQuestionErrors] = useState<
    Record<
      string,
      { label?: string; options?: string; showIf?: string; id?: string }
    >
  >({});

  // Question warnings (e.g. condition removed)
  const [questionWarnings, setQuestionWarnings] = useState<
    Record<string, string>
  >({});

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Mark as dirty on changes
  const markDirty = () => {
    if (!isDirty) {
      setIsDirty(true);
    }
    setSuccessMessage(null);
  };

  // Warn on leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Clean and validate conditional dependencies whenever question list or types/options change
  const validateConditions = useCallback(
    (currentQuestions: QuestionFormData[]): {
      cleanedQuestions: QuestionFormData[];
      newWarnings: Record<string, string>;
    } => {
      let changed = false;
      const newWarnings: Record<string, string> = { ...questionWarnings };

      const cleanedQuestions = currentQuestions.map((q, idx) => {
        if (!q.showIf) return q;

        const depIndex = currentQuestions.findIndex(
          (x) => x.id === q.showIf!.questionId
        );
        let shouldClear = false;

        if (depIndex === -1 || depIndex >= idx) {
          // Question deleted or moved below
          shouldClear = true;
        } else {
          const dep = currentQuestions[depIndex];
          if (dep.type === "text") {
            shouldClear = true;
          } else if (dep.type === "single" || dep.type === "multi") {
            if (!dep.options.includes(String(q.showIf.value))) {
              shouldClear = true;
            }
          } else if (dep.type === "rating") {
            const num = Number(q.showIf.value);
            if (isNaN(num) || num < 1 || num > 5) {
              shouldClear = true;
            }
          }
        }

        if (shouldClear) {
          changed = true;
          newWarnings[q.id] =
            "Condition removed because the question it depended on changed.";
          return {
            ...q,
            showIf: null,
          };
        }

        return q;
      });

      return {
        cleanedQuestions: changed ? cleanedQuestions : currentQuestions,
        newWarnings,
      };
    },
    [questionWarnings]
  );

  // Helper to update questions state with condition check
  const updateQuestions = (
    updater:
      | QuestionFormData[]
      | ((prev: QuestionFormData[]) => QuestionFormData[])
  ) => {
    markDirty();
    setQuestions((prev) => {
      const nextQuestions =
        typeof updater === "function" ? updater(prev) : updater;
      const { cleanedQuestions, newWarnings } = validateConditions(nextQuestions);
      setQuestionWarnings(newWarnings);
      return cleanedQuestions;
    });
  };

  // Add question handler
  const handleAddQuestion = (type: QuestionType) => {
    markDirty();
    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let defaultOptions: string[] = [];
    if (type === "single" || type === "multi") {
      defaultOptions = ["Option 1", "Option 2"];
    }

    const newQuestion: QuestionFormData = {
      id: newId,
      type,
      label: "",
      required: false,
      options: defaultOptions,
      showIf: null,
    };

    setQuestions((prev) => [...prev, newQuestion]);

    // Scroll to the new question card after render
    setTimeout(() => {
      const el = document.getElementById(`question-card-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector("input");
        if (input) input.focus();
      }
    }, 50);
  };

  // Question update handler
  const handleQuestionChange = (
    index: number,
    updatedQuestion: QuestionFormData
  ) => {
    updateQuestions((prev) => {
      const next = [...prev];
      next[index] = updatedQuestion;
      return next;
    });
  };

  // Question delete handler
  const handleDeleteQuestion = (index: number) => {
    updateQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Move question up/down
  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    updateQuestions((prev) => {
      const next = [...prev];
      const [movedItem] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedItem);
      return next;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    handleMoveQuestion(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Dismiss warning
  const handleDismissWarning = (questionId: string) => {
    setQuestionWarnings((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  // Copy public link
  const handleCopyLink = async () => {
    if (!surveyId) return;
    const url = `${window.location.origin}/s/${surveyId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Validation function
  const validateForm = (): boolean => {
    setTitleError(null);
    setDescriptionError(null);
    setQuestionErrors({});
    setGeneralError(null);
    setUnhandledIssues([]);

    const formData: SurveyFormData = {
      title,
      description,
      status,
      questions,
    };

    const result = surveyFormSchema.safeParse(formData);

    if (!result.success) {
      const newQuestionErrors: Record<
        string,
        { label?: string; options?: string; showIf?: string; id?: string }
      > = {};
      let firstErrorElementId: string | null = null;

      result.error.issues.forEach((issue) => {
        const path = issue.path;
        if (path[0] === "title") {
          setTitleError(issue.message);
          if (!firstErrorElementId) firstErrorElementId = "survey-title";
        } else if (path[0] === "description") {
          setDescriptionError(issue.message);
          if (!firstErrorElementId) firstErrorElementId = "survey-description";
        } else if (path[0] === "questions") {
          const qIdx = path[1] as number;
          const question = questions[qIdx];
          if (question) {
            const field = path[2] as string;
            if (!newQuestionErrors[question.id]) {
              newQuestionErrors[question.id] = {};
            }
            if (field === "label") {
              newQuestionErrors[question.id].label = issue.message;
            } else if (field === "options") {
              newQuestionErrors[question.id].options = issue.message;
            } else if (field === "showIf") {
              newQuestionErrors[question.id].showIf = issue.message;
            } else if (field === "id") {
              newQuestionErrors[question.id].id = issue.message;
            }
            if (!firstErrorElementId) {
              firstErrorElementId = `question-card-${question.id}`;
            }
          }
        }
      });

      setQuestionErrors(newQuestionErrors);

      // Stop and scroll to first error
      if (firstErrorElementId) {
        setTimeout(() => {
          const el = document.getElementById(firstErrorElementId!);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const input = el.querySelector("input, textarea, select");
            if (input instanceof HTMLElement) input.focus();
          }
        }, 50);
      }

      return false;
    }

    return true;
  };

  // Save handler
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setSuccessMessage(null);
    setGeneralError(null);
    setUnhandledIssues([]);

    const payload: SurveyInput = {
      title: title.trim(),
      description: description.trim(),
      status,
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        label: q.label.trim(),
        required: q.required,
        options:
          q.type === "single" || q.type === "multi"
            ? q.options.map((opt) => opt.trim())
            : [],
        showIf: q.showIf,
      })),
    };

    try {
      if (isNew || !surveyId) {
        const created = await apiPost<Survey>("/api/surveys", payload, {
          auth: true,
        });
        setIsDirty(false);
        setSuccessMessage("Survey created successfully!");
        setSurveyId(created._id);
        // Replace route to edit mode
        router.replace(`/admin/surveys/${created._id}`);
      } else {
        const updated = await apiPut<Survey>(
          `/api/surveys/${surveyId}`,
          payload,
          {
            auth: true,
          }
        );
        setIsDirty(false);
        setSuccessMessage("Survey saved successfully!");
        // Update local state with normalized survey
        if (updated) {
          setTitle(updated.title);
          setDescription(updated.description);
          setStatus(updated.status);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.issues && err.issues.length > 0) {
          const newQuestionErrors: Record<
            string,
            { label?: string; options?: string; showIf?: string; id?: string }
          > = {};
          const unhandled: string[] = [];

          err.issues.forEach((issue) => {
            const parts = issue.path.split(".");
            if (parts[0] === "title") {
              setTitleError(issue.message);
            } else if (parts[0] === "description") {
              setDescriptionError(issue.message);
            } else if (parts[0] === "questions") {
              const qIdx = parseInt(parts[1], 10);
              const question = questions[qIdx];
              if (question) {
                if (!newQuestionErrors[question.id]) {
                  newQuestionErrors[question.id] = {};
                }
                const field = parts[2];
                if (field === "label") {
                  newQuestionErrors[question.id].label = issue.message;
                } else if (field === "options") {
                  newQuestionErrors[question.id].options = issue.message;
                } else if (field === "showIf") {
                  newQuestionErrors[question.id].showIf = issue.message;
                } else {
                  unhandled.push(
                    `Question ${qIdx + 1}: ${issue.message}`
                  );
                }
              } else {
                unhandled.push(issue.message);
              }
            } else {
              unhandled.push(issue.message);
            }
          });

          setQuestionErrors(newQuestionErrors);
          if (unhandled.length > 0) {
            setUnhandledIssues(unhandled);
          }
        } else {
          setGeneralError(err.message || "Failed to save survey");
        }
      } else {
        setGeneralError("An unexpected error occurred while saving the survey.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-30 bg-canvas/95 backdrop-blur-md border-b border-line -mx-4 px-4 sm:-mx-6 sm:px-6 py-3.5 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-5xl mx-auto">
          {/* Left: Back Link & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-line transition-colors"
              title="Back to surveys"
              aria-label="Back to surveys"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-ink leading-none">
                {isNew ? "New survey" : "Edit survey"}
              </h1>
              {isDirty && (
                <span className="text-xs text-amber-600 font-medium">
                  • Unsaved changes
                </span>
              )}
            </div>
          </div>

          {/* Right: Status select, Copy link, Save button */}
          <div className="flex items-center gap-2.5">
            {/* Status Select */}
            <div className="w-32">
              <Select
                value={status}
                onChange={(e) => {
                  markDirty();
                  setStatus(e.target.value as SurveyStatus);
                }}
                disabled={saving}
                className="text-xs py-1.5 font-medium"
                aria-label="Survey status"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </div>

            {/* Copy Public Link Button (only when published & saved) */}
            {status === "published" && surveyId && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCopyLink}
                className="text-xs font-medium"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-4 h-4 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-4 h-4" />
                    Copy public link
                  </>
                )}
              </Button>
            )}

            {/* Save Button */}
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={saving}
              onClick={handleSave}
              className="text-xs font-semibold px-5"
            >
              {saving ? "Saving..." : "Save survey"}
            </Button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <Alert
          variant="success"
          onClose={() => setSuccessMessage(null)}
          className="shadow-xs"
        >
          {successMessage}
        </Alert>
      )}

      {generalError && (
        <Alert
          variant="error"
          title="Save Failed"
          onClose={() => setGeneralError(null)}
          className="shadow-xs"
        >
          {generalError}
        </Alert>
      )}

      {unhandledIssues.length > 0 && (
        <Alert
          variant="error"
          title="Validation errors"
          onClose={() => setUnhandledIssues([])}
          className="shadow-xs"
        >
          <ul className="list-disc list-inside space-y-1">
            {unhandledIssues.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Survey Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field
            id="survey-title"
            label="Survey Title"
            required
            error={titleError || undefined}
          >
            <Input
              value={title}
              onChange={(e) => {
                markDirty();
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder="e.g. Customer Satisfaction Survey"
              disabled={saving}
              hasError={Boolean(titleError)}
              className="font-medium text-base"
            />
          </Field>

          <Field
            id="survey-description"
            label="Description"
            hint="Provide optional context or instructions for respondents."
            error={descriptionError || undefined}
          >
            <Textarea
              value={description}
              onChange={(e) => {
                markDirty();
                setDescription(e.target.value);
                if (descriptionError) setDescriptionError(null);
              }}
              placeholder="Brief description or instructions for respondents..."
              rows={3}
              disabled={saving}
              hasError={Boolean(descriptionError)}
            />
          </Field>
        </CardBody>
      </Card>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Questions</h2>
            <p className="text-xs text-muted">
              Add questions, configure options, and set conditional visibility.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted bg-surface px-2.5 py-1 rounded-lg border border-line">
            {questions.length} {questions.length === 1 ? "question" : "questions"}
          </span>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="border-2 border-dashed border-line rounded-xl p-8 text-center bg-surface/50 space-y-4">
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-semibold text-ink">
                Add your first question
              </h3>
              <p className="text-xs text-muted">
                Choose a question type below to get started building your survey.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddQuestion("text")}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Text
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddQuestion("single")}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Multiple choice
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddQuestion("multi")}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Checkboxes
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddQuestion("rating")}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Rating
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                index={idx}
                totalQuestions={questions.length}
                question={q}
                allQuestions={questions}
                onChange={(updated) => handleQuestionChange(idx, updated)}
                onDelete={() => handleDeleteQuestion(idx)}
                onMoveUp={() => handleMoveQuestion(idx, idx - 1)}
                onMoveDown={() => handleMoveQuestion(idx, idx + 1)}
                errors={questionErrors[q.id]}
                warning={questionWarnings[q.id]}
                onDismissWarning={() => handleDismissWarning(q.id)}
                disabled={saving}
                isDragging={draggedIndex === idx}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, idx)}
              />
            ))}
          </div>
        )}

        {/* Add Question Row */}
        {questions.length > 0 && (
          <div className="bg-surface border border-line rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Add question
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddQuestion("text")}
                disabled={saving}
                className="text-xs font-medium"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Text
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddQuestion("single")}
                disabled={saving}
                className="text-xs font-medium"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Multiple choice
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddQuestion("multi")}
                disabled={saving}
                className="text-xs font-medium"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Checkboxes
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddQuestion("rating")}
                disabled={saving}
                className="text-xs font-medium"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Rating
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
