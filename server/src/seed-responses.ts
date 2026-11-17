import { config } from "./config.js";
import mongoose from "mongoose";
import { Survey } from "./model/survey.js";
import { Response as SurveyResponse } from "./model/response.js";
import { getVisibleQuestions, type Question } from "./lib/visibility.js";

const SAMPLE_TEXT_FEEDBACK = [
  "The interface is very clean and easy to use.",
  "Great customer support and quick response time.",
  "Loving the analytics dashboard and reporting tools.",
  "Very intuitive workflows and solid performance.",
  "Integrations with our existing tools worked smoothly.",
  "Huge time saver for our entire team.",
  "Excellent features and regular updates.",
  "Simple, reliable, and does exactly what we need.",
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubset<T>(arr: T[]): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  const count = Math.floor(Math.random() * arr.length) + 1;
  return shuffled.slice(0, count);
}

async function main() {
  await mongoose.connect(config.mongoUri);

  const title = "Customer Feedback (sample)";
  const survey = await Survey.findOne({ title });
  if (!survey) {
    console.error(`Survey "${title}" not found. Please run seed script first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const responsesToInsert = [];
  const now = Date.now();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 40; i++) {
    const rawAnswers: Record<string, unknown> = {};

    const questions = (survey.questions as unknown as Question[])
      .slice()
      .sort((a, b) => a.order - b.order);

    for (const q of questions) {
      const visible = getVisibleQuestions(questions, rawAnswers);
      const isVisible = visible.some((v) => v.id === q.id);
      if (!isVisible) {
        continue;
      }

      if (q.type === "single" && q.options && q.options.length > 0) {
        rawAnswers[q.id] = getRandomElement(q.options);
      } else if (q.type === "text") {
        rawAnswers[q.id] = getRandomElement(SAMPLE_TEXT_FEEDBACK);
      } else if (q.type === "rating") {
        rawAnswers[q.id] = Math.floor(Math.random() * 5) + 1;
      } else if (q.type === "multi" && q.options && q.options.length > 0) {
        rawAnswers[q.id] = getRandomSubset(q.options);
      }
    }

    const finalVisible = getVisibleQuestions(questions, rawAnswers);
    const visibleIds = new Set(finalVisible.map((v) => v.id));
    const finalAnswers: Record<string, string | string[] | number> = {};
    for (const [key, val] of Object.entries(rawAnswers)) {
      if (visibleIds.has(key) && val !== undefined) {
        finalAnswers[key] = val as string | string[] | number;
      }
    }

    const randomOffset = Math.random() * fourteenDaysMs;
    const submittedAt = new Date(now - randomOffset);

    responsesToInsert.push({
      surveyId: survey._id,
      surveyVersion: survey.version,
      answers: finalAnswers,
      submittedAt,
    });
  }

  await SurveyResponse.insertMany(responsesToInsert);
  console.log(`Inserted ${responsesToInsert.length} responses for "${title}"`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
