"use client";

import type {
  SingleMultiQuestionAnalytics,
  RatingQuestionAnalytics,
  TextQuestionAnalytics,
} from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "./bar-chart";

interface QuestionAnalyticsCardProps {
  question:
    | SingleMultiQuestionAnalytics
    | RatingQuestionAnalytics
    | TextQuestionAnalytics;
  totalResponses: number;
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

export function QuestionAnalyticsCard({
  question,
  totalResponses,
}: QuestionAnalyticsCardProps) {
  const typeLabel =
    question.type === "single"
      ? "Single choice"
      : question.type === "multi"
        ? "Multiple choice"
        : question.type === "rating"
          ? "Rating"
          : "Text";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-semibold text-ink truncate">{question.label}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={question.type === "single" || question.type === "multi" ? "info" : "neutral"}>
                {typeLabel}
              </Badge>
              <span className="text-xs text-muted">
                Answered: {question.answered} / {totalResponses}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {question.type === "single" && (
          <SingleMultiChart question={question} totalResponses={totalResponses} />
        )}
        {question.type === "multi" && (
          <SingleMultiChart question={question} totalResponses={totalResponses} />
        )}
        {question.type === "rating" && (
          <RatingChart question={question} totalResponses={totalResponses} />
        )}
        {question.type === "text" && (
          <TextAnswers question={question} />
        )}
      </CardBody>
    </Card>
  );
}

function SingleMultiChart({
  question,
  totalResponses,
}: {
  question: SingleMultiQuestionAnalytics;
  totalResponses: number;
}) {
  const chartData = question.options.map((opt) => ({
    label: opt.option,
    value: opt.count,
  }));

  return (
    <div className="space-y-4">
      <BarChart data={chartData} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-2 px-3 font-medium text-muted">
                Option
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted">
                Count
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {question.options.map((opt, i) => {
              const pct =
                totalResponses > 0
                  ? Math.round((opt.count / totalResponses) * 100)
                  : 0;
              return (
                <tr key={i} className="border-b border-line last:border-b-0">
                  <td className="py-2 px-3 text-ink">{opt.option}</td>
                  <td className="py-2 px-3 text-right text-ink font-medium">
                    {opt.count}
                  </td>
                  <td className="py-2 px-3 text-right text-muted">
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RatingChart({
  question,
  totalResponses,
}: {
  question: RatingQuestionAnalytics;
  totalResponses: number;
}) {
  const chartData = question.distribution.map((d) => ({
    label: `${d.rating} star${d.rating > 1 ? "s" : ""}`,
    value: d.count,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <p className="text-xs text-muted mb-1">Average Rating</p>
          <p className="text-4xl font-bold text-ink">
            {question.average !== null
              ? question.average.toFixed(2)
              : "—"}
          </p>
          {question.average !== null && (
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(question.average!) ? "text-warning" : "text-line"}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
              ))}
              <span className="text-xs text-muted ml-2">
                ({totalResponses} response{totalResponses !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>
      </div>
      <BarChart data={chartData} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-2 px-3 font-medium text-muted">
                Rating
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted">
                Count
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {question.distribution.map((d) => {
              const pct =
                totalResponses > 0
                  ? Math.round((d.count / totalResponses) * 100)
                  : 0;
              return (
                <tr key={d.rating} className="border-b border-line last:border-b-0">
                  <td className="py-2 px-3 text-ink">
                    {d.rating}{" "}
                    <span className="text-muted text-xs">
                      {"★".repeat(d.rating)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-ink font-medium">
                    {d.count}
                  </td>
                  <td className="py-2 px-3 text-right text-muted">
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextAnswers({ question }: { question: TextQuestionAnalytics }) {
  if (question.answers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted text-sm">No answers yet</p>
      </div>
    );
  }

  return (
    <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
      {question.answers.map((answer, i) => (
        <div
          key={i}
          className="p-3 rounded-lg bg-canvas border border-line"
        >
          <p className="text-sm text-ink whitespace-pre-wrap break-words">
            {answer.text}
          </p>
          <p className="text-xs text-muted mt-1">
            {formatRelativeDate(answer.submittedAt)}
          </p>
        </div>
      ))}
    </div>
  );
}
