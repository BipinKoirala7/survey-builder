import { config } from "./config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Admin } from "./model/admin";
import { Survey } from "./model/survey";

async function main() {
  await mongoose.connect(config.mongoUri);

  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin12345";
  await Admin.findOneAndUpdate(
      { email },
      { passwordHash: await bcrypt.hash(password, 10) },
      { upsert: true },
  );

  const title = "Customer Feedback (sample)";
  if (!(await Survey.exists({ title }))) {
    const q1 = randomUUID();
    await Survey.create({
      title,
      description: "A sample survey that demonstrates every question type and conditional logic.",
      status: "published",
      version: 1,
      questions: [
        { id: q1, type: "single", label: "Do you use our product regularly?", required: true, order: 0, options: ["Yes", "No"], showIf: null },
        { id: randomUUID(), type: "text", label: "What do you like most about it?", required: false, order: 1, options: [], showIf: { questionId: q1, operator: "equals", value: "Yes" } },
        { id: randomUUID(), type: "rating", label: "How satisfied are you overall?", required: true, order: 2, options: [], showIf: null },
        { id: randomUUID(), type: "multi", label: "Which features do you use?", required: false, order: 3, options: ["Dashboard", "Reports", "Integrations"], showIf: null },
      ],
    });
  }

  console.log(`Seeded admin: ${email} / ${password}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});