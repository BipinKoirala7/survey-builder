import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z
    .string()
    .regex(/^\d+$/, "must be a whole number")
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .default(4000),

  MONGODB_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://")
      .min( 1, "must be a non-empty string"),

  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),

  CLIENT_ORIGIN: z
      .string()
      .default("http://localhost:3000")
      .transform((value) =>
          value
              .split(",")
              .map((s) => s.trim().replace(/\/+$/, "")) // strip trailing slashes
              .filter(Boolean),
      )
      .pipe(z.array(z.url()).min(1)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  mongoUri: env.MONGODB_URI,
  jwtSecret: env.JWT_SECRET,
  clientOrigins: env.CLIENT_ORIGIN,
};