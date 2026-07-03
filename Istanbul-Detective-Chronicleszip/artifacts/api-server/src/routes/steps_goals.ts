import { Router } from "express";
import { db, dailyStepsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// Get today's step data for the current user
router.get("/steps-goals/today", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth;
    const today = new Date().toISOString().split("T")[0]!;

    let [record] = await db.select().from(dailyStepsTable)
      .where(and(eq(dailyStepsTable.userId, auth.userId), eq(dailyStepsTable.date, today)));

    if (!record) {
      const goalSteps = parseInt((req.query.goal as string) ?? "10000");
      await db.insert(dailyStepsTable).values({
        id: randomUUID(),
        userId: auth.userId,
        date: today,
        steps: 0,
        goalSteps: isNaN(goalSteps) ? 10000 : goalSteps,
      });
      [record] = await db.select().from(dailyStepsTable)
        .where(and(eq(dailyStepsTable.userId, auth.userId), eq(dailyStepsTable.date, today)));
    }

    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to get today steps");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Update today's steps
router.patch("/steps-goals/today", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth;
    const today = new Date().toISOString().split("T")[0]!;
    const { steps, goalSteps } = req.body as { steps?: number; goalSteps?: number };

    const updates: Record<string, number | string> = { updatedAt: new Date().toISOString() };
    if (steps !== undefined) updates.steps = steps;
    if (goalSteps !== undefined) updates.goalSteps = goalSteps;

    const [existing] = await db.select().from(dailyStepsTable)
      .where(and(eq(dailyStepsTable.userId, auth.userId), eq(dailyStepsTable.date, today)));

    if (!existing) {
      await db.insert(dailyStepsTable).values({
        id: randomUUID(),
        userId: auth.userId,
        date: today,
        steps: steps ?? 0,
        goalSteps: goalSteps ?? 10000,
      });
    } else {
      await db.update(dailyStepsTable)
        .set(updates as any)
        .where(and(eq(dailyStepsTable.userId, auth.userId), eq(dailyStepsTable.date, today)));
    }

    const [record] = await db.select().from(dailyStepsTable)
      .where(and(eq(dailyStepsTable.userId, auth.userId), eq(dailyStepsTable.date, today)));

    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to update steps");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get step history (last 7 days)
router.get("/steps-goals/history", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth;
    const records = await db.select().from(dailyStepsTable)
      .where(eq(dailyStepsTable.userId, auth.userId));

    res.json(records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7));
  } catch (err) {
    req.log.error({ err }, "Failed to get step history");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
