import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { Survey } from "../model/survey";
import { Response as SurveyResponse } from "../model/response";
import { requireAdmin } from "../middleware/auth";
import { AppError } from "../errors/AppError";
import { surveyInput, type SurveyInput } from "../lib/survey-input";

const router = Router();
router.use(requireAdmin);

function parseId(id: string): string {
  if (!isValidObjectId(id)) throw new AppError(404, "Survey not found");
  return id;
}

// Server owns order: it is the array position.
function normalize(input: SurveyInput) {
  return {
    ...input,
    questions: input.questions.map((q, i) => ({
      ...q,
      order: i,
      options: q.type === "single" || q.type === "multi" ? q.options : [],
    })),
  };
}

// Used to decide whether an edit actually changed the questions
function fingerprint(questions: any[]): string {
  return JSON.stringify(
      questions.map((q) => [
        q.id,
        q.type,
        q.label,
        !!q.required,
        [...(q.options ?? [])],
        q.showIf ? [q.showIf.questionId, q.showIf.operator, q.showIf.value] : null,
      ]),
  );
}

router.get("/", async (_req, res) => {
  const surveys = await Survey.find()
      .select("title description status version createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

  const counts = await SurveyResponse.aggregate([
    { $group: { _id: "$surveyId", count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count as number]));

  res.json(surveys.map((s) => ({ ...s, responseCount: countById.get(String(s._id)) ?? 0 })));
});

router.post("/", async (req, res) => {
  const data = normalize(surveyInput.parse(req.body));
  const survey = await Survey.create({ ...data, version: 1 });
  res.status(201).json(survey);
});

router.get("/:id", async (req, res) => {
  const survey = await Survey.findById(parseId(req.params.id));
  if (!survey) throw new AppError(404, "Survey not found");
  res.json(survey);
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = normalize(surveyInput.parse(req.body));

  const survey = await Survey.findById(id);
  if (!survey) throw new AppError(404, "Survey not found");

  const questionsChanged = fingerprint(survey.questions as any[]) !== fingerprint(data.questions);
  const hasResponses = (await SurveyResponse.countDocuments({ surveyId: id })) > 0;
  if (questionsChanged && hasResponses) survey.version += 1; // old responses keep their old version

  survey.set(data);
  await survey.save();
  res.json(survey);
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const deleted = await Survey.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, "Survey not found");

  await SurveyResponse.deleteMany({ surveyId: id });
  res.status(204).end();
});

export default router;