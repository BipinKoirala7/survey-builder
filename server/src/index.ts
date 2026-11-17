import { config } from "./config.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import authRouter from "./routes/auth.js";
import surveysRouter from "./routes/surveys.js";
import publicRouter from "./routes/public.js";
import {errorHandler} from "./errors/error-handler.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: config.clientOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/public", publicRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

async function main() {
  app.listen(config.port, () => console.log(`Listening on ${config.port}`));
  await mongoose.connect(process.env.MONGODB_URI!).then(
      () => console.log('Mongo connected'),
      (err) => console.error('Mongo failed:', err.message)
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});