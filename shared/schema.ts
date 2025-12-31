import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { sessions } from "./models/auth";

export { sessions };

// Redefine users to include Auth fields AND our custom fields
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").default("client").notNull(), // 'therapist' or 'client'
  isTherapist: boolean("is_therapist").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const journals = pgTable("journals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Changed to varchar to match users.id
  content: text("content").notNull(),
  date: timestamp("date").defaultNow(),
  isShared: boolean("is_shared").default(true),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
});

export const homework = pgTable("homework", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Changed to varchar
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("pending"),
  dueDate: timestamp("due_date"),
});

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Changed to varchar
  message: text("message").notNull(),
  scheduledTime: timestamp("scheduled_time").notNull(),
  sent: boolean("sent").default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, isTherapist: true, createdAt: true, updatedAt: true });
export const insertJournalSchema = createInsertSchema(journals).omit({ id: true, date: true });
export const insertPromptSchema = createInsertSchema(prompts).omit({ id: true });
export const insertResourceSchema = createInsertSchema(resources).omit({ id: true });
export const insertHomeworkSchema = createInsertSchema(homework).omit({ id: true });
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true, sent: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Journal = typeof journals.$inferSelect;
export type InsertJournal = z.infer<typeof insertJournalSchema>;
export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Homework = typeof homework.$inferSelect;
export type InsertHomework = z.infer<typeof insertHomeworkSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
