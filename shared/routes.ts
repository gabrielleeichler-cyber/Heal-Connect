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
    status: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    }
  },
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
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
    update: {
      method: 'PATCH' as const,
      path: '/api/prompts/:id',
      input: insertPromptSchema.partial(),
      responses: {
        200: z.custom<typeof prompts.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/prompts/:id',
      responses: {
        204: z.void(),
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
    update: {
      method: 'PATCH' as const,
      path: '/api/resources/:id',
      input: insertResourceSchema.partial(),
      responses: {
        200: z.custom<typeof resources.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/resources/:id',
      responses: {
        204: z.void(),
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
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/homework/:id',
      responses: {
        204: z.void(),
      },
    },
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
    delete: {
      method: 'DELETE' as const,
      path: '/api/reminders/:id',
      responses: {
        204: z.void(),
      },
    },
  }
};
