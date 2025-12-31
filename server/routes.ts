import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { storage } from "./storage";
import { isTherapistRole, isOfficeAdminRole } from "@shared/schema";

// Seed function to populate initial data
async function seedDatabase() {
  try {
    const existingPrompts = await storage.getPrompts();
    if (existingPrompts.length === 0) {
      await storage.createPrompt({ content: "What are three things you're grateful for today?", isActive: true });
      await storage.createPrompt({ content: "Describe a challenging situation this week and how you handled it.", isActive: true });
      await storage.createPrompt({ content: "What emotions have you noticed recurring lately?", isActive: true });
      await storage.createPrompt({ content: "Write about a moment this week when you felt at peace.", isActive: true });
    }

    const existingResources = await storage.getResources();
    if (existingResources.length === 0) {
      await storage.createResource({ 
        title: "Breathing Exercises", 
        content: "Try the 4-7-8 technique: Breathe in for 4 seconds, hold for 7 seconds, exhale for 8 seconds.",
        category: "relaxation"
      });
      await storage.createResource({ 
        title: "Grounding Techniques", 
        content: "The 5-4-3-2-1 method: Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.",
        category: "anxiety"
      });
    }
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Helper to get user ID from request
const getUserId = (req: any): string | null => {
  if (!req.isAuthenticated || !req.isAuthenticated()) return null;
  return req.user?.claims?.sub || null;
};

// Helper to get user role
const getUserRole = async (req: any): Promise<string> => {
  const userId = getUserId(req);
  if (!userId) return "client";
  const user = await storage.getUser(userId);
  return user?.role || "client";
};

// Middleware: Require therapist role (highest level - clinical access)
const requireTherapist = async (req: any, res: Response, next: NextFunction) => {
  const role = await getUserRole(req);
  if (!isTherapistRole(role)) {
    return res.status(403).json({ message: "Therapist access required" });
  }
  next();
};

// Middleware: Require office admin or higher (admin access without clinical)
const requireOfficeAdmin = async (req: any, res: Response, next: NextFunction) => {
  const role = await getUserRole(req);
  if (!isOfficeAdminRole(role)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);
  seedDatabase();

  // ===== CLIENTS (admin only) =====
  app.get("/api/clients", isAuthenticated, requireOfficeAdmin, async (req: any, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.patch("/api/clients/:id/role", isAuthenticated, requireTherapist, async (req: any, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!["therapist", "office_admin", "client"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await storage.updateUserRole(id, role);
    res.json(user);
  });

  // ===== JOURNALS (client sees own, therapist sees shared) =====
  app.get("/api/journals", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    const journals = await storage.getJournals(userId);
    res.json(journals);
  });

  app.get("/api/journals/client/:clientId", isAuthenticated, requireTherapist, async (req: any, res) => {
    const { clientId } = req.params;
    const journals = await storage.getSharedJournals(clientId);
    res.json(journals);
  });

  app.post("/api/journals", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    const { content, isShared } = req.body;
    const journal = await storage.createJournal({ userId, content, isShared: isShared ?? true });
    res.status(201).json(journal);
  });

  // ===== PROMPTS (therapist only for write) =====
  app.get("/api/prompts", isAuthenticated, async (req, res) => {
    const prompts = await storage.getPrompts();
    res.json(prompts);
  });

  app.post("/api/prompts", isAuthenticated, requireTherapist, async (req: any, res) => {
    const { content, isActive } = req.body;
    const prompt = await storage.createPrompt({ content, isActive: isActive ?? true });
    res.status(201).json(prompt);
  });

  app.patch("/api/prompts/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const prompt = await storage.updatePrompt(id, req.body);
    res.json(prompt);
  });

  app.delete("/api/prompts/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    await storage.deletePrompt(parseInt(req.params.id));
    res.sendStatus(204);
  });

  // ===== RESOURCES (therapist manages, client sees own + general) =====
  app.get("/api/resources", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const role = await getUserRole(req);
    const resources = isTherapistRole(role) 
      ? await storage.getResources() 
      : await storage.getResources(userId || undefined);
    res.json(resources);
  });

  app.post("/api/resources", isAuthenticated, requireTherapist, async (req: any, res) => {
    const resource = await storage.createResource(req.body);
    res.status(201).json(resource);
  });

  app.patch("/api/resources/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    const resource = await storage.updateResource(parseInt(req.params.id), req.body);
    res.json(resource);
  });

  app.delete("/api/resources/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    await storage.deleteResource(parseInt(req.params.id));
    res.sendStatus(204);
  });

  // ===== HOMEWORK (office admin can create, client sees own) =====
  app.get("/api/homework", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    const role = await getUserRole(req);
    const hw = isOfficeAdminRole(role) 
      ? await storage.getAllHomework() 
      : await storage.getHomework(userId);
    res.json(hw);
  });

  app.post("/api/homework", isAuthenticated, requireOfficeAdmin, async (req: any, res) => {
    const hw = await storage.createHomework(req.body);
    res.status(201).json(hw);
  });

  app.patch("/api/homework/:id", isAuthenticated, async (req: any, res) => {
    const hw = await storage.updateHomework(parseInt(req.params.id), req.body);
    res.json(hw);
  });

  app.delete("/api/homework/:id", isAuthenticated, requireOfficeAdmin, async (req: any, res) => {
    await storage.deleteHomework(parseInt(req.params.id));
    res.sendStatus(204);
  });

  // ===== REMINDERS (office admin can manage) =====
  app.get("/api/reminders", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    const role = await getUserRole(req);
    const reminders = isOfficeAdminRole(role) 
      ? await storage.getAllReminders() 
      : await storage.getReminders(userId);
    res.json(reminders);
  });

  app.post("/api/reminders", isAuthenticated, requireOfficeAdmin, async (req: any, res) => {
    const reminder = await storage.createReminder(req.body);
    res.status(201).json(reminder);
  });

  app.delete("/api/reminders/:id", isAuthenticated, requireOfficeAdmin, async (req: any, res) => {
    await storage.deleteReminder(parseInt(req.params.id));
    res.sendStatus(204);
  });

  // ===== TREATMENT PLANS (therapist only for write, client read-only own) =====
  app.get("/api/treatment-plans", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    const role = await getUserRole(req);
    
    if (isTherapistRole(role)) {
      const plans = await storage.getAllTreatmentPlans();
      res.json(plans);
    } else {
      const plan = await storage.getTreatmentPlan(userId);
      res.json(plan ? [plan] : []);
    }
  });

  app.get("/api/treatment-plans/:clientId", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const { clientId } = req.params;
    const role = await getUserRole(req);
    
    // Clients can only view their own plan
    if (!isTherapistRole(role) && userId !== clientId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const plan = await storage.getTreatmentPlan(clientId);
    res.json(plan || null);
  });

  app.post("/api/treatment-plans", isAuthenticated, requireTherapist, async (req: any, res) => {
    const plan = await storage.createTreatmentPlan(req.body);
    res.status(201).json(plan);
  });

  app.patch("/api/treatment-plans/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    const plan = await storage.updateTreatmentPlan(parseInt(req.params.id), req.body);
    res.json(plan);
  });

  // Helper to verify plan ownership
  const verifyPlanAccess = async (req: any, planId: number): Promise<boolean> => {
    const userId = getUserId(req);
    const role = await getUserRole(req);
    if (isTherapistRole(role)) return true;
    
    // Get plan and check if it belongs to this client
    const plans = await storage.getAllTreatmentPlans();
    const plan = plans.find(p => p.id === planId);
    return plan?.clientId === userId;
  };

  // ===== TREATMENT GOALS (therapist or own plan only) =====
  app.get("/api/treatment-goals/:planId", isAuthenticated, async (req: any, res) => {
    const planId = parseInt(req.params.planId);
    if (!(await verifyPlanAccess(req, planId))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const goals = await storage.getGoals(planId);
    res.json(goals);
  });

  app.post("/api/treatment-goals", isAuthenticated, requireTherapist, async (req: any, res) => {
    const goal = await storage.createGoal(req.body);
    res.status(201).json(goal);
  });

  app.patch("/api/treatment-goals/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    const goal = await storage.updateGoal(parseInt(req.params.id), req.body);
    res.json(goal);
  });

  app.delete("/api/treatment-goals/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    await storage.deleteGoal(parseInt(req.params.id));
    res.sendStatus(204);
  });

  // Helper to verify goal access (through plan ownership)
  const verifyGoalAccess = async (req: any, goalId: number): Promise<boolean> => {
    const userId = getUserId(req);
    const role = await getUserRole(req);
    if (isTherapistRole(role)) return true;
    
    // Get goal -> plan -> verify client ownership
    const goals = await storage.getGoals(0); // We need a different approach
    // For now, therapist-only for objectives/progress
    return false;
  };

  // ===== TREATMENT OBJECTIVES (therapist or own plan only) =====
  app.get("/api/treatment-objectives/:goalId", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const role = await getUserRole(req);
    const goalId = parseInt(req.params.goalId);
    
    // Clients can only view objectives if they own the underlying plan
    if (!isTherapistRole(role)) {
      // Find the plan this goal belongs to and verify ownership
      const plans = await storage.getAllTreatmentPlans();
      const clientPlan = plans.find(p => p.clientId === userId);
      if (!clientPlan) {
        return res.status(403).json({ message: "Access denied" });
      }
      const goals = await storage.getGoals(clientPlan.id);
      if (!goals.some(g => g.id === goalId)) {
        return res.status(403).json({ message: "Access denied" });
      }
    }
    
    const objectives = await storage.getObjectives(goalId);
    res.json(objectives);
  });

  app.post("/api/treatment-objectives", isAuthenticated, requireTherapist, async (req: any, res) => {
    const objective = await storage.createObjective(req.body);
    res.status(201).json(objective);
  });

  app.patch("/api/treatment-objectives/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    const objective = await storage.updateObjective(parseInt(req.params.id), req.body);
    res.json(objective);
  });

  app.delete("/api/treatment-objectives/:id", isAuthenticated, requireTherapist, async (req: any, res) => {
    await storage.deleteObjective(parseInt(req.params.id));
    res.sendStatus(204);
  });

  // ===== TREATMENT PROGRESS (therapist only for write) =====
  app.get("/api/treatment-progress/:objectiveId", isAuthenticated, requireTherapist, async (req: any, res) => {
    const progress = await storage.getProgress(parseInt(req.params.objectiveId));
    res.json(progress);
  });

  app.post("/api/treatment-progress", isAuthenticated, requireTherapist, async (req: any, res) => {
    const progress = await storage.createProgress(req.body);
    res.status(201).json(progress);
  });

  return httpServer;
}
