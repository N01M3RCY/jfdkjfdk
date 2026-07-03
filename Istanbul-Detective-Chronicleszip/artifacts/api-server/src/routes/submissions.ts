import { Router } from "express";
import { db, submissionsTable, caseStepsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateMatchScore(step: typeof caseStepsTable.$inferSelect, userLat?: number | null, userLng?: number | null, userAnswer?: string | null): { score: number; feedback: string } {
  if (step.type === "riddle") {
    if (!userAnswer || !step.targetAnswer) {
      return { score: 0, feedback: "Cevap verilmedi." };
    }
    const match = userAnswer.trim().toLowerCase() === step.targetAnswer.trim().toLowerCase();
    return {
      score: match ? 100 : 0,
      feedback: match ? "Doğru cevap! Tebrikler." : "Yanlış cevap. Tekrar deneyin.",
    };
  }

  if (step.type === "location" || step.type === "photo") {
    if (userLat == null || userLng == null || step.targetLat == null || step.targetLng == null) {
      // No location data — simulate a score
      const baseScore = 50 + Math.floor(Math.random() * 30);
      return {
        score: baseScore,
        feedback: `Konum bilgisi alınamadı. Tahmini eşleşme: %${baseScore}`,
      };
    }

    const distance = haversineDistance(userLat, userLng, step.targetLat, step.targetLng);
    const radius = step.targetRadiusM ?? 200;

    let locationScore: number;
    if (distance <= radius * 0.25) {
      locationScore = 95 + Math.floor(Math.random() * 5);
    } else if (distance <= radius * 0.5) {
      locationScore = 80 + Math.floor(Math.random() * 15);
    } else if (distance <= radius) {
      locationScore = 60 + Math.floor(Math.random() * 20);
    } else if (distance <= radius * 2) {
      locationScore = 30 + Math.floor(Math.random() * 25);
    } else {
      locationScore = Math.max(5, 30 - Math.floor(distance / radius) * 5);
    }

    // For photo type, blend with a random "visual similarity" factor
    if (step.type === "photo") {
      const visualScore = 40 + Math.floor(Math.random() * 50);
      const score = Math.round(locationScore * 0.5 + visualScore * 0.5);
      const feedback = score >= (step.requiredMatchPct ?? 70)
        ? `Harika! Konum ve görsel eşleşmesi: %${score}`
        : `Eşleşme yetersiz: %${score}. Daha yakına gidin ve tekrar çekin.`;
      return { score, feedback };
    }

    const feedback = locationScore >= (step.requiredMatchPct ?? 70)
      ? `Konum doğrulandı! Eşleşme: %${locationScore}`
      : `Konuma daha yakın olmanız gerekiyor. Eşleşme: %${locationScore}`;
    return { score: locationScore, feedback };
  }

  return { score: 0, feedback: "Bilinmeyen adım türü." };
}

// Submit evidence
router.post("/submissions", async (req, res) => {
  try {
    const { userId, caseId, stepId, userLat, userLng, userAnswer = null } = req.body as { userId: string; caseId: string; stepId: string; userLat?: number | null; userLng?: number | null; userAnswer?: string | null };

    const [step] = await db.select().from(caseStepsTable).where(eq(caseStepsTable.id, stepId));
    if (!step) { res.status(404).json({ error: "Step not found" }); return; }

    const { score, feedback } = calculateMatchScore(step, userLat, userLng, userAnswer);
    const passed = score >= step.requiredMatchPct;

    const id = randomUUID();
    await db.insert(submissionsTable).values({
      id,
      userId,
      caseId,
      stepId,
      matchScore: score,
      passed,
      userLat: userLat ?? null,
      userLng: userLng ?? null,
    });

    res.json({
      id,
      matchScore: score,
      passed,
      requiredScore: step.requiredMatchPct,
      feedback,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create submission");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
