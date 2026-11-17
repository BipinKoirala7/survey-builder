import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AppError } from "../errors/AppError";
import { signAdminToken } from "../middleware/auth";
import {Admin} from "../model/admin";

const router = Router();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 20;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX = 10;

const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  limit: LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: REGISTER_WINDOW_MS,
  limit: REGISTER_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginBody = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

const registerBody = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(8).max(72),
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = loginBody.parse(req.body);

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  const passwordOk = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
  if (!admin || !passwordOk) throw new AppError(401, "Invalid email or password");

  const token = await signAdminToken(admin.id);
  res.json({ token });
});

router.post("/register", registerLimiter, async (req, res) => {
  const { email, password } = registerBody.parse(req.body);

  const trimmed = email.toLowerCase().trim();
  const existing = await Admin.findOne({ email: trimmed });
  if (existing) throw new AppError(409, "An account with this email already exists");

  try {
    const admin = await Admin.create({
      email: trimmed,
      passwordHash: await bcrypt.hash(password, 10),
    });
    const token = await signAdminToken(admin.id);
    res.status(201).json({ token });
  } catch (err: any) {
    if (err.code === 11000) throw new AppError(409, "An account with this email already exists");
    throw err;
  }
});

export default router;