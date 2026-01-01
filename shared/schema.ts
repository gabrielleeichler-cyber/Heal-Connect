import { pgTable, text, serial, integer, boolean, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { sessions } from "./models/auth";

export { sessions };

// Role enum: therapist has full access, office_admin has limited admin access, client has minimal access
export const userRoleEnum = pgEnum("user_role", ["therapist", "office_admin", "client"]);

// Users table with role-based permissions
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").default("client").notNull(), // 'therapist', 'office_admin', or 'client'
  isTherapist: boolean("is_therapist").default(false), // Legacy field, use role instead
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const journals = pgTable("journals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  date: timestamp("date").defaultNow(),
  isShared: boolean("is_shared").default(true),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  clientId: varchar("client_id"), // If null, available to all clients; if set, only for that client
  createdAt: timestamp("created_at").defaultNow(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  clientId: varchar("client_id"), // If null, available to all clients
  createdAt: timestamp("created_at").defaultNow(),
});

export const homework = pgTable("homework", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("pending"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  message: text("message").notNull(),
  scheduledTime: timestamp("scheduled_time").notNull(),
  sent: boolean("sent").default(false),
});

// Treatment Plans - each client has one treatment plan
export const treatmentPlans = pgTable("treatment_plans", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull().unique(), // One plan per client
  diagnosis: text("diagnosis"),
  summary: text("summary"),
  startDate: timestamp("start_date").defaultNow(),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Goals within a treatment plan
export const treatmentGoals = pgTable("treatment_goals", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  status: text("status").default("in_progress"), // 'in_progress', 'achieved', 'discontinued'
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Objectives under each goal (measurable steps)
export const treatmentObjectives = pgTable("treatment_objectives", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  measurableCriteria: text("measurable_criteria"),
  status: text("status").default("not_started"), // 'not_started', 'in_progress', 'completed'
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Progress notes on objectives
export const treatmentProgress = pgTable("treatment_progress", {
  id: serial("id").primaryKey(),
  objectiveId: integer("objective_id").notNull(),
  note: text("note").notNull(),
  progressLevel: integer("progress_level"), // 0-100 percentage
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== HIPAA COMPLIANCE TABLES =====

// Audit log - tracks all access to protected health information (PHI)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Who performed the action
  action: text("action").notNull(), // 'view', 'create', 'update', 'delete', 'login', 'logout', 'failed_login'
  resourceType: text("resource_type").notNull(), // 'journal', 'treatment_plan', 'resource', etc.
  resourceId: varchar("resource_id"), // ID of the accessed resource
  targetUserId: varchar("target_user_id"), // Whose data was accessed (for client data)
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"), // Additional context (JSON string)
  createdAt: timestamp("created_at").defaultNow(),
});

// Login attempts - for security monitoring and account lockout
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: varchar("email"),
  userId: varchar("user_id"),
  success: boolean("success").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session activity - track session usage for timeout management
export const sessionActivity = pgTable("session_activity", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  userId: varchar("user_id").notNull(),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Data access disclosures - track when PHI is disclosed (HIPAA requirement)
export const dataDisclosures = pgTable("data_disclosures", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull(), // Whose data was disclosed
  disclosedBy: varchar("disclosed_by").notNull(), // Who disclosed it
  disclosedTo: text("disclosed_to"), // Recipient description
  purpose: text("purpose").notNull(), // Reason for disclosure
  dataTypes: text("data_types").notNull(), // What types of data were disclosed
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, isTherapist: true, createdAt: true, updatedAt: true });
export const insertJournalSchema = createInsertSchema(journals).omit({ id: true, date: true });
export const insertPromptSchema = createInsertSchema(prompts).omit({ id: true, createdAt: true });
export const insertResourceSchema = createInsertSchema(resources).omit({ id: true, createdAt: true });
export const insertHomeworkSchema = createInsertSchema(homework).omit({ id: true, createdAt: true });
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true, sent: true });

export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTreatmentGoalSchema = createInsertSchema(treatmentGoals).omit({ id: true, createdAt: true });
export const insertTreatmentObjectiveSchema = createInsertSchema(treatmentObjectives).omit({ id: true, createdAt: true });
export const insertTreatmentProgressSchema = createInsertSchema(treatmentProgress).omit({ id: true, createdAt: true });

// HIPAA compliance schemas
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({ id: true, createdAt: true });
export const insertSessionActivitySchema = createInsertSchema(sessionActivity).omit({ id: true, createdAt: true });
export const insertDataDisclosureSchema = createInsertSchema(dataDisclosures).omit({ id: true, createdAt: true });

// Types
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

export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type InsertTreatmentPlan = z.infer<typeof insertTreatmentPlanSchema>;
export type TreatmentGoal = typeof treatmentGoals.$inferSelect;
export type InsertTreatmentGoal = z.infer<typeof insertTreatmentGoalSchema>;
export type TreatmentObjective = typeof treatmentObjectives.$inferSelect;
export type InsertTreatmentObjective = z.infer<typeof insertTreatmentObjectiveSchema>;
export type TreatmentProgress = typeof treatmentProgress.$inferSelect;
export type InsertTreatmentProgress = z.infer<typeof insertTreatmentProgressSchema>;

// HIPAA compliance types
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type SessionActivity = typeof sessionActivity.$inferSelect;
export type InsertSessionActivity = z.infer<typeof insertSessionActivitySchema>;
export type DataDisclosure = typeof dataDisclosures.$inferSelect;
export type InsertDataDisclosure = z.infer<typeof insertDataDisclosureSchema>;

// Role permission helpers
export const ROLE_HIERARCHY = {
  therapist: 3,
  office_admin: 2,
  client: 1,
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

export function hasRolePermission(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}

export function isTherapistRole(role: string): boolean {
  return role === "therapist";
}

export function isOfficeAdminRole(role: string): boolean {
  return role === "office_admin" || role === "therapist";
}

export function isClientRole(role: string): boolean {
  return role === "client";
}
