export type QuestionType = "text" | "single" | "multi" | "rating";

export interface ShowIf {
  questionId: string;
  operator: "equals" | "notEquals" | "includes" | string;
  value: unknown;
}

export interface Question {
  id: string;
  type: QuestionType | string;
  label?: string;
  required?: boolean;
  order: number;
  options?: string[];
  showIf?: ShowIf | null;
}

export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return Array.isArray(value) && value.length === 0;

}

export function getVisibleQuestions(
  questions: Question[],
  answers: Record<string, unknown> = {},
): Question[] {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const visibleIds = new Set<string>();
  const visibleQuestions: Question[] = [];

  for (const q of sorted) {
    if (!q.showIf) {
      visibleIds.add(q.id);
      visibleQuestions.push(q);
      continue;
    }

    const { questionId, operator, value } = q.showIf;
    if (!visibleIds.has(questionId)) {
      continue;
    }

    const answer = answers[questionId];
    let matches = false;

    if (operator === "equals") {
      matches = !isEmpty(answer) && String(answer) === String(value);
    } else if (operator === "notEquals") {
      matches = isEmpty(answer) || String(answer) !== String(value);
    } else if (operator === "includes") {
      matches = Array.isArray(answer) && answer.map(String).includes(String(value));
    }

    if (matches) {
      visibleIds.add(q.id);
      visibleQuestions.push(q);
    }
  }

  return visibleQuestions;
}
