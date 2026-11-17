import { Types } from "mongoose";
import { Response as SurveyResponse } from "../model/response";

export interface SurveyAnalyticsQuestionOption {
  option: string;
  count: number;
}

export interface SurveyAnalyticsRatingDistribution {
  rating: number;
  count: number;
}

export interface SurveyAnalyticsTextAnswer {
  text: string;
  submittedAt: string;
}

export interface SurveyAnalyticsQuestionBase {
  id: string;
  label: string;
  type: string;
  answered: number;
}

export interface SurveyAnalyticsSingleQuestion extends SurveyAnalyticsQuestionBase {
  type: "single";
  options: SurveyAnalyticsQuestionOption[];
}

export interface SurveyAnalyticsMultiQuestion extends SurveyAnalyticsQuestionBase {
  type: "multi";
  options: SurveyAnalyticsQuestionOption[];
}

export interface SurveyAnalyticsRatingQuestion extends SurveyAnalyticsQuestionBase {
  type: "rating";
  average: number | null;
  distribution: SurveyAnalyticsRatingDistribution[];
}

export interface SurveyAnalyticsTextQuestion extends SurveyAnalyticsQuestionBase {
  type: "text";
  answers: SurveyAnalyticsTextAnswer[];
}

export type SurveyAnalyticsQuestion =
  | SurveyAnalyticsSingleQuestion
  | SurveyAnalyticsMultiQuestion
  | SurveyAnalyticsRatingQuestion
  | SurveyAnalyticsTextQuestion
  | SurveyAnalyticsQuestionBase;

export interface SurveyAnalyticsResult {
  survey: {
    id: string;
    title: string;
    version: number;
  };
  totalResponses: number;
  questions: SurveyAnalyticsQuestion[];
}

