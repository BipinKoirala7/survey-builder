"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { z } from "zod";
import type {
  PublicSurvey,
  Question,
  Answers,
  AnswerValue,
} from "@/lib/types";
import { getVisibleQuestions } from "@/lib/visibility";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

// Draft storage helpers
function draftKey(surveyId: string, version: number): string {
  return `sb_draft_${surveyId}_v${version}`;
}

function saveDraft(surveyId: string, version: number, answers: Answers): void {
  try {
    localStorage.setItem(draftKey(surveyId, version), JSON.stringify(answers));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

function loadDraft(surveyId: string, version: number): Answers | null {
  try {
    const raw = localStorage.getItem(draftKey(surveyId, version));
    if (!raw) return null;
    return JSON.parse(raw) as Answers;
  } catch {
    return null;
  }
}

function clearDraft(surveyId: string, version: number): void {
  try {
    localStorage.removeItem(draftKey(surveyId, version));
  } catch {
    // ignore
  }
}

// Build a zod schema for visible questions only
function buildAnswerSchema(questions: Question[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) {
    switch (q.type) {
      case "text":
        if (q.required) {
          shape[q.id] = z
            .string()
            .trim()
            .min(1, "This question is required")
            .max(5000);
        } else {
          shape[q.id] = z
            .preprocess(
              (val) =>
                val === null || val === undefined || (typeof val === "string" && val.trim() === "")
                  ? undefined
                  : val,
              z.string().trim().max(5000).optional()
            );
        }
        break;
      case "single":
        if (q.required) {
          shape[q.id] = z
            .string()
            .refine(
              (val) => val && val.trim() !== "" && q.options.includes(val),
              { message: q.options.length ? "Invalid option" : "This question is required" }
            )
            .superRefine((val, ctx) => {
              if (!val || val.trim() === "") {
                ctx.addIssue({ code: "custom", message: "This question is required" });
              } else if (!q.options.includes(val)) {
                ctx.addIssue({ code: "custom", message: "Invalid option" });
              }
            });
        } else {
          shape[q.id] = z
            .preprocess(
              (val) =>
                val === null || val === undefined || (typeof val === "string" && val.trim() === "")
                  ? undefined
                  : val,
              z.string().refine((val) => q.options.includes(val), { message: "Invalid option" }).optional()
            );
        }
        break;
      case "multi":
        if (q.required) {
          shape[q.id] = z
            .array(z.string())
            .superRefine((arr, ctx) => {
              if (arr.length === 0) {
                ctx.addIssue({ code: "custom", message: "This question is required" });
                return;
              }
              const seen = new Set<string>();
              for (const item of arr) {
                if (!q.options.includes(item)) {
                  ctx.addIssue({ code: "custom", message: "Invalid option" });
                }
                if (seen.has(item)) {
                  ctx.addIssue({ code: "custom", message: "Duplicate options are not allowed" });
                }
                seen.add(item);
              }
            });
        } else {
          shape[q.id] = z
            .preprocess(
              (val) =>
                val === null || val === undefined || (Array.isArray(val) && val.length === 0)
                  ? undefined
                  : val,
              z
                .array(z.string())
                .superRefine((arr, ctx) => {
                  const seen = new Set<string>();
                  for (const item of arr) {
                    if (!q.options.includes(item)) {
                      ctx.addIssue({ code: "custom", message: "Invalid option" });
                    }
                    if (seen.has(item)) {
                      ctx.addIssue({ code: "custom", message: "Duplicate options are not allowed" });
                    }
                    seen.add(item);
                  }
                })
                .optional()
            );
        }
        break;
      case "rating":
        if (q.required) {
          shape[q.id] = z
            .number()
            .int("Rating must be an integer")
            .min(1, "Rating must be between 1 and 5")
            .max(5, "Rating must be between 1 and 5");
        } else {
          shape[q.id] = z
            .preprocess(
              (val) => (val === null || val === undefined ? undefined : val),
              z
                .number()
                .int("Rating must be an integer")
                .min(1, "Rating must be between 1 and 5")
                .max(5, "Rating must be between 1 and 5")
                .optional()
            );
        }
        break;
    }
  }
  return z.object(shape);
}

interface SurveyFormProps {
  surveyId: string;
}

export default function SurveyForm({ surveyId }: SurveyFormProps) {
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadNotFound, setLoadNotFound] = useState(false);

  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load survey
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiGet<PublicSurvey>(`/api/public/surveys/${surveyId}`);
        if (!cancelled) {
          setSurvey(data);
          setLoading(false);

          // Try to restore draft
          const draft = loadDraft(data._id, data.version);
          if (draft) {
            // Only keep keys that match current question ids
            const validIds = new Set(data.questions.map((q) => q.id));
            const filtered: Answers = {};
            for (const [key, val] of Object.entries(draft)) {
              if (validIds.has(key)) {
                filtered[key] = val;
              }
            }
            if (Object.keys(filtered).length > 0) {
              setAnswers(filtered);
              setDraftRestored(true);
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setLoadNotFound(true);
        } else {
          setLoadError(err instanceof Error ? err.message : "Failed to load survey");
        }
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  // Compute visible questions
  const visibleQuestions = useMemo(
    () => (survey ? getVisibleQuestions(survey.questions, answers) : []),
    [survey, answers]
  );

  // Clear hidden question values when visibility changes — done inline in handleAnswerChange
  // and when answers change, so we don't need a separate effect that calls setState.

  // Autosave draft (debounced ~500ms)
  useEffect(() => {
    if (!survey || submitted) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveDraft(survey._id, survey.version, answers);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers, survey, submitted]);

  // Answer change handler — also clears values for questions that become hidden
  const handleAnswerChange = useCallback(
    (questionId: string, value: AnswerValue | undefined) => {
      setAnswers((prev) => {
        const next = { ...prev };
        if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
          delete next[questionId];
        } else {
          next[questionId] = value;
        }
        // Re-evaluate visibility with the new answers and clear hidden values
        if (survey) {
          const updatedVisible = getVisibleQuestions(survey.questions, next);
          const visibleIds = new Set(updatedVisible.map((q) => q.id));
          for (const key of Object.keys(next)) {
            if (!visibleIds.has(key)) {
              delete next[key];
            }
          }
        }
        return next;
      });
      // Clear error for this question
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      setSubmitError(null);
    },
    [survey]
  );

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!survey) return;

      setSubmitError(null);
      setErrors({});

      // Build schema and validate
      const schema = buildAnswerSchema(visibleQuestions);
      const result = schema.safeParse(answers);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const qId = issue.path[0] as string;
          if (qId && !fieldErrors[qId]) {
            fieldErrors[qId] = issue.message;
          }
        }
        setErrors(fieldErrors);
        // Focus first invalid question
        setTimeout(() => {
          const firstQId = Object.keys(fieldErrors)[0];
          if (firstQId) {
            const el = document.getElementById(`question-${firstQId}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
        return;
      }

      // Build answers object — only visible, non-empty
      const cleaned: Answers = {};
      for (const q of visibleQuestions) {
        const val = answers[q.id];
        if (val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0)) {
          cleaned[q.id] = val;
        }
      }

      setSubmitting(true);
      try {
        await apiPost<{ id: string }>(
          `/api/public/surveys/${surveyId}/responses`,
          { answers: cleaned }
        );
        // Success
        clearDraft(survey._id, survey.version);
        setSubmitted(true);
        setAnswers({});
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setLoadNotFound(true);
            setLoading(false);
            return;
          }
          if (err.status === 429) {
            setSubmitError(
              "Too many submissions from your network, please try again in a few minutes."
            );
          } else if (err.status === 400 && err.issues) {
            // Map issue path (question id) to error
            const fieldErrors: Record<string, string> = {};
            for (const issue of err.issues) {
              const qId = issue.path;
              if (qId && !fieldErrors[qId]) {
                fieldErrors[qId] = issue.message;
              }
            }
            setErrors(fieldErrors);
            setTimeout(() => {
              const firstQId = Object.keys(fieldErrors)[0];
              if (firstQId) {
                const el = document.getElementById(`question-${firstQId}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 100);
          } else {
            setSubmitError(err.message);
          }
        } else {
          setSubmitError("Failed to submit. Please try again.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [survey, visibleQuestions, answers, surveyId]
  );

  // Reset form for another response
  const handleReset = useCallback(() => {
    setSubmitted(false);
    setAnswers({});
    setErrors({});
    setSubmitError(null);
  }, []);

  // Clear draft
  const handleClearDraft = useCallback(() => {
    if (survey) {
      clearDraft(survey._id, survey.version);
      setAnswers({});
    }
    setDraftRestored(false);
  }, [survey]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardBody className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" aria-label="Loading survey" />
              <p className="text-muted text-sm">Loading survey…</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Not found
  if (loadNotFound) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardBody className="text-center py-16">
            <h1 className="text-2xl font-bold text-ink mb-2">
              This survey is not available
            </h1>
            <p className="text-muted mb-6">
              The survey you&apos;re looking for may have been removed or is no longer accepting responses.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Load error
  if (loadError) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardBody className="text-center py-16">
            <h1 className="text-2xl font-bold text-ink mb-2">
              Failed to load survey
            </h1>
            <p className="text-muted mb-6">{loadError}</p>
            <Button variant="secondary" size="md" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!survey) return null;

  // Thank-you screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardBody className="text-center py-16">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-success"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ink mb-2">Thank you!</h1>
            <p className="text-muted mb-6">
              Your response has been submitted successfully.
            </p>
            <Button variant="primary" size="md" onClick={handleReset}>
              Submit another response
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-canvas py-8 px-4">
      <Card className="w-full max-w-2xl mx-auto">
        {/* Survey header */}
        <div className="px-6 pt-6 pb-4 border-b border-line">
          <h1 className="text-2xl font-bold text-ink">{survey.title}</h1>
          {survey.description && (
            <p className="text-muted mt-1 text-sm leading-relaxed">{survey.description}</p>
          )}
        </div>

        <CardBody className="space-y-6">
          {/* Draft restored notice */}
          {draftRestored && (
            <Alert variant="info" onClose={handleClearDraft} className="py-3 px-4 text-xs">
              Draft restored from previous session.
            </Alert>
          )}

          {/* Submit error */}
          {submitError && (
            <Alert variant="error" onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-6">
              {visibleQuestions.map((q) => (
                <div
                  key={q.id}
                  id={`question-${q.id}`}
                  className="scroll-mt-4"
                >
                  <QuestionInput
                    question={q}
                    value={answers[q.id]}
                    error={errors[q.id] || null}
                    onChange={handleAnswerChange}
                  />
                </div>
              ))}
            </div>

            {visibleQuestions.length === 0 && (
              <div className="text-center py-8 text-muted">
                No questions to display.
              </div>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                disabled={submitting || visibleQuestions.length === 0}
                className="w-full sm:w-auto"
              >
                Submit response
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

// Individual question input component
interface QuestionInputProps {
  question: Question;
  value: AnswerValue | undefined;
  error: string | null;
  onChange: (questionId: string, value: AnswerValue | undefined) => void;
}

function QuestionInput({ question, value, error, onChange }: QuestionInputProps) {
  const { id, type, label, required, options } = question;

  const fieldId = `q-${id}`;
  const errorId = error ? `${fieldId}-error` : undefined;

  const labelContent = (
    <span>
      {label}
      {required && (
        <span className="text-danger ml-1" aria-hidden="true">
          *
        </span>
      )}
      {required && <span className="sr-only"> (required)</span>}
    </span>
  );

  switch (type) {
    case "text":
      return (
        <Field
          id={fieldId}
          label={labelContent}
          error={error}
          required={required}
        >
          {(props) => (
            <Textarea
              {...props}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(id, e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder={required ? "" : "Optional"}
            />
          )}
        </Field>
      );

    case "single":
      return (
        <fieldset
          className={`space-y-2 ${error ? "rounded-xl border border-danger/50 bg-red-50/50 -mx-2 px-2 py-3" : ""}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
        >
          <legend className="text-sm font-medium text-ink">
            {labelContent}
          </legend>
          <div className="space-y-1.5 pt-1" role="radiogroup">
            {options.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  value === option
                    ? "border-primary bg-primary-soft"
                    : "border-line hover:bg-canvas"
                }`}
              >
                <input
                  type="radio"
                  name={fieldId}
                  id={`${fieldId}-${option}`}
                  checked={value === option}
                  onChange={() => onChange(id, option)}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    value === option ? "border-primary" : "border-muted"
                  }`}
                >
                  {value === option && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
                <span className="text-sm text-ink">{option}</span>
              </label>
            ))}
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-xs text-danger font-medium mt-1">
              {error}
            </p>
          )}
        </fieldset>
      );

    case "multi":
      const selectedArray = Array.isArray(value) ? value : [];
      return (
        <fieldset
          className={`space-y-2 ${error ? "rounded-xl border border-danger/50 bg-red-50/50 -mx-2 px-2 py-3" : ""}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
        >
          <legend className="text-sm font-medium text-ink">
            {labelContent}
          </legend>
          <div className="space-y-1.5 pt-1">
            {options.map((option) => {
              const checked = selectedArray.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? "border-primary bg-primary-soft"
                      : "border-line hover:bg-canvas"
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`${fieldId}-${option}`}
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange(id, [...selectedArray, option]);
                      } else {
                        onChange(
                          id,
                          selectedArray.filter((v) => v !== option)
                        );
                      }
                    }}
                    className="sr-only"
                  />
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                      checked ? "border-primary bg-primary" : "border-muted"
                    }`}
                  >
                    {checked && (
                      <svg
                        className="w-3 h-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm text-ink">{option}</span>
                </label>
              );
            })}
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-xs text-danger font-medium mt-1">
              {error}
            </p>
          )}
        </fieldset>
      );

    case "rating":
      const ratingValue = typeof value === "number" ? value : 0;
      return (
        <fieldset
          className={`space-y-2 ${error ? "rounded-xl border border-danger/50 bg-red-50/50 -mx-2 px-2 py-3" : ""}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
        >
          <legend className="text-sm font-medium text-ink">
            {labelContent}
          </legend>
          <div className="flex items-center gap-2 pt-1" role="radiogroup" aria-label={label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className={`flex-1 flex items-center justify-center py-3 rounded-lg border-2 cursor-pointer transition-all text-lg font-semibold ${
                  ratingValue === n
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-line text-muted hover:bg-canvas hover:border-muted"
                }`}
              >
                <input
                  type="radio"
                  name={fieldId}
                  id={`${fieldId}-${n}`}
                  checked={ratingValue === n}
                  onChange={() => onChange(id, n)}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-xs text-danger font-medium mt-1">
              {error}
            </p>
          )}
        </fieldset>
      );

    default:
      return null;
  }
}
