import { integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const caseStepsTable = pgTable("case_steps", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  order: integer("order").notNull(),
  type: text("type").notNull(), // 'photo' | 'riddle' | 'location'
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetImageUrl: text("target_image_url"),
  targetLat: real("target_lat"),
  targetLng: real("target_lng"),
  targetRadiusM: integer("target_radius_m"),
  targetAnswer: text("target_answer"),
  requiredMatchPct: integer("required_match_pct").notNull().default(70),
  hint: text("hint"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCaseStepSchema = createInsertSchema(caseStepsTable).omit({ createdAt: true });
export type InsertCaseStep = z.infer<typeof insertCaseStepSchema>;
export type CaseStep = typeof caseStepsTable.$inferSelect;
