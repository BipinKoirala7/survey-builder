import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../config";
import { AppError } from "../errors/AppError";

const secret = new TextEncoder().encode(config.jwtSecret);
const ISSUER = "survey-builder";
const ALG = "HS256";

export function signAdminToken(adminId: string): Promise<string> {
  return new SignJWT({})
      .setProtectedHeader({ alg: ALG })
      .setSubject(adminId)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(secret);
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new AppError(401, "Missing token"));

  try {
    const { payload } = await jwtVerify(header.slice(7), secret, {
      issuer: ISSUER,
      algorithms: [ALG],
    });
    if (!payload.sub) throw new AppError(401, "Invalid or expired token");
    res.locals.adminId = payload.sub;
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}