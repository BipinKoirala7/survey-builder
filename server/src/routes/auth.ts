import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AppError } from "../errors/AppError";
import { signAdminToken } from "../middleware/auth";
import {Admin} from "../model/admin";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginBody = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = loginBody.parse(req.body);

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  const passwordOk = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
  if (!admin || !passwordOk) throw new AppError(401, "Invalid email or password");

  const token = await signAdminToken(admin.id);
  res.json({ token });
});

export default router;