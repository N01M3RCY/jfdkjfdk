import { pgTable, text, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const submissionsTable = pgTable("submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  caseId: text("case_id").notNull(),
  stepId: text("step_id").notNull(),
  matchScore: integer("match_score").notNull(),
  passed: boolean("passed").notNull(),
  userLat: real("user_lat"),
  userLng: real("user_lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ createdAt: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