export async function getSurveyAnalytics(
  survey: any,
  version?: number,
): Promise<SurveyAnalyticsResult> {
  const surveyId =
    survey._id instanceof Types.ObjectId
      ? survey._id
      : new Types.ObjectId(String(survey._id ?? survey.id));

  const matchStage: Record<string, any> = {
    surveyId,
  };

  if (typeof version === "number") {
    matchStage.surveyVersion = version;
  }

  const questions: any[] = Array.isArray(survey.questions)
    ? [...survey.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const facets: Record<string, any[]> = {
    total: [{ $count: "count" }],
  };

  const answeredGroup: Record<string, any> = { _id: null };

  for (const q of questions) {
    const ansExpr = { $getField: { field: q.id, input: "$answers" } };

    if (q.type === "single") {
      answeredGroup[q.id] = {
        $sum: {
          $cond: [
            {
              $and: [
                { $eq: [{ $type: ansExpr }, "string"] },
                { $ne: [ansExpr, ""] },
              ],
            },
            1,
            0,
          ],
        },
      };
      facets[`single_${q.id}`] = [
        { $project: { val: ansExpr } },
        { $match: { val: { $type: "string", $ne: "" } } },
        { $group: { _id: "$val", count: { $sum: 1 } } },
      ];
    } else if (q.type === "multi") {
      answeredGroup[q.id] = {
        $sum: {
          $cond: [
            {
              $and: [
                { $isArray: ansExpr },
                { $gt: [{ $size: ansExpr }, 0] },
              ],
            },
            1,
            0,
          ],
        },
      };
      facets[`multi_${q.id}`] = [
        { $project: { val: ansExpr } },
        { $match: { val: { $type: "array", $ne: [] } } },
        { $project: { val: { $setUnion: ["$val", []] } } },
        { $unwind: "$val" },
        { $group: { _id: "$val", count: { $sum: 1 } } },
      ];
    } else if (q.type === "rating") {
      answeredGroup[q.id] = {
        $sum: {
          $cond: [
            {
              $and: [
                { $isNumber: ansExpr },
              ],
            },
            1,
            0,
          ],
        },
      };
      facets[`rating_${q.id}`] = [
        { $project: { val: ansExpr } },
        { $match: { val: { $type: "number" } } },
        { $group: { _id: "$val", count: { $sum: 1 } } },
      ];
    } else if (q.type === "text") {
      answeredGroup[q.id] = {
        $sum: {
          $cond: [
            {
              $and: [
                { $eq: [{ $type: ansExpr }, "string"] },
                { $ne: [ansExpr, ""] },
              ],
            },
            1,
            0,
          ],
        },
      };
      facets[`text_${q.id}`] = [
        { $project: { val: ansExpr, submittedAt: "$submittedAt" } },
        { $match: { val: { $type: "string", $ne: "" } } },
        { $sort: { submittedAt: -1 } },
        { $limit: 50 },
        { $project: { _id: 0, text: "$val", submittedAt: "$submittedAt" } },
      ];
    }
  }

  if (questions.length > 0) {
    facets["answered_counts"] = [{ $group: answeredGroup }];
  }

  const [aggregationResult] = await SurveyResponse.aggregate([
    { $match: matchStage },
    { $facet: facets },
  ]);

  const totalResponses = aggregationResult?.total?.[0]?.count ?? 0;
  const answeredCounts = aggregationResult?.answered_counts?.[0] ?? {};

  const formattedQuestions: SurveyAnalyticsQuestion[] = questions.map((q) => {
    const answered = answeredCounts[q.id] ?? 0;

    if (q.type === "single") {
      const rawCounts = aggregationResult?.[`single_${q.id}`] ?? [];
      const countMap = new Map<string, number>(
        rawCounts.map((item: any) => [String(item._id), Number(item.count)]),
      );
      const options: SurveyAnalyticsQuestionOption[] = (q.options ?? []).map(
        (opt: string) => ({
          option: opt,
          count: countMap.get(opt) ?? 0,
        }),
      );
      return {
        id: q.id,
        label: q.label,
        type: "single",
        answered,
        options,
      };
    }

    if (q.type === "multi") {
      const rawCounts = aggregationResult?.[`multi_${q.id}`] ?? [];
      const countMap = new Map<string, number>(
        rawCounts.map((item: any) => [String(item._id), Number(item.count)]),
      );
      const options: SurveyAnalyticsQuestionOption[] = (q.options ?? []).map(
        (opt: string) => ({
          option: opt,
          count: countMap.get(opt) ?? 0,
        }),
      );
      return {
        id: q.id,
        label: q.label,
        type: "multi",
        answered,
        options,
      };
    }

    if (q.type === "rating") {
      const rawCounts = aggregationResult?.[`rating_${q.id}`] ?? [];
      const countMap = new Map<number, number>(
        rawCounts.map((item: any) => [Number(item._id), Number(item.count)]),
      );
      const distribution: SurveyAnalyticsRatingDistribution[] = [1, 2, 3, 4, 5].map(
        (r) => ({
          rating: r,
          count: countMap.get(r) ?? 0,
        }),
      );
      let sum = 0;
      let totalRatings = 0;
      for (const d of distribution) {
        sum += d.rating * d.count;
        totalRatings += d.count;
      }
      const average =
        totalRatings > 0 ? Math.round((sum / totalRatings) * 100) / 100 : null;
      return {
        id: q.id,
        label: q.label,
        type: "rating",
        answered,
        average,
        distribution,
      };
    }

    if (q.type === "text") {
      const rawAnswers = aggregationResult?.[`text_${q.id}`] ?? [];
      const answers: SurveyAnalyticsTextAnswer[] = rawAnswers.map((item: any) => ({
        text: item.text,
        submittedAt:
          item.submittedAt instanceof Date
            ? item.submittedAt.toISOString()
            : String(item.submittedAt),
      }));
      return {
        id: q.id,
        label: q.label,
        type: "text",
        answered,
        answers,
      };
    }

    return {
      id: q.id,
      label: q.label,
      type: q.type,
      answered,
    };
  });

  return {
    survey: {
      id: String(survey._id ?? survey.id),
      title: survey.title,
      version: survey.version,
    },
    totalResponses,
    questions: formattedQuestions,
  };
}
