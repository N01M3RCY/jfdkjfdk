import { Router } from "express";
import { db, socialPostsTable, postLikesTable, usersTable } from "@workspace/db";
import { desc, eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/auth.js";
import type { AuthPayload } from "../middlewares/auth.js";

const router = Router();

// ── SPOILER FILTER ──────────────────────────────────────────────────────────
const SPOILER_KEYWORDS = [
  "çözdüm", "bitirdim", "tamamladım", "suçlu", "katil", "fail", "sonuç",
  "cevap", "ipucu", "ipucu:", "hint", "adım", "gizli", "şifre", "çözüm",
];

function hasSpoiler(text: string): boolean {
  const lower = text.toLowerCase();
  return SPOILER_KEYWORDS.some(kw => lower.includes(kw));
}

// GET /social/feed — latest posts (optionally filtered by city)
router.get("/social/feed", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth as AuthPayload;
    const city = req.query.city as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 40), 100);

    let query = db
      .select()
      .from(socialPostsTable)
      .orderBy(desc(socialPostsTable.createdAt))
      .limit(limit);

    if (city) {
      const posts = await db
        .select()
        .from(socialPostsTable)
        .where(eq(socialPostsTable.city, city))
        .orderBy(desc(socialPostsTable.createdAt))
        .limit(limit);

      // Check which ones the current user liked
      const likedRows = await db
        .select()
        .from(postLikesTable)
        .where(eq(postLikesTable.userId, auth.userId));
      const likedSet = new Set(likedRows.map(r => r.postId));

      return void res.json(posts.map(p => ({ ...p, likedByMe: likedSet.has(p.id) })));
    }

    const posts = await query;
    const likedRows = await db
      .select()
      .from(postLikesTable)
      .where(eq(postLikesTable.userId, auth.userId));
    const likedSet = new Set(likedRows.map(r => r.postId));

    res.json(posts.map(p => ({ ...p, likedByMe: likedSet.has(p.id) })));
  } catch (err) {
    req.log.error({ err }, "Failed to get social feed");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /social/post — create a post
router.post("/social/post", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth as AuthPayload;
    const { type, content, city, district, achievementLabel } = req.body as {
      type: string;
      content: string;
      city?: string;
      district?: string;
      achievementLabel?: string;
    };

    const allowedTypes = ["checkin", "achievement", "thought"];
    if (!allowedTypes.includes(type)) {
      res.status(400).json({ error: "Geçersiz gönderi türü" });
      return;
    }
    if (!content?.trim() || content.length > 300) {
      res.status(400).json({ error: "İçerik 1–300 karakter olmalı" });
      return;
    }
    if (hasSpoiler(content)) {
      res.status(422).json({
        error: "Gönderin dava sonucu veya ipucu içeriyor olabilir. Spoiler paylaşmak yasak!",
        spoiler: true,
      });
      return;
    }

    // Get user's display name
    const [user] = await db
      .select({ displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.id, auth.userId));

    const post = {
      id: randomUUID(),
      userId: auth.userId,
      username: auth.username,
      displayName: user?.displayName ?? auth.username,
      type,
      content: content.trim(),
      city: city ?? null,
      district: district ?? null,
      achievementLabel: achievementLabel ?? null,
      likesCount: 0,
    };

    const [created] = await db.insert(socialPostsTable).values(post).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create post");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /social/like/:id — toggle like
router.post("/social/like/:id", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth as AuthPayload;
    const postId = String(req.params.id);

    const [existing] = await db
      .select()
      .from(postLikesTable)
      .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, auth.userId)));

    if (existing) {
      // Unlike
      await db
        .delete(postLikesTable)
        .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, auth.userId)));
      await db
        .update(socialPostsTable)
        .set({ likesCount: sql`${socialPostsTable.likesCount} - 1` })
        .where(eq(socialPostsTable.id, postId));
      res.json({ liked: false });
    } else {
      // Like
      await db.insert(postLikesTable).values({ postId, userId: auth.userId });
      await db
        .update(socialPostsTable)
        .set({ likesCount: sql`${socialPostsTable.likesCount} + 1` })
        .where(eq(socialPostsTable.id, postId));
      res.json({ liked: true });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to toggle like");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GET /social/leaderboard — top detectives by XP
router.get("/social/leaderboard", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        city: usersTable.city,
        xp: usersTable.xp,
        badge: usersTable.badge,
      })
      .from(usersTable)
      .orderBy(desc(sql`CAST(${usersTable.xp} AS INTEGER)`))
      .limit(limit);

    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Failed to get leaderboard");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
