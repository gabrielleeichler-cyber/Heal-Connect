import { db } from "./db";
import { 
  users, journals, prompts, resources, homework, reminders,
  treatmentPlans, treatmentGoals, treatmentObjectives, treatmentProgress,
  type User, type InsertUser,
  type Journal, type InsertJournal,
  type Prompt, type InsertPrompt,
  type Resource, type InsertResource,
  type Homework, type InsertHomework,
  type Reminder, type InsertReminder,
  type TreatmentPlan, type InsertTreatmentPlan,
  type TreatmentGoal, type InsertTreatmentGoal,
  type TreatmentObjective, type InsertTreatmentObjective,
  type TreatmentProgress, type InsertTreatmentProgress
} from "@shared/schema";
import { eq, desc, or, isNull, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getClients(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;

  // Journals
  getJournals(userId: string): Promise<Journal[]>;
  getSharedJournals(clientId: string): Promise<Journal[]>;
  createJournal(journal: InsertJournal): Promise<Journal>;

  // Prompts
  getPrompts(): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: number, updates: Partial<InsertPrompt>): Promise<Prompt>;
  deletePrompt(id: number): Promise<void>;

  // Resources
  getResources(clientId?: string): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, updates: Partial<InsertResource>): Promise<Resource>;
  deleteResource(id: number): Promise<void>;

  // Homework
  getHomework(userId: string): Promise<Homework[]>;
  getAllHomework(): Promise<Homework[]>;
  createHomework(homework: InsertHomework): Promise<Homework>;
  updateHomework(id: number, updates: Partial<InsertHomework>): Promise<Homework>;
  deleteHomework(id: number): Promise<void>;

  // Reminders
  getReminders(userId: string): Promise<Reminder[]>;
  getAllReminders(): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  deleteReminder(id: number): Promise<void>;

  // Treatment Plans
  getTreatmentPlan(clientId: string): Promise<TreatmentPlan | undefined>;
  getAllTreatmentPlans(): Promise<TreatmentPlan[]>;
  createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan>;
  updateTreatmentPlan(id: number, updates: Partial<InsertTreatmentPlan>): Promise<TreatmentPlan>;

  // Treatment Goals
  getGoals(planId: number): Promise<TreatmentGoal[]>;
  createGoal(goal: InsertTreatmentGoal): Promise<TreatmentGoal>;
  updateGoal(id: number, updates: Partial<InsertTreatmentGoal>): Promise<TreatmentGoal>;
  deleteGoal(id: number): Promise<void>;

  // Treatment Objectives
  getObjectives(goalId: number): Promise<TreatmentObjective[]>;
  createObjective(objective: InsertTreatmentObjective): Promise<TreatmentObjective>;
  updateObjective(id: number, updates: Partial<InsertTreatmentObjective>): Promise<TreatmentObjective>;
  deleteObjective(id: number): Promise<void>;

  // Treatment Progress
  getProgress(objectiveId: number): Promise<TreatmentProgress[]>;
  createProgress(progress: InsertTreatmentProgress): Promise<TreatmentProgress>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getClients(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "client"));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Journals
  async getJournals(userId: string): Promise<Journal[]> {
    return await db.select().from(journals)
      .where(eq(journals.userId, userId))
      .orderBy(desc(journals.date));
  }

  async getSharedJournals(clientId: string): Promise<Journal[]> {
    return await db.select().from(journals)
      .where(and(eq(journals.userId, clientId), eq(journals.isShared, true)))
      .orderBy(desc(journals.date));
  }

  async createJournal(insertJournal: InsertJournal): Promise<Journal> {
    const [journal] = await db.insert(journals).values(insertJournal).returning();
    return journal;
  }

  // Prompts
  async getPrompts(): Promise<Prompt[]> {
    return await db.select().from(prompts).where(eq(prompts.isActive, true)).orderBy(desc(prompts.createdAt));
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const [prompt] = await db.insert(prompts).values(insertPrompt).returning();
    return prompt;
  }

  async updatePrompt(id: number, updates: Partial<InsertPrompt>): Promise<Prompt> {
    const [prompt] = await db.update(prompts)
      .set(updates)
      .where(eq(prompts.id, id))
      .returning();
    return prompt;
  }

  async deletePrompt(id: number): Promise<void> {
    await db.delete(prompts).where(eq(prompts.id, id));
  }

  // Resources
  async getResources(clientId?: string): Promise<Resource[]> {
    if (clientId) {
      return await db.select().from(resources)
        .where(or(eq(resources.clientId, clientId), isNull(resources.clientId)))
        .orderBy(desc(resources.createdAt));
    }
    return await db.select().from(resources).orderBy(desc(resources.createdAt));
  }

  async createResource(insertResource: InsertResource): Promise<Resource> {
    const [resource] = await db.insert(resources).values(insertResource).returning();
    return resource;
  }

  async updateResource(id: number, updates: Partial<InsertResource>): Promise<Resource> {
    const [resource] = await db.update(resources)
      .set(updates)
      .where(eq(resources.id, id))
      .returning();
    return resource;
  }

  async deleteResource(id: number): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }

  // Homework
  async getHomework(userId: string): Promise<Homework[]> {
    return await db.select().from(homework)
      .where(eq(homework.userId, userId))
      .orderBy(desc(homework.createdAt));
  }

  async getAllHomework(): Promise<Homework[]> {
    return await db.select().from(homework).orderBy(desc(homework.createdAt));
  }

  async createHomework(insertHomework: InsertHomework): Promise<Homework> {
    const [hw] = await db.insert(homework).values(insertHomework).returning();
    return hw;
  }

  async updateHomework(id: number, updates: Partial<InsertHomework>): Promise<Homework> {
    const [hw] = await db.update(homework)
      .set(updates)
      .where(eq(homework.id, id))
      .returning();
    return hw;
  }

  async deleteHomework(id: number): Promise<void> {
    await db.delete(homework).where(eq(homework.id, id));
  }

  // Reminders
  async getReminders(userId: string): Promise<Reminder[]> {
    return await db.select().from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(desc(reminders.scheduledTime));
  }

  async getAllReminders(): Promise<Reminder[]> {
    return await db.select().from(reminders).orderBy(desc(reminders.scheduledTime));
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const [reminder] = await db.insert(reminders).values(insertReminder).returning();
    return reminder;
  }

  async deleteReminder(id: number): Promise<void> {
    await db.delete(reminders).where(eq(reminders.id, id));
  }

  // Treatment Plans
  async getTreatmentPlan(clientId: string): Promise<TreatmentPlan | undefined> {
    const [plan] = await db.select().from(treatmentPlans)
      .where(eq(treatmentPlans.clientId, clientId));
    return plan;
  }

  async getAllTreatmentPlans(): Promise<TreatmentPlan[]> {
    return await db.select().from(treatmentPlans).orderBy(desc(treatmentPlans.createdAt));
  }

  async createTreatmentPlan(insertPlan: InsertTreatmentPlan): Promise<TreatmentPlan> {
    const [plan] = await db.insert(treatmentPlans).values(insertPlan).returning();
    return plan;
  }

  async updateTreatmentPlan(id: number, updates: Partial<InsertTreatmentPlan>): Promise<TreatmentPlan> {
    const [plan] = await db.update(treatmentPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(treatmentPlans.id, id))
      .returning();
    return plan;
  }

  // Treatment Goals
  async getGoals(planId: number): Promise<TreatmentGoal[]> {
    return await db.select().from(treatmentGoals)
      .where(eq(treatmentGoals.planId, planId))
      .orderBy(treatmentGoals.order);
  }

  async createGoal(insertGoal: InsertTreatmentGoal): Promise<TreatmentGoal> {
    const [goal] = await db.insert(treatmentGoals).values(insertGoal).returning();
    return goal;
  }

  async updateGoal(id: number, updates: Partial<InsertTreatmentGoal>): Promise<TreatmentGoal> {
    const [goal] = await db.update(treatmentGoals)
      .set(updates)
      .where(eq(treatmentGoals.id, id))
      .returning();
    return goal;
  }

  async deleteGoal(id: number): Promise<void> {
    await db.delete(treatmentGoals).where(eq(treatmentGoals.id, id));
  }

  // Treatment Objectives
  async getObjectives(goalId: number): Promise<TreatmentObjective[]> {
    return await db.select().from(treatmentObjectives)
      .where(eq(treatmentObjectives.goalId, goalId))
      .orderBy(treatmentObjectives.order);
  }

  async createObjective(insertObjective: InsertTreatmentObjective): Promise<TreatmentObjective> {
    const [objective] = await db.insert(treatmentObjectives).values(insertObjective).returning();
    return objective;
  }

  async updateObjective(id: number, updates: Partial<InsertTreatmentObjective>): Promise<TreatmentObjective> {
    const [objective] = await db.update(treatmentObjectives)
      .set(updates)
      .where(eq(treatmentObjectives.id, id))
      .returning();
    return objective;
  }

  async deleteObjective(id: number): Promise<void> {
    await db.delete(treatmentObjectives).where(eq(treatmentObjectives.id, id));
  }

  // Treatment Progress
  async getProgress(objectiveId: number): Promise<TreatmentProgress[]> {
    return await db.select().from(treatmentProgress)
      .where(eq(treatmentProgress.objectiveId, objectiveId))
      .orderBy(desc(treatmentProgress.createdAt));
  }

  async createProgress(insertProgress: InsertTreatmentProgress): Promise<TreatmentProgress> {
    const [progress] = await db.insert(treatmentProgress).values(insertProgress).returning();
    return progress;
  }
}

export const storage = new DatabaseStorage();
