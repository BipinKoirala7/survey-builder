import { z } from "zod";

export const QUESTION_TYPES = ["text", "single", "multi", "rating"] as const;
export const OPERATORS = ["equals", "notEquals", "includes"] as const;

const showIf = z.object({
  questionId: z.string().min(1),
  operator: z.enum(OPERATORS),
  value: z.union([z.string(), z.number()]),
});

const question = z.object({
  id: z.string().min(1),
  type: z.enum(QUESTION_TYPES),
  label: z.string().trim().min(1, "Question label is required"),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1, "Option cannot be empty")).default([]),
  showIf: showIf.nullable().default(null),
});

export const surveyInput = z
    .object({
      title: z.string().trim().min(1, "Title is required").max(200),
      description: z.string().trim().max(2000).default(""),
      status: z.enum(["draft", "published"]).default("draft"),
      questions: z.array(question).max(100),
    })
    .superRefine((s, ctx) => {
      const ids = new Set<string>();
      s.questions.forEach((q, i) => {
        const bad = (path: (string | number)[], message: string) =>
            ctx.addIssue({ code: "custom", path: ["questions", i, ...path], message });

        if (ids.has(q.id)) bad(["id"], "Duplicate question id");
        ids.add(q.id);

        if (q.type === "single" || q.type === "multi") {
          if (q.options.length < 2) bad(["options"], "Add at least 2 options");
          if (new Set(q.options).size !== q.options.length) bad(["options"], "Options must be unique");
        }

        if (q.showIf) {
          const depIndex = s.questions.findIndex((x) => x.id === q.showIf!.questionId);
          if (depIndex === -1 || depIndex >= i) {
            bad(["showIf", "questionId"], "Condition must reference an earlier question");
            return;
          }
          const dep = s.questions[depIndex];
          const { operator, value } = q.showIf;
          if (operator === "includes" && dep.type !== "multi") bad(["showIf", "operator"], '"includes" only works with checkbox questions');
          if (operator !== "includes" && dep.type === "multi") bad(["showIf", "operator"], 'Use "includes" for checkbox questions');
          if ((dep.type === "single" || dep.type === "multi") && !dep.options.includes(String(value))) {
            bad(["showIf", "value"], "Condition value must be one of the options");
          }
          if (dep.type === "rating" && !(Number(value) >= 1 && Number(value) <= 5)) {
            bad(["showIf", "value"], "Rating condition must be 1-5");
          }
        }
      });
    });

export type SurveyInput = z.infer<typeof surveyInput>;