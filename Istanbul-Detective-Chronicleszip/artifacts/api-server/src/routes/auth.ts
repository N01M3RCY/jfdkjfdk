import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { signToken, requireAuth } from "../middlewares/auth.js";

const router = Router();

// Register
router.post("/auth/register", async (req, res) => {
  try {
    const { username, password, displayName, city } = req.body as {
      username: string; password: string; displayName: string; city?: string;
    };

    if (!username?.trim() || !password || !displayName?.trim()) {
      res.status(400).json({ error: "Kullanıcı adı, şifre ve görünen ad zorunludur" });
      return;
    }
    if (username.length < 3) {
      res.status(400).json({ error: "Kullanıcı adı en az 3 karakter olmalı" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase()));
    if (existing) {
      res.status(409).json({ error: "Bu kullanıcı adı zaten alınmış" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();

    await db.insert(usersTable).values({
      id,
      username: username.toLowerCase(),
      passwordHash,
      displayName: displayName.trim(),
      city: city ?? "İstanbul",
      isAdmin: false,
      xp: "0",
      badge: "Aday Dedektif",
    });

    const token = signToken({ userId: id, username: username.toLowerCase(), isAdmin: false });
    res.status(201).json({
      token,
      user: { id, username: username.toLowerCase(), displayName: displayName.trim(), city: city ?? "İstanbul", isAdmin: false, xp: 0, badge: "Aday Dedektif" }
    });
  } catch (err) {
    req.log.error({ err }, "Register failed");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Login
router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      res.status(400).json({ error: "Kullanıcı adı ve şifre zorunludur" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase()));
    if (!user) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
      return;
    }

    const token = signToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        city: user.city,
        isAdmin: user.isAdmin,
        xp: parseInt(user.xp),
        badge: user.badge,
      }
    });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get current user (validate token)
router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId));
    if (!user) {
      res.status(404).json({ error: "Kullanıcı bulunamadı" });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      city: user.city,
      isAdmin: user.isAdmin,
      xp: parseInt(user.xp),
      badge: user.badge,
    });
  } catch (err) {
    req.log.error({ err }, "Get me failed");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Update user (city, displayName, xp, badge)
router.patch("/auth/me", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth;
    const { city, displayName, xp, badge } = req.body as {
      city?: string; displayName?: string; xp?: number; badge?: string;
    };
    const updates: Record<string, string | number | boolean> = {};
    if (city) updates.city = city;
    if (displayName) updates.displayName = displayName;
    if (xp !== undefined) updates.xp = String(xp);
    if (badge) updates.badge = badge;

    await db.update(usersTable).set(updates as any).where(eq(usersTable.id, auth.userId));
    const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId));
    res.json({
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      city: updated.city,
      isAdmin: updated.isAdmin,
      xp: parseInt(updated.xp),
      badge: updated.badge,
    });
  } catch (err) {
    req.log.error({ err }, "Update me failed");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
