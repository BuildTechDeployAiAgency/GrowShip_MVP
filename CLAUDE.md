# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start development server (port 3000)
npm run build        # Build for production  
npm run start        # Start production server

# TypeScript checking - IMPORTANT: Always run this before committing
npx tsc --noEmit     # TypeScript type checking (no lint/typecheck npm scripts available)

# Server management
# Stop server: Ctrl + C
# Clean cache: rm -rf .next
# Clean npm cache: npm cache clean --force
# Full restart: npm install && npm run build && npm run dev
```

## Project Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router and React 19
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 4 with Radix UI components
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **State Management**: TanStack React Query v5 + React Context
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for analytics dashboards

### Core Architecture Patterns

**Multi-Tenant SaaS**: Platform serves three user types (Brand, Distributor, Manufacturer) with organization-based data isolation using Supabase Row Level Security.

**Role-Based Access Control**: Hierarchical permissions system with roles like `brand_admin`, `distributor_manager`, etc. Permission levels 1-4 control access to features and menu items.

**Dynamic Menu System**: Menu items are fetched from Supabase based on user role and cached locally. Menu permissions control visibility and actions (view/edit/delete/approve).

**Protected Routes**: Middleware at `/middleware.ts` handles authentication, profile completion checks, and user status validation (pending/approved/suspended).

### Key Directory Structure

```
/app/(authenticated)/     # Protected routes with shared layout
/components/             # Organized by domain (auth, dashboard, users, etc.)
/hooks/                 # Custom React hooks for data fetching
/lib/                   # Utilities, permissions, Supabase clients
/types/                 # TypeScript definitions
/contexts/              # React contexts for state management
```

## Important Architectural Concepts

### User Status Flow
- `pending` users: Dashboard access only, awaiting approval
- `approved` users: Full access based on role permissions  
- `suspended` users: Redirected to auth/suspended page

### Authentication & Profile Setup
- User signs up → profile created (incomplete) → redirected to `/profile/setup`
- Profile completion required before accessing main application
- Middleware enforces authentication and profile completion

### Data Fetching Patterns
- All server state managed via TanStack React Query
- Supabase clients: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (SSR)
- Query keys namespaced by domain, 5-minute stale time for menu permissions
- Local storage caching for user data and menu permissions

### Backend Integration
FastAPI service in `/Backend/` handles file uploads, Excel/CSV processing, and AI-assisted column mapping. Endpoints at `/api/v1/excel/*` integrate with the Next.js frontend.

## Development Guidelines

### File Naming Conventions
- Components: `kebab-case.tsx` (e.g., `user-form-dialog.tsx`)
- Hooks: `use-*.ts` (e.g., `use-users.ts`)
- Types: `kebab-case.ts` (e.g., `auth.ts`)
- Pages: Next.js convention (`page.tsx`, `layout.tsx`)
- API Routes: `/app/api/[resource]/[action]/route.ts`

### Component Patterns
- Use `"use client"` directive for client-side interactivity
- Wrap data fetching in custom hooks (40+ hooks available in `/hooks/`)
- Use `cn()` from `lib/utils.ts` for conditional classes
- Form validation with React Hook Form + Zod schemas
- Toast notifications via `sonner` package
- UI components from Radix UI + shadcn/ui patterns

### TypeScript Configuration
- Strict mode enabled with path mapping `@/*` to project root
- ES2017 target with modern module resolution
- All components and hooks are fully typed

### Environment Configuration
Required environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

### Critical Code Patterns

**Permission System**: Use `PermissionChecker` class from `lib/permissions.ts` for all access control:
```typescript
const checker = createPermissionChecker(userRole, userOrganizationId);
if (!checker.canManageUsers()) return;
```

**API Route Structure**: All routes follow pattern `/app/api/[resource]/[action]/route.ts` with proper error handling and authentication checks via Supabase clients.

**Data Fetching**: Use TanStack Query hooks from `/hooks/use-*.ts` for all server state:
```typescript
const { data, loading, error } = useUsers();
```

**Cron Jobs**: Vercel cron configuration in `vercel.json` for scheduled tasks like alert processing at 6 AM daily.

## Workflow and Documentation

### Changelog Management
- Create `.md` files in `ChangeLogs/` folder for each development session
- Save implementation documentation in `Project-Research-Files/` folder
- Maintain detailed commit messages for tracking changes

### Performance Considerations
- Authenticated routes grouped under `(authenticated)` for shared layouts
- Loading components for each route to improve perceived performance
- React Query caching strategies for optimal data fetching
- Image optimization with AVIF/WebP formats

### Testing & Validation
Manual testing checklist includes authentication flows, role-based access, profile setup, and menu visibility based on permissions. Always verify RLS policies and user status handling.

## Key Integration Points

### Supabase Integration
- Row Level Security enforces data isolation
- Database schema includes organizations, user_profiles, roles, and menu permissions
- Real-time subscriptions for live data updates

### Import System
Excel/CSV import system with AI-assisted column mapping via OpenAI integration. Supports products, sales data, and order imports with validation and confirmation workflows.

### API Architecture
- **Route Pattern**: `/app/api/[resource]/[action]/route.ts`
- **Authentication**: All routes use Supabase server client for auth checking
- **Error Handling**: Standardized error responses with proper HTTP status codes
- **File Processing**: Uses ExcelJS for Excel operations, supports template downloads and bulk operations
- **Validation**: Multi-step validation flow (validate → confirm → process)

### Security Considerations
- Known security vulnerability in xlsx package (documented in SECURITY-NOTES.md)
- Environment-based configuration prevents credential exposure
- RLS policies enforce data access controls
- Session management handled by Supabase Auth

## Development Workflow Requirements

### Documentation Management
- Create `.md` files in `ChangeLogs/` folder for each GitHub commit showing all changes for that day
- Save development documentation files to `Project-Research-Files/` folder upon completion
- Always create comprehensive commit documentation in markdown format

### Bulk Import Considerations
Alert about scalability features needed to support ExcelJS library bulk import functionality for Distributors importing monthly orders. Implementation requires explicit approval before proceeding.

### Server Management Protocol
When restarting the server, follow this sequence to ensure latest code validation:

1. Stop server: `Ctrl + C`
2. Clean build cache: `rm -rf .next`
3. Clean npm cache (optional): `npm cache clean --force`
4. Install dependencies: `npm install`
5. Build project: `npm run build`
6. Start development: `npm run dev`

### Bundle Analysis
Use `npm run build:analyze` to analyze bundle size and performance when needed.

### Additional Scripts
```bash
# Bundle analysis
npm run build:analyze  # Build with bundle analyzer enabled

# Manual TypeScript checking
npx tsc --noEmit       # Type checking without emit
```

## File Exclusions
Exclude these files from GitHub commits as specified in project rules:
- Temporary development files
- Build artifacts
- Cache files
- Environment-specific configurations

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.