# Therapy Client Portal

## Overview

This is a therapy client portal application designed to facilitate communication and progress tracking between therapists and their clients. The platform enables clients to journal, view resources, track homework assignments, receive reminders, and manage treatment plans. Therapists and office admins have elevated permissions to manage client data, create prompts, and assign resources.

The application follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence and Replit Auth for authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (warm terracotta/cream theme inspired by Focus Psychology branding)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful API endpoints under `/api/*`
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **File Uploads**: Presigned URL pattern with Google Cloud Storage via Uppy

### Database Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**: users, journals, prompts, resources, homework, reminders, treatment_plans, treatment_goals, treatment_objectives, treatment_progress, sessions

### Role-Based Access Control
Three user roles with hierarchical permissions:
- **therapist**: Full access to all features and client data
- **office_admin**: Limited administrative access
- **client**: Access to personal data only (journals, assigned resources, homework, reminders)

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components (shadcn/ui)
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   └── lib/             # Utilities and query client
├── server/              # Express backend
│   ├── replit_integrations/  # Auth and object storage modules
│   ├── routes.ts        # API route definitions
│   └── storage.ts       # Database access layer
├── shared/              # Shared code between client/server
│   ├── schema.ts        # Drizzle database schema
│   └── routes.ts        # API type definitions
└── migrations/          # Drizzle database migrations
```

### Key Design Decisions

**Monorepo Structure**: Client and server share TypeScript types through the `shared/` directory, ensuring type safety across the full stack.

**Storage Abstraction**: The `IStorage` interface in `server/storage.ts` abstracts all database operations, making it easier to test and modify data access patterns.

**Component Library**: Using shadcn/ui provides accessible, customizable components that can be modified directly in the codebase rather than relying on a package.

**Query Pattern**: TanStack Query handles all API requests with automatic caching, refetching, and error handling. The query key convention uses the API path (e.g., `["/api/journals"]`).

## External Dependencies

### Authentication
- **Replit Auth**: OpenID Connect-based authentication handled through `server/replit_integrations/auth/`
- Sessions stored in PostgreSQL `sessions` table
- User profiles synced on login via upsert pattern

### Database
- **PostgreSQL**: Required for data persistence
- Connection via `DATABASE_URL` environment variable
- Schema managed through Drizzle ORM

### Object Storage
- **Google Cloud Storage**: File uploads via presigned URLs
- Integrated through Replit's sidecar service at `http://127.0.0.1:1106`
- Uppy library handles client-side upload UI

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `ISSUER_URL`: OpenID Connect issuer (defaults to Replit)
- `REPL_ID`: Automatically set by Replit environment

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: Accessible UI primitives
- `passport` / `openid-client`: Authentication
- `@uppy/*`: File upload handling
- `@google-cloud/storage`: Object storage client