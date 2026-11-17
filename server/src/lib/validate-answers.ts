import { z } from "zod";
import { getVisibleQuestions, type Question } from "./visibility.js";

function buildQuestionSchema(q: Question): z.ZodType {
  const isReq = !!q.required;
  const options = q.options ?? [];

  switch (q.type) {
    case "text":
      if (isReq) {
        return z
          .string({
            error: (issue) =>
              issue.input === undefined || issue.input === null
                ? "This question is required"
                : undefined,
          })
          .trim()
          .min(1, "This question is required")
          .max(5000);
      }
      return z.preprocess(
        (val) =>
          val === null || val === undefined || (typeof val === "string" && val.trim() === "")
            ? undefined
            : val,
        z.string().trim().max(5000).optional(),
      );

    case "single":
      if (isReq) {
        return z
          .string({
            error: (issue) =>
              issue.input === undefined || issue.input === null
                ? "This question is required"
                : undefined,
          })
          .superRefine((val, ctx) => {
            if (!val || val.trim() === "") {
              ctx.addIssue({ code: "custom", message: "This question is required" });
              return;
            }
            if (!options.includes(val)) {
              ctx.addIssue({ code: "custom", message: "Invalid option" });
            }
          });
      }
      return z.preprocess(
        (val) =>
          val === null || val === undefined || (typeof val === "string" && val.trim() === "")
            ? undefined
            : val,
        z
          .string()
          .refine((val) => options.includes(val), { message: "Invalid option" })
          .optional(),
      );

    case "multi":
      if (isReq) {
        return z
          .array(z.string(), {
            error: (issue) =>
              issue.input === undefined || issue.input === null
                ? "This question is required"
                : undefined,
          })
          .superRefine((arr, ctx) => {
            if (arr.length === 0) {
              ctx.addIssue({ code: "custom", message: "This question is required" });
              return;
            }
            const seen = new Set<string>();
            for (const item of arr) {
              if (!options.includes(item)) {
                ctx.addIssue({ code: "custom", message: "Invalid option" });
              }
              if (seen.has(item)) {
                ctx.addIssue({ code: "custom", message: "Duplicate options are not allowed" });
              }
              seen.add(item);
            }
          });
      }
      return z.preprocess(
        (val) =>
          val === null || val === undefined || (Array.isArray(val) && val.length === 0)
            ? undefined
            : val,
        z
          .array(z.string())
          .superRefine((arr, ctx) => {
            const seen = new Set<string>();
            for (const item of arr) {
              if (!options.includes(item)) {
                ctx.addIssue({ code: "custom", message: "Invalid option" });
              }
              if (seen.has(item)) {
                ctx.addIssue({ code: "custom", message: "Duplicate options are not allowed" });
              }
              seen.add(item);
            }
          })
          .optional(),
      );

    case "rating":
      if (isReq) {
        return z
          .number({
            error: (issue) =>
              issue.input === undefined || issue.input === null
                ? "This question is required"
                : undefined,
          })
          .int("Rating must be an integer")
          .min(1, "Rating must be between 1 and 5")
          .max(5, "Rating must be between 1 and 5");
      }
      return z.preprocess(
        (val) => (val === null || val === undefined ? undefined : val),
        z
          .number()
          .int("Rating must be an integer")
          .min(1, "Rating must be between 1 and 5")
          .max(5, "Rating must be between 1 and 5")
          .optional(),
      );

    default:
      return z.any();
  }
}

export function validateAnswers(
  questions: Question[],
  rawAnswers: Record<string, unknown>,
): Record<string, string | string[] | number> {
  const visible = getVisibleQuestions(questions, rawAnswers);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of visible) {
    shape[q.id] = buildQuestionSchema(q);
  }

  const schema = z.object(shape);
  const parsed = schema.parse(rawAnswers);

  const cleaned: Record<string, string | string[] | number> = {};
  for (const [key, val] of Object.entries(parsed)) {
    if (val !== undefined) {
      cleaned[key] = val as string | string[] | number;
    }
  }

  return cleaned;
}
