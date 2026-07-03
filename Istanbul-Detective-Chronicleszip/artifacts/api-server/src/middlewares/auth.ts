import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set");
}

const JWT_SECRET = process.env.SESSION_SECRET;

export interface AuthPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Geçersiz veya süresi dolmuş token" });
    return;
  }
  (req as any).auth = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, async () => {
    const auth = (req as any).auth as AuthPayload;
    // Re-check admin status from DB so revocations take effect immediately
    try {
      const [user] = await db
        .select({ isAdmin: usersTable.isAdmin })
        .from(usersTable)
        .where(eq(usersTable.id, auth.userId));
      if (!user?.isAdmin) {
        res.status(403).json({ error: "Bu işlem için admin yetkisi gerekli" });
        return;
      }
      next();
    } catch {
      res.status(500).json({ error: "Yetki doğrulaması başarısız" });
    }
  });
}
