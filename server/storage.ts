import { db } from "./db";
import { 
  users, journals, prompts, resources, homework, reminders,
  type User, type InsertUser,
  type Journal, type InsertJournal,
  type Prompt, type InsertPrompt,
  type Resource, type InsertResource,
  type Homework, type InsertHomework,
  type Reminder, type InsertReminder
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Auth
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Journals
  getJournals(userId: string): Promise<Journal[]>;
  createJournal(journal: InsertJournal): Promise<Journal>;

  // Prompts
  getPrompts(): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;

  // Resources
  getResources(): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;

  // Homework
  getHomework(userId: string): Promise<Homework[]>;
  createHomework(homework: InsertHomework): Promise<Homework>;
  updateHomework(id: number, updates: Partial<InsertHomework>): Promise<Homework>;

  // Reminders
  getReminders(userId: string): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Journals
  async getJournals(userId: string): Promise<Journal[]> {
    return await db.select().from(journals)
      .where(eq(journals.userId, userId))
      .orderBy(desc(journals.date));
  }

  async createJournal(insertJournal: InsertJournal): Promise<Journal> {
    const [journal] = await db.insert(journals).values(insertJournal).returning();
    return journal;
  }

  // Prompts
  async getPrompts(): Promise<Prompt[]> {
    return await db.select().from(prompts).where(eq(prompts.isActive, true));
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const [prompt] = await db.insert(prompts).values(insertPrompt).returning();
    return prompt;
  }

  // Resources
  async getResources(): Promise<Resource[]> {
    return await db.select().from(resources);
  }

  async createResource(insertResource: InsertResource): Promise<Resource> {
    const [resource] = await db.insert(resources).values(insertResource).returning();
    return resource;
  }

  // Homework
  async getHomework(userId: string): Promise<Homework[]> {
    return await db.select().from(homework).where(eq(homework.userId, userId));
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

  // Reminders
  async getReminders(userId: string): Promise<Reminder[]> {
    return await db.select().from(reminders).where(eq(reminders.userId, userId));
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const [reminder] = await db.insert(reminders).values(insertReminder).returning();
    return reminder;
  }
}

export const storage = new DatabaseStorage();
