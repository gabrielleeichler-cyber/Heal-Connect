import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { storage } from "./storage";
import { api } from "@shared/routes";

// Seed function to populate initial data
async function seedDatabase() {
  try {
    // Add some example prompts
    const existingPrompts = await storage.getPrompts();
    if (existingPrompts.length === 0) {
      await storage.createPrompt({ content: "What are three things you're grateful for today?", isActive: true });
      await storage.createPrompt({ content: "Describe a challenging situation this week and how you handled it.", isActive: true });
      await storage.createPrompt({ content: "What emotions have you noticed recurring lately?", isActive: true });
      await storage.createPrompt({ content: "Write about a moment this week when you felt at peace.", isActive: true });
    }

    // Add some example resources
    const existingResources = await storage.getResources();
    if (existingResources.length === 0) {
      await storage.createResource({ 
        title: "Breathing Exercises", 
        content: "Try the 4-7-8 technique: Breathe in for 4 seconds, hold for 7 seconds, exhale for 8 seconds. Repeat 3-4 times when feeling anxious.",
        category: "relaxation"
      });
      await storage.createResource({ 
        title: "Grounding Techniques", 
        content: "The 5-4-3-2-1 method: Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.",
        category: "anxiety"
      });
      await storage.createResource({ 
        title: "Sleep Hygiene Tips", 
        content: "1. Keep a consistent sleep schedule\n2. Create a relaxing bedtime routine\n3. Avoid screens 1 hour before bed\n4. Keep your room cool and dark",
        category: "wellness"
      });
      await storage.createResource({ 
        title: "Mindfulness Basics", 
        content: "Start with just 5 minutes of daily meditation. Focus on your breath and gently redirect your attention when your mind wanders. There's no wrong way to do it!",
        category: "mindfulness"
      });
    }
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Seed the database with initial data
  seedDatabase();

  // Helper to get user ID from Replit Auth claims
  const getUserId = (req: any): string | null => {
    if (!req.isAuthenticated || !req.isAuthenticated()) return null;
    return req.user?.claims?.sub || null;
  };

  // Helper to check if user is a therapist
  const isTherapist = async (req: any): Promise<boolean> => {
    const userId = getUserId(req);
    if (!userId) return false;
    const user = await storage.getUser(userId);
    return user?.role === "therapist" || user?.isTherapist === true;
  };

  // Clients (therapist only)
  app.get(api.clients.list.path, isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const clients = await storage.getClients();
    res.json(clients);
  });

  // Journals
  app.get(api.journals.list.path, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    const journals = await storage.getJournals(userId);
    res.json(journals);
  });

  app.post(api.journals.create.path, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    const input = api.journals.create.input.parse(req.body);
    const journal = await storage.createJournal({ ...input, userId });
    res.status(201).json(journal);
  });

  // Prompts
  app.get(api.prompts.list.path, isAuthenticated, async (req, res) => {
    const prompts = await storage.getPrompts();
    res.json(prompts);
  });

  app.post(api.prompts.create.path, isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can create prompts" });
    }
    const prompt = await storage.createPrompt(api.prompts.create.input.parse(req.body));
    res.status(201).json(prompt);
  });

  app.patch("/api/prompts/:id", isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can update prompts" });
    }
    const id = parseInt(req.params.id);
    const updates = api.prompts.update.input.parse(req.body);
    const updated = await storage.updatePrompt(id, updates);
    res.json(updated);
  });

  app.delete("/api/prompts/:id", isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can delete prompts" });
    }
    const id = parseInt(req.params.id);
    await storage.deletePrompt(id);
    res.sendStatus(204);
  });

  // Resources
  app.get(api.resources.list.path, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const therapist = await isTherapist(req);
    // Therapists see all resources; clients see only general + their own
    const resources = therapist 
      ? await storage.getResources() 
      : await storage.getResources(userId || undefined);
    res.json(resources);
  });

  app.post(api.resources.create.path, isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can create resources" });
    }
    const resource = await storage.createResource(api.resources.create.input.parse(req.body));
    res.status(201).json(resource);
  });

  app.patch("/api/resources/:id", isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can update resources" });
    }
    const id = parseInt(req.params.id);
    const updates = api.resources.update.input.parse(req.body);
    const updated = await storage.updateResource(id, updates);
    res.json(updated);
  });

  app.delete("/api/resources/:id", isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can delete resources" });
    }
    const id = parseInt(req.params.id);
    await storage.deleteResource(id);
    res.sendStatus(204);
  });

  // Homework
  app.get(api.homework.list.path, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    
    const therapist = await isTherapist(req);
    const homework = therapist 
      ? await storage.getAllHomework() 
      : await storage.getHomework(userId);
    res.json(homework);
  });

  app.post(api.homework.create.path, isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can create homework" });
    }
    const homework = await storage.createHomework(api.homework.create.input.parse(req.body));
    res.status(201).json(homework);
  });

  app.patch(api.homework.update.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = api.homework.update.input.parse(req.body);
    const updated = await storage.updateHomework(id, updates);
    res.json(updated);
  });

  app.delete("/api/homework/:id", isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can delete homework" });
    }
    const id = parseInt(req.params.id);
    await storage.deleteHomework(id);
    res.sendStatus(204);
  });

  // Reminders
  app.get(api.reminders.list.path, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    
    const therapist = await isTherapist(req);
    const reminders = therapist 
      ? await storage.getAllReminders() 
      : await storage.getReminders(userId);
    res.json(reminders);
  });

  app.post(api.reminders.create.path, isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can create reminders" });
    }
    const reminder = await storage.createReminder(api.reminders.create.input.parse(req.body));
    res.status(201).json(reminder);
  });

  app.delete("/api/reminders/:id", isAuthenticated, async (req: any, res) => {
    if (!(await isTherapist(req))) {
      return res.status(403).json({ message: "Only therapists can delete reminders" });
    }
    const id = parseInt(req.params.id);
    await storage.deleteReminder(id);
    res.sendStatus(204);
  });

  return httpServer;
}
