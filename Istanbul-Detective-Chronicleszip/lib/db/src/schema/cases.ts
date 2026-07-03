import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const casesTable = pgTable("cases", {
  id: text("id").primaryKey(),
  codeTitle: text("code_title").notNull().default(""), // Mystery codename shown before solving
  title: text("title").notNull(),
  description: text("description").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  difficulty: text("difficulty").notNull().default("orta"),
  category: text("category").notNull().default("cinayet"),
  thumbnailUrl: text("thumbnail_url"),
  isActive: boolean("is_active").notNull().default(true),
  maxParticipants: integer("max_participants").notNull().default(0), // 0 = unlimited
  // JSON array of suspects: [{id, name, bio, culpritClue, isCulprit}]
  suspects: text("suspects").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ createdAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
