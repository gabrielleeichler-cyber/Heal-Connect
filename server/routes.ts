import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import helmet from "helmet";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { storage } from "./storage";
import { isTherapistRole, isOfficeAdminRole } from "@shared/schema";
import type { InsertAuditLog } from "@shared/schema";

// Session timeout in minutes (HIPAA recommends 15-30 minutes)
const SESSION_TIMEOUT_MINUTES = 30;

// Helper to create audit log entries
const createAuditEntry = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  targetUserId?: string,
  req?: any,
  details?: string
) => {
  try {
    await storage.createAuditLog({
      userId,
      action,
      resourceType,
      resourceId: resourceId || null,
      targetUserId: targetUserId || null,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.headers?.["user-agent"] || null,
      details: details || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};

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
  // Apply security headers (HIPAA requirement)
  // Note: CSP is relaxed in development for Vite HMR. In production, stricter rules apply.
  const isProduction = process.env.NODE_ENV === "production";
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Needed for styled-components/emotion
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    } : false, // Disable CSP in development for Vite HMR
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" },
  }));

  // Session activity tracking middleware (for session timeout)
  app.use(async (req: any, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated() && req.sessionID && req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      const activity = await storage.getSessionActivity(req.sessionID);
      
      if (activity) {
        const lastActivity = new Date(activity.lastActivity);
        const now = new Date();
        const minutesSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
        
        if (minutesSinceLastActivity > SESSION_TIMEOUT_MINUTES) {
          // Session timed out - log out user
          await createAuditEntry(userId, "session_timeout", "session", req.sessionID, undefined, req);
          req.logout((err: any) => {
            if (err) console.error("Logout error:", err);
          });
          return res.status(401).json({ message: "Session expired due to inactivity" });
        }
      }
      
      // Update last activity
      await storage.updateSessionActivity(req.sessionID, userId);
    }
    next();
  });

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
    const userId = getUserId(req);
    const { clientId } = req.params;
    
    // Log access to client journal data (HIPAA audit requirement)
    await createAuditEntry(userId!, "view", "journal", undefined, clientId, req);
    
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
  app.get("/api/prompts", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const role = await getUserRole(req);
    // Therapists see all prompts for management
    // Clients and office admins see only prompts assigned to them or global prompts
    const prompts = isTherapistRole(role)
      ? await storage.getPrompts()
      : await storage.getPrompts(userId!);
    res.json(prompts);
  });

  app.post("/api/prompts", isAuthenticated, requireTherapist, async (req: any, res) => {
    const { content, isActive, clientId } = req.body;
    const prompt = await storage.createPrompt({ content, isActive: isActive ?? true, clientId: clientId || null });
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
      // Log therapist access to all treatment plans (HIPAA audit)
      await createAuditEntry(userId, "view_all", "treatment_plan", undefined, undefined, req);
      const plans = await storage.getAllTreatmentPlans();
      res.json(plans);
    } else {
      // Log client access to their own treatment plan
      await createAuditEntry(userId, "view", "treatment_plan", undefined, userId, req);
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
    
    // Log therapist access to client treatment plan (HIPAA audit)
    if (isTherapistRole(role) && userId !== clientId) {
      await createAuditEntry(userId!, "view", "treatment_plan", undefined, clientId, req);
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
    const userId = getUserId(req);
    const role = await getUserRole(req);
    const planId = parseInt(req.params.planId);
    
    if (!(await verifyPlanAccess(req, planId))) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Log access to treatment goals (HIPAA audit)
    const plans = await storage.getAllTreatmentPlans();
    const plan = plans.find(p => p.id === planId);
    if (plan && isTherapistRole(role)) {
      await createAuditEntry(userId!, "view", "treatment_goals", String(planId), plan.clientId, req);
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
    } else {
      // Therapist accessing objectives - log for HIPAA audit
      const allPlans = await storage.getAllTreatmentPlans();
      const allGoals = await Promise.all(allPlans.map(p => storage.getGoals(p.id)));
      for (let i = 0; i < allPlans.length; i++) {
        if (allGoals[i].some(g => g.id === goalId)) {
          await createAuditEntry(userId!, "view", "treatment_objectives", String(goalId), allPlans[i].clientId, req);
          break;
        }
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
    const userId = getUserId(req);
    const objectiveId = parseInt(req.params.objectiveId);
    
    // Derive client from objective -> goal -> plan chain for HIPAA audit
    let targetClientId: string | undefined;
    const allPlans = await storage.getAllTreatmentPlans();
    for (const plan of allPlans) {
      const goals = await storage.getGoals(plan.id);
      for (const goal of goals) {
        const objectives = await storage.getObjectives(goal.id);
        if (objectives.some(o => o.id === objectiveId)) {
          targetClientId = plan.clientId;
          break;
        }
      }
      if (targetClientId) break;
    }
    
    // Log therapist access to progress notes with client context (HIPAA audit)
    await createAuditEntry(userId!, "view", "treatment_progress", String(objectiveId), targetClientId, req);
    
    const progress = await storage.getProgress(objectiveId);
    res.json(progress);
  });

  app.post("/api/treatment-progress", isAuthenticated, requireTherapist, async (req: any, res) => {
    const progress = await storage.createProgress(req.body);
    res.status(201).json(progress);
  });

  // ===== HIPAA COMPLIANCE ENDPOINTS =====
  
  // Audit logs (therapist only - for compliance reporting)
  app.get("/api/audit-logs", isAuthenticated, requireTherapist, async (req: any, res) => {
    const userId = getUserId(req);
    const { targetUserId, startDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    
    // Log that someone is viewing audit logs
    await createAuditEntry(userId!, "view", "audit_logs", undefined, targetUserId as string, req);
    
    const logs = await storage.getAuditLogs(targetUserId as string, start);
    res.json(logs);
  });

  // Client can view who has accessed their data (HIPAA transparency requirement)
  app.get("/api/my-data-access", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    
    const logs = await storage.getClientDataAccessLogs(userId);
    // Filter to only show relevant access events, hide internal details
    const sanitizedLogs = logs.map(log => ({
      action: log.action,
      resourceType: log.resourceType,
      createdAt: log.createdAt,
      accessedBy: log.userId !== userId ? "Healthcare Provider" : "You",
    }));
    res.json(sanitizedLogs);
  });

  // Data disclosures - record when PHI is shared outside the system
  app.post("/api/data-disclosures", isAuthenticated, requireTherapist, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    
    const { clientId, disclosedTo, purpose, dataTypes } = req.body;
    const disclosure = await storage.createDataDisclosure({
      clientId,
      disclosedBy: userId,
      disclosedTo,
      purpose,
      dataTypes,
    });
    
    // Log the disclosure
    await createAuditEntry(userId, "create", "data_disclosure", String(disclosure.id), clientId, req);
    
    res.status(201).json(disclosure);
  });

  // Client can view their disclosure history
  app.get("/api/my-disclosures", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.sendStatus(401);
    
    const disclosures = await storage.getClientDisclosures(userId);
    res.json(disclosures);
  });

  // Session status endpoint (for frontend timeout tracking)
  app.get("/api/session-status", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId || !req.sessionID) return res.sendStatus(401);
    
    const activity = await storage.getSessionActivity(req.sessionID);
    if (!activity) {
      return res.json({ valid: true, remainingMinutes: SESSION_TIMEOUT_MINUTES });
    }
    
    const lastActivity = new Date(activity.lastActivity);
    const now = new Date();
    const minutesSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    const remainingMinutes = Math.max(0, SESSION_TIMEOUT_MINUTES - minutesSinceLastActivity);
    
    res.json({ 
      valid: remainingMinutes > 0,
      remainingMinutes: Math.round(remainingMinutes),
      timeoutMinutes: SESSION_TIMEOUT_MINUTES 
    });
  });

  return httpServer;
}
