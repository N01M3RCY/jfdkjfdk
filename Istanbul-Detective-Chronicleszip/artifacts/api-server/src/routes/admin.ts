import { Router } from "express";
import { db, casesTable, submissionsTable, usersTable, userProgressTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

// All admin routes require admin auth
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [totalCasesRow] = await db.select({ count: count() }).from(casesTable);
    const [activeCasesRow] = await db.select({ count: count() }).from(casesTable).where(eq(casesTable.isActive, true));
    const [totalSubsRow] = await db.select({ count: count() }).from(submissionsTable);
    const [passedSubsRow] = await db.select({ count: count() }).from(submissionsTable).where(eq(submissionsTable.passed, true));
    const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
    const cities = await db.selectDistinct({ city: casesTable.city }).from(casesTable);

    res.json({
      totalCases: Number(totalCasesRow?.count ?? 0),
      activeCases: Number(activeCasesRow?.count ?? 0),
      totalSubmissions: Number(totalSubsRow?.count ?? 0),
      passedSubmissions: Number(passedSubsRow?.count ?? 0),
      citiesWithCases: cities.length,
      totalUsers: Number(totalUsersRow?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/submissions", requireAdmin, async (req, res) => {
  try {
    const subs = await db.select().from(submissionsTable);
    res.json(subs.map(s => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get submissions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// List all users
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      city: usersTable.city,
      isAdmin: usersTable.isAdmin,
      xp: usersTable.xp,
      badge: usersTable.badge,
      createdAt: usersTable.createdAt,
    }).from(usersTable);

    // For each user, count their progress records
    const progressCounts = await db.select({
      userId: userProgressTable.userId,
      count: count(),
    }).from(userProgressTable).groupBy(userProgressTable.userId);

    const completedCounts = await db.select({
      userId: userProgressTable.userId,
      count: count(),
    }).from(userProgressTable)
      .where(eq(userProgressTable.status, "completed"))
      .groupBy(userProgressTable.userId);

    const progressMap = new Map(progressCounts.map(p => [p.userId, Number(p.count)]));
    const completedMap = new Map(completedCounts.map(p => [p.userId, Number(p.count)]));

    res.json(users.map(u => ({
      ...u,
      xp: parseInt(u.xp),
      createdAt: u.createdAt.toISOString(),
      activeCases: progressMap.get(u.id) ?? 0,
      completedCases: completedMap.get(u.id) ?? 0,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get users");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single user's case progress
router.get("/admin/users/:userId/progress", requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.userId);
    const progress = await db.select().from(userProgressTable)
      .where(eq(userProgressTable.userId, userId));

    const cases = await db.select().from(casesTable);
    const caseMap = new Map(cases.map(c => [c.id, c]));

    res.json(progress.map(p => ({
      ...p,
      startedAt: p.startedAt.toISOString(),
      completedAt: p.completedAt?.toISOString() ?? null,
      caseTitle: caseMap.get(p.caseId)?.title ?? "Bilinmeyen Dava",
      caseCodeTitle: (caseMap.get(p.caseId) as any)?.codeTitle ?? "",
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get user progress");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Set user admin status
router.patch("/admin/users/:userId", requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.userId);
    const { isAdmin } = req.body as { isAdmin: boolean };
    await db.update(usersTable).set({ isAdmin }).where(eq(usersTable.id, userId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
