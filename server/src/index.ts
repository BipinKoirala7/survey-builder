import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_ORIGIN ?? "http://localhost:3000").split(",") }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

async function main() {
  if (process.env.MONGODB_URI) await mongoose.connect(process.env.MONGODB_URI);
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => console.log(`API on http://localhost:${port}`));
}
main();
