import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const socialPostsTable = pgTable("social_posts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  // type: 'checkin' | 'achievement' | 'thought' — no case spoilers or hints
  type: text("type").notNull().default("thought"),
  content: text("content").notNull(),
  city: text("city"),
  district: text("district"),
  // for achievements: stores badge name or XP milestone
  achievementLabel: text("achievement_label"),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SocialPost = typeof socialPostsTable.$inferSelect;

// Track likes per user (prevent double-liking)
export const postLikesTable = pgTable("post_likes", {
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
});
