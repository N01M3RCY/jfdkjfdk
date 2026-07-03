import { Router } from "express";
import { db, casesTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";

const router = Router();

router.get("/cities", async (req, res) => {
  try {
    const cityRows = await db.select({
      city: casesTable.city,
      count: count(),
    }).from(casesTable).where(eq(casesTable.isActive, true)).groupBy(casesTable.city);

    const cities = cityRows.map(row => ({
      id: row.city.toLowerCase().replace(/\s+/g, "-"),
      name: row.city,
      caseCount: Number(row.count),
    }));

    res.json(cities);
  } catch (err) {
    req.log.error({ err }, "Failed to get cities");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
