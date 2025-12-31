import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up Replit Auth
  setupAuth(app);

  // Journals
  app.get(api.journals.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const journals = await storage.getJournals(req.user.id);
    res.json(journals);
  });

  app.post(api.journals.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.journals.create.input.parse(req.body);
    // Force userId to match authenticated user
    const journal = await storage.createJournal({ ...input, userId: req.user.id });
    res.status(201).json(journal);
  });

  // Prompts
  app.get(api.prompts.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const prompts = await storage.getPrompts();
    res.json(prompts);
  });

  app.post(api.prompts.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Ideally check if user is therapist
    const prompt = await storage.createPrompt(api.prompts.create.input.parse(req.body));
    res.status(201).json(prompt);
  });

  // Resources
  app.get(api.resources.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const resources = await storage.getResources();
    res.json(resources);
  });

  app.post(api.resources.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const resource = await storage.createResource(api.resources.create.input.parse(req.body));
    res.status(201).json(resource);
  });

  // Homework
  app.get(api.homework.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const homework = await storage.getHomework(req.user.id);
    res.json(homework);
  });

  app.post(api.homework.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const homework = await storage.createHomework(api.homework.create.input.parse(req.body));
    res.status(201).json(homework);
  });

  app.patch(api.homework.update.path.replace(":id", ":id"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const updates = api.homework.update.input.parse(req.body);
    const updated = await storage.updateHomework(id, updates);
    res.json(updated);
  });

  // Reminders
  app.get(api.reminders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const reminders = await storage.getReminders(req.user.id);
    res.json(reminders);
  });

  app.post(api.reminders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const reminder = await storage.createReminder(api.reminders.create.input.parse(req.body));
    res.status(201).json(reminder);
  });

  return httpServer;
}
