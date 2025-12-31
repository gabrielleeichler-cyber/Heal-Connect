import { z } from 'zod';
import { 
  insertUserSchema, 
  insertJournalSchema, 
  insertPromptSchema, 
  insertResourceSchema, 
  insertHomeworkSchema, 
  insertReminderSchema,
  users, journals, prompts, resources, homework, reminders
} from './schema';

export const api = {
  auth: {
    // Replit Auth handles routes, but we might want status
    status: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    }
  },
  journals: {
    list: {
      method: 'GET' as const,
      path: '/api/journals',
      responses: {
        200: z.array(z.custom<typeof journals.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/journals',
      input: insertJournalSchema,
      responses: {
        201: z.custom<typeof journals.$inferSelect>(),
      },
    },
  },
  prompts: {
    list: {
      method: 'GET' as const,
      path: '/api/prompts',
      responses: {
        200: z.array(z.custom<typeof prompts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/prompts',
      input: insertPromptSchema,
      responses: {
        201: z.custom<typeof prompts.$inferSelect>(),
      },
    },
  },
  resources: {
    list: {
      method: 'GET' as const,
      path: '/api/resources',
      responses: {
        200: z.array(z.custom<typeof resources.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/resources',
      input: insertResourceSchema,
      responses: {
        201: z.custom<typeof resources.$inferSelect>(),
      },
    },
  },
  homework: {
    list: {
      method: 'GET' as const,
      path: '/api/homework',
      responses: {
        200: z.array(z.custom<typeof homework.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/homework',
      input: insertHomeworkSchema,
      responses: {
        201: z.custom<typeof homework.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/homework/:id',
      input: insertHomeworkSchema.partial(),
      responses: {
        200: z.custom<typeof homework.$inferSelect>(),
      },
    }
  },
  reminders: {
    list: {
      method: 'GET' as const,
      path: '/api/reminders',
      responses: {
        200: z.array(z.custom<typeof reminders.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/reminders',
      input: insertReminderSchema,
      responses: {
        201: z.custom<typeof reminders.$inferSelect>(),
      },
    },
  }
};
