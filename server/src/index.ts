import { config } from "@/";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import authRouter from "./routes/auth";
import surveysRouter from "./routes/surveys";
import publicRouter from "./routes/public";
import {errorHandler} from "./errors/error-handler";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: config.clientOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use("/api/auth", authRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/public", publicRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log("MongoDB connected");
  app.listen(config.port, () => console.log(`API on http://localhost:${config.port}`));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});