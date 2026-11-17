import { z } from "zod";
import type { QuestionType, ShowIfOperator } from "@/lib/types";

export const QUESTION_TYPES: readonly QuestionType[] = [
  "text",
  "single",
  "multi",
  "rating",
] as const;

export const OPERATORS: readonly ShowIfOperator[] = [
  "equals",
  "notEquals",
  "includes",
] as const;

export const showIfSchema = z.object({
  questionId: z.string().min(1, "Question reference is required"),
  operator: z.enum(["equals", "notEquals", "includes"] as const),
  value: z.union([z.string().min(1, "Value is required"), z.number()]),
});

export const questionSchema = z.object({
  id: z.string().min(1, "Question ID is required"),
  type: z.enum(["text", "single", "multi", "rating"] as const),
  label: z.string().trim().min(1, "Question text is required"),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1, "Option cannot be empty")).default([]),
  showIf: showIfSchema.nullable().default(null),
});

export const surveyFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200, "Title is too long (max 200 characters)"),
    description: z.string().trim().max(2000, "Description is too long (max 2000 characters)").default(""),
    status: z.enum(["draft", "published"] as const).default("draft"),
    questions: z.array(questionSchema).max(100, "Maximum 100 questions allowed"),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();

    data.questions.forEach((q, i) => {
      const addError = (path: (string | number)[], message: string) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", i, ...path],
          message,
        });
      };

      if (ids.has(q.id)) {
        addError(["id"], "Duplicate question ID");
      }
      ids.add(q.id);

      if (q.type === "single" || q.type === "multi") {
        if (q.options.length < 2) {
          addError(["options"], "Add at least 2 options");
        }
        const trimmedOptions = q.options.map((opt) => opt.trim());
        if (trimmedOptions.some((opt) => opt.length === 0)) {
          addError(["options"], "Options cannot be empty");
        }
        if (new Set(trimmedOptions).size !== trimmedOptions.length) {
          addError(["options"], "Options must be unique");
        }
      }

      if (q.showIf) {
        const depIndex = data.questions.findIndex((x) => x.id === q.showIf!.questionId);
        if (depIndex === -1 || depIndex >= i) {
          addError(["showIf", "questionId"], "Condition must reference an earlier question");
          return;
        }

        const dep = data.questions[depIndex];
        const { operator, value } = q.showIf;

        if (dep.type === "text") {
          addError(["showIf", "questionId"], "Cannot depend on a text question");
          return;
        }

        if (operator === "includes" && dep.type !== "multi") {
          addError(["showIf", "operator"], '"includes" only works with checkbox questions');
        }
        if (operator !== "includes" && dep.type === "multi") {
          addError(["showIf", "operator"], 'Use "includes" for checkbox questions');
        }

        if ((dep.type === "single" || dep.type === "multi") && !dep.options.includes(String(value))) {
          addError(["showIf", "value"], "Condition value must be one of the question's options");
        }

        if (dep.type === "rating") {
          const num = Number(value);
          if (isNaN(num) || num < 1 || num > 5) {
            addError(["showIf", "value"], "Rating condition must be 1 to 5");
          }
        }
      }
    });
  });

export type SurveyFormData = z.infer<typeof surveyFormSchema>;
export type QuestionFormData = z.infer<typeof questionSchema>;
export type ShowIfFormData = z.infer<typeof showIfSchema>;
