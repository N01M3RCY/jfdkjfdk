import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProgressTable = pgTable("user_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  caseId: text("case_id").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  completedSteps: text("completed_steps").notNull().default("[]"), // JSON array
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'failed'
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertUserProgressSchema = createInsertSchema(userProgressTable).omit({ startedAt: true });
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgressTable.$inferSelect;
