export type QuestionType = "text" | "single" | "multi" | "rating";

export type ShowIfOperator = "equals" | "notEquals" | "includes";

export interface ShowIf {
  questionId: string;
  operator: ShowIfOperator;
  value: string | number;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  order: number;
  options: string[];
  showIf: ShowIf | null;
}

export type SurveyStatus = "draft" | "published";

export interface Survey {
  _id: string;
  title: string;
  description: string;
  status: SurveyStatus;
  version: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface SurveyListItem {
  _id: string;
  title: string;
  description: string;
  status: SurveyStatus;
  version: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionInput {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[];
  showIf: ShowIf | null;
}

export interface SurveyInput {
  title: string;
  description: string;
  status: SurveyStatus;
  questions: QuestionInput[];
}

export interface PublicSurvey {
  _id: string;
  title: string;
  description: string;
  version: number;
  questions: Question[];
}

export type AnswerValue = string | string[] | number;
export type Answers = Record<string, AnswerValue | undefined>;

export interface SingleMultiOptionAnalytics {
  option: string;
  count: number;
}

export interface SingleMultiQuestionAnalytics {
  id: string;
  label: string;
  type: "single" | "multi";
  answered: number;
  options: SingleMultiOptionAnalytics[];
}

export interface RatingDistributionItem {
  rating: number;
  count: number;
}

export interface RatingQuestionAnalytics {
  id: string;
  label: string;
  type: "rating";
  answered: number;
  average: number | null;
  distribution: RatingDistributionItem[];
}

export interface TextAnswerItem {
  text: string;
  submittedAt: string;
}

export interface TextQuestionAnalytics {
  id: string;
  label: string;
  type: "text";
  answered: number;
  answers: TextAnswerItem[];
}

export type QuestionAnalytics =
  | SingleMultiQuestionAnalytics
  | RatingQuestionAnalytics
  | TextQuestionAnalytics;

export interface SurveyAnalyticsHeader {
  id: string;
  title: string;
  version: number;
}

export interface SurveyAnalytics {
  survey: SurveyAnalyticsHeader;
  totalResponses: number;
  questions: QuestionAnalytics[];
}

export interface ApiValidationIssue {
  path: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  issues?: ApiValidationIssue[];
}
