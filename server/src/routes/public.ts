import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../errors/AppError";
import { Survey } from "../model/survey";
import { Response as SurveyResponse } from "../model/response";
import { validateAnswers } from "../lib/validate-answers";

const SUBMIT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const SUBMIT_RATE_LIMIT_MAX = 10;

const submitLimiter = rateLimit({
  windowMs: SUBMIT_RATE_LIMIT_WINDOW_MS,
  limit: SUBMIT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const submitBodySchema = z.object({
  answers: z.record(z.string(), z.unknown(), {
    error: (issue) =>
      issue.input === undefined || issue.input === null
        ? "answers is required"
        : "answers must be an object",
  }),
});

const router = Router();

router.get("/surveys/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new AppError(404, "Survey not found");

  const survey = await Survey.findOne({ _id: id, status: "published" })
      .select("title description version questions")
      .lean();
  if (!survey) throw new AppError(404, "Survey not found");

  res.json(survey);
});

router.post("/surveys/:id/responses", submitLimiter, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new AppError(404, "Survey not found");

  const survey = await Survey.findOne({ _id: id, status: "published" });
  if (!survey) throw new AppError(404, "Survey not found");

  const { answers } = submitBodySchema.parse(req.body);
  const cleaned = validateAnswers(survey.questions as any, answers);

  const response = await SurveyResponse.create({
    surveyId: survey._id,
    surveyVersion: survey.version,
    answers: cleaned,
  });

  res.status(201).json({ id: response._id.toString() });
});

export default router;