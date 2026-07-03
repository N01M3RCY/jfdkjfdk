import { Router } from "express";
import { db, userProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function formatProgress(p: typeof userProgressTable.$inferSelect) {
  return {
    ...p,
    completedSteps: JSON.parse(p.completedSteps || "[]"),
    startedAt: p.startedAt.toISOString(),
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
  };
}

// Get all progress for a user
router.get("/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const rows = await db.select().from(userProgressTable).where(eq(userProgressTable.userId, userId));
    res.json(rows.map(formatProgress));
  } catch (err) {
    req.log.error({ err }, "Failed to get progress");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get progress for a specific case
router.get("/progress/:userId/:caseId", async (req, res) => {
  try {
    const { userId, caseId } = req.params;
    const [row] = await db.select().from(userProgressTable)
      .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.caseId, caseId)));

    if (!row) { res.status(404).json({ error: "Progress not found" }); return; }
    res.json(formatProgress(row));
  } catch (err) {
    req.log.error({ err }, "Failed to get case progress");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upsert progress
router.post("/progress/:userId/:caseId", async (req, res) => {
  try {
    const { userId, caseId } = req.params;
    const { currentStep, completedSteps, status } = req.body;

    const [existing] = await db.select().from(userProgressTable)
      .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.caseId, caseId)));

    if (existing) {
      const updateData: Partial<typeof userProgressTable.$inferSelect> = {
        currentStep,
        completedSteps: JSON.stringify(completedSteps || []),
        status,
      };
      if (status === "completed" && !existing.completedAt) {
        updateData.completedAt = new Date();
      }

      await db.update(userProgressTable).set(updateData)
        .where(eq(userProgressTable.id, existing.id));

      const [updated] = await db.select().from(userProgressTable).where(eq(userProgressTable.id, existing.id));
      return res.json(formatProgress(updated!));
    } else {
      const id = randomUUID();
      await db.insert(userProgressTable).values({
        id,
        userId,
        caseId,
        currentStep: currentStep ?? 0,
        completedSteps: JSON.stringify(completedSteps || []),
        status: status ?? "active",
      });

      const [created] = await db.select().from(userProgressTable).where(eq(userProgressTable.id, id));
      return res.json(formatProgress(created!));
    }
  } catch (err) {
    req.log.error({ err }, "Failed to upsert progress");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
