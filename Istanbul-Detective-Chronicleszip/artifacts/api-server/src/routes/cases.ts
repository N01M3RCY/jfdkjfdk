import { Router } from "express";
import { db, casesTable, caseStepsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// List cases
router.get("/cases", async (req, res) => {
  try {
    const { city, difficulty, isActive } = req.query as Record<string, string>;

    const cases = await db.select().from(casesTable);

    // Count steps per case
    const stepCounts = await db.select({
      caseId: caseStepsTable.caseId,
      count: count(),
    }).from(caseStepsTable).groupBy(caseStepsTable.caseId);

    const stepCountMap = new Map(stepCounts.map(s => [s.caseId, Number(s.count)]));

    let result = cases.map(c => ({
      ...c,
      stepCount: stepCountMap.get(c.id) ?? 0,
      createdAt: c.createdAt.toISOString(),
      // Parse suspects but strip culpritClue from list view (spoiler prevention)
      suspects: (JSON.parse(c.suspects || "[]") as any[]).map(
        ({ culpritClue: _omit, ...s }: any) => s
      ),
    }));

    if (city) result = result.filter(c => c.city.toLowerCase() === city.toLowerCase());
    if (difficulty) result = result.filter(c => c.difficulty === difficulty);
    if (isActive !== undefined) result = result.filter(c => c.isActive === (isActive === "true"));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list cases");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get case with steps
router.get("/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, id));
    if (!caseRow) { res.status(404).json({ error: "Case not found" }); return; }

    const steps = await db.select().from(caseStepsTable).where(eq(caseStepsTable.caseId, id));
    const sortedSteps = steps.sort((a, b) => a.order - b.order);

    res.json({
      ...caseRow,
      createdAt: caseRow.createdAt.toISOString(),
      // Parse suspects JSON; culpritClue is stripped until case is solved (client controls reveal)
      suspects: JSON.parse(caseRow.suspects || "[]"),
      steps: sortedSteps.map(s => ({
        ...s,
        createdAt: undefined,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get case");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create case
router.post("/cases", async (req, res) => {
  try {
    const { title, description, city, district, difficulty, category, thumbnailUrl, isActive } = req.body;
    const id = randomUUID();

    await db.insert(casesTable).values({
      id,
      title,
      description,
      city,
      district,
      difficulty: difficulty || "orta",
      category: category || "cinayet",
      thumbnailUrl: thumbnailUrl || null,
      isActive: isActive !== false,
    });

    const [created] = await db.select().from(casesTable).where(eq(casesTable.id, id));
    res.status(201).json({
      ...created,
      stepCount: 0,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create case");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update case
router.put("/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await db.update(casesTable).set(updates).where(eq(casesTable.id, id));
    const [updated] = await db.select().from(casesTable).where(eq(casesTable.id, id));
    if (!updated) { res.status(404).json({ error: "Case not found" }); return; }

    const [stepCount] = await db.select({ count: count() })
      .from(caseStepsTable).where(eq(caseStepsTable.caseId, id));

    res.json({
      ...updated,
      stepCount: Number(stepCount?.count ?? 0),
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update case");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete case
router.delete("/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(caseStepsTable).where(eq(caseStepsTable.caseId, id));
    await db.delete(casesTable).where(eq(casesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete case");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
