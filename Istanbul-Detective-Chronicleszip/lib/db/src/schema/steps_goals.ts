import { pgTable, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyStepsTable = pgTable("daily_steps", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  steps: integer("steps").notNull().default(0),
  goalSteps: integer("goal_steps").notNull().default(10000),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyStepsSchema = createInsertSchema(dailyStepsTable).omit({ createdAt: true, updatedAt: true });
export type InsertDailySteps = z.infer<typeof insertDailyStepsSchema>;
export type DailySteps = typeof dailyStepsTable.$inferSelect;
