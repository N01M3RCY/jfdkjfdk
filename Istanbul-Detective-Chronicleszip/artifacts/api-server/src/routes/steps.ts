import { Router } from "express";
import { db, caseStepsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// Get steps for a case
router.get("/cases/:caseId/steps", async (req, res) => {
  try {
    const { caseId } = req.params;
    const steps = await db.select().from(caseStepsTable).where(eq(caseStepsTable.caseId, caseId));
    const sorted = steps.sort((a, b) => a.order - b.order);
    res.json(sorted.map(s => ({ ...s, createdAt: undefined })));
  } catch (err) {
    req.log.error({ err }, "Failed to get steps");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create step
router.post("/cases/:caseId/steps", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { order, type, title, description, targetImageUrl, targetLat, targetLng, targetRadiusM, targetAnswer, requiredMatchPct, hint } = req.body;
    const id = randomUUID();

    await db.insert(caseStepsTable).values({
      id,
      caseId,
      order: order ?? 0,
      type: type ?? "photo",
      title,
      description,
      targetImageUrl: targetImageUrl ?? null,
      targetLat: targetLat ?? null,
      targetLng: targetLng ?? null,
      targetRadiusM: targetRadiusM ?? null,
      targetAnswer: targetAnswer ?? null,
      requiredMatchPct: requiredMatchPct ?? 70,
      hint: hint ?? null,
    });

    const [created] = await db.select().from(caseStepsTable).where(eq(caseStepsTable.id, id));
    res.status(201).json({ ...created, createdAt: undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to create step");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update step
router.put("/cases/:caseId/steps/:stepId", async (req, res) => {
  try {
    const { caseId, stepId } = req.params;
    const updates = req.body;

    await db.update(caseStepsTable).set(updates)
      .where(and(eq(caseStepsTable.id, stepId), eq(caseStepsTable.caseId, caseId)));

    const [updated] = await db.select().from(caseStepsTable).where(eq(caseStepsTable.id, stepId));
    if (!updated) { res.status(404).json({ error: "Step not found" }); return; }

    res.json({ ...updated, createdAt: undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to update step");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete step
router.delete("/cases/:caseId/steps/:stepId", async (req, res) => {
  try {
    const { caseId, stepId } = req.params;
    await db.delete(caseStepsTable)
      .where(and(eq(caseStepsTable.id, stepId), eq(caseStepsTable.caseId, caseId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete step");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
