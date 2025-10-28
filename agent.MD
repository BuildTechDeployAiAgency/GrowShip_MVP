# GrowShip - AI Agent Reference Guide

## 🎯 Project Overview

**GrowShip** is a comprehensive multi-tenant SaaS platform built with Next.js 15, designed to connect and manage relationships between brands, distributors, and manufacturers in the supply chain. It features role-based access control, real-time data management, and analytics capabilities.

### Tech Stack

- **Frontend**: Next.js 15.5.4, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI components
- **Backend**: Supabase (PostgreSQL + Authentication + Storage)
- **State Management**: TanStack React Query v5, React Context
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **File Handling**: XLSX, Mammoth, React PDF

---

## 📁 Project Structure

```
/app
  /api                      # API routes
    /users/invite          # User invitation endpoint
  /auth                    # Authentication pages
    /brand                 # Brand login
    /distributor          # Distributor login
    /manufacturer         # Manufacturer login
    /callback             # OAuth callback
    /invite               # Invitation acceptance
    /reset-password       # Password reset flow
    /setup-password       # Initial password setup
    /suspended            # Suspended user page
  /dashboard              # Main dashboard
  /profile/setup          # Profile setup wizard
  /sales                  # Sales analytics
  /settings               # User settings
  /super-admin            # Super admin dashboard
  /users                  # User management
  layout.tsx              # Root layout with providers
  page.tsx                # Landing page
  globals.css             # Global styles

/components
  /auth                    # Authentication UI
    auth-page.tsx          # Main auth component
    forgot-password.tsx    # Password recovery
    profile-setup.tsx      # Profile completion form
  /common                  # Shared components
    pending-user-warning.tsx  # Warning banner for pending users
    protected-page.tsx     # Route protection wrapper
  /customers              # Customer management
  /dashboard              # Dashboard components
  /landing                # Landing page sections
  /layout                 # Layout components
    header.tsx            # Top navigation
    sidebar.tsx           # Side navigation with dynamic menu
    main-layout.tsx       # Main app layout wrapper
  /sales                  # Sales analytics components
  /settings               # Settings UI
  /super-admin            # Super admin components
  /ui                     # Reusable UI components (shadcn/ui)
  /users                  # User management components

/contexts
  auth-context.tsx         # Main authentication context
  enhanced-auth-context.tsx # Enhanced auth provider
  date-filter-context.tsx  # Date filtering state

/hooks
  use-auth.ts             # Authentication hook
  use-menu-permissions.ts # Menu permissions with caching
  use-profile.ts          # Profile management
  use-users.ts            # User management
  use-dashboard-metrics.ts # Dashboard data
  use-sales-*.ts          # Sales analytics hooks
  use-user-status-protection.ts # User status guards

/lib
  /api
    menu-permissions.ts   # Menu permission API
  /supabase
    client.ts             # Browser Supabase client
    server.ts             # Server Supabase client
    avatar.ts             # Avatar upload/delete
    config-check.ts       # Config validation
  export-utils.ts         # Export functionality
  localStorage.ts         # Browser storage utilities
  permissions.ts          # Permission checking logic
  query-provider.tsx      # React Query setup
  utils.ts                # Utility functions

/types
  auth.ts                 # Auth type definitions
  menu.ts                 # Menu type definitions

middleware.ts             # Route protection & session management
```

---

## 🔑 Key Architecture Concepts

### 1. Multi-Tenant Architecture

The platform supports three primary user types:

- **Brand** (Brand Owners) - Product, inventory, sales management
- **Distributor** - Retailer relationships, distribution
- **Manufacturer** - Production, fulfillment

### 2. Role-Based Access Control (RBAC)

**Role Hierarchy:**

```typescript
UserRoleName =
  | "super_admin"          // Global access
  | "brand_admin"          // Brand management
  | "brand_finance"        // Brand financial access
  | "brand_manager"        // Brand operations
  | "brand_user"           // Limited brand access
  | "distributor_admin"    // Distributor management
  | "distributor_finance"  // Distributor financial
  | "distributor_manager"  // Distributor operations
  | "distributor_user"     // Limited distributor access
  | "manufacturer_admin"   // Manufacturer management
  | "manufacturer_finance" // Manufacturer financial
  | "manufacturer_manager" // Manufacturer operations
```

**Permission Levels:**

- Level 1: Super Admin (all access)
- Level 2: Admin roles (organization management)
- Level 3: Finance/Manager (departmental)
- Level 4: Standard users (limited)

### 3. User Status Flow

```
pending → approved → suspended
    ↓         ↓          ↓
Dashboard  Full      Restricted
only      Access     to auth page
```

**User Status Types:**

- `pending` - Awaiting approval, dashboard-only access
- `approved` - Full access based on role
- `suspended` - Redirected to suspended page

---

## 🔐 Authentication Flow

### Sign Up Process

1. User selects role (brand/distributor/manufacturer)
2. Creates account with email/password
3. Profile created with `is_profile_complete: false`
4. User status set to `approved` (or `pending` if moderated)
5. Email verification sent
6. Redirect to profile setup

### Sign In Process

1. User authenticates via email/password
2. **Middleware** checks session validity
3. Profile loaded from Supabase
4. User status checked:
   - `suspended` → redirect to `/auth/suspended`
   - `pending` → limited to dashboard
   - `approved` → full access
5. Menu permissions fetched and cached
6. Redirect based on profile completion:
   - Incomplete → `/profile/setup`
   - Complete → `/dashboard`

### Middleware Protection (`middleware.ts`)

Protected routes:

```typescript
[
  "/dashboard",
  "/profile",
  "/settings",
  "/users",
  "/sales",
  "/orders",
  "/purchase-orders",
  "/shipments",
  "/invoices",
  "/reports",
  "/financials",
  "/marketing",
  "/calendar",
  "/notifications",
  "/distributors",
  "/manufacturers",
];
```

**Middleware Logic:**

1. Create Supabase server client
2. Check auth session
3. If unauthenticated & accessing protected route → redirect to `/`
4. If authenticated:
   - Check profile completion
   - If incomplete → redirect to `/profile/setup`
   - Allow access to requested route

---

## 📊 Database Schema (Supabase)

### Core Tables

**user_profiles**

```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- role_name: UserRoleName
- role_type: UserRole
- company_name: text
- contact_name: text
- email: text
- phone, address, city, state, zip_code, country
- website, description
- avatar: text (URL)
- is_profile_complete: boolean
- user_status: pending | approved | suspended
- organization_id: uuid
- parent_organization_id: uuid
- created_at, updated_at
```

**roles**

```sql
- id: uuid (PK)
- role_name: text
- role_description: text
- role_type: text
- permission_level: integer
- is_active: boolean
- created_at, updated_at
```

**sidebar_menus**

```sql
- id: uuid (PK)
- parent_id: uuid (nullable, for hierarchy)
- menu_label: text
- menu_icon: text (Lucide icon name)
- route_path: text
- menu_order: integer
- is_active: boolean
- requires_permission: text
- created_at, updated_at
```

**role_menu_permissions**

```sql
- id: uuid (PK)
- role_id: uuid (FK to roles)
- menu_id: uuid (FK to sidebar_menus)
- can_view: boolean
- can_edit: boolean
- can_delete: boolean
- can_approve: boolean
- created_at
```

**organizations**

```sql
- id: uuid (PK)
- name: text
- slug: text (unique)
- organization_type: super_admin | brand | distributor | manufacturer
- parent_organization_id: uuid (nullable)
- is_active: boolean
- created_at, updated_at
```

**user_memberships**

```sql
- id: uuid (PK)
- user_id: uuid (FK)
- organization_id: uuid (FK)
- role_name: UserRoleName
- is_active: boolean
- created_at, updated_at
```

---

## 🎨 Component Patterns

### 1. Protected Routes

Use `ProtectedPage` component or custom status checks:

```typescript
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

const { user, profile } = useAuth();

// Redirect if not authenticated
if (!user) router.push("/");

// Check user status
if (profile?.user_status === "suspended") {
  router.push("/auth/suspended");
}
```

### 2. Dynamic Menu System

Menu items are fetched from Supabase based on user role:

```typescript
// hooks/use-menu-permissions.ts
const { data, isLoading } = useUserMenuPermissions(userId);
const menuItems = data?.menuItems || [];

// Menu items include:
// - Hierarchical structure (parent/children)
// - Permission levels (view, edit, delete, approve)
// - Dynamic icons from Lucide
// - Route paths
```

**Caching Strategy:**

- Menu data cached in `localStorage` for instant display
- TanStack Query with 5-minute stale time
- Background refetch on mount and reconnect

### 3. Form Handling

Using React Hook Form + Zod:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { email: "", password: "" },
});
```

### 4. Data Fetching Pattern

All data fetching uses TanStack React Query:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ["users", organizationId],
  queryFn: fetchUsers,
  staleTime: 5 * 60 * 1000,
});

// Mutation
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries(["users"]);
  },
});
```

---

## 🔧 Environment Configuration

**Required Environment Variables** (create `.env.local`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Development Workflow

### Starting the App

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
```

### Building for Production

```bash
npm run build        # Build production bundle
npm run start        # Start production server
```

### Common Issues

**Build fails with Supabase errors:**

- ✅ Ensure all environment variables are set
- ✅ Check `.env.local` exists and has correct values

**User can't access pages:**

- ✅ Check user status in Supabase (`user_profiles.user_status`)
- ✅ Verify profile completion (`is_profile_complete`)
- ✅ Check role menu permissions in database

**Menu not showing:**

- ✅ Verify role exists in `roles` table
- ✅ Check `role_menu_permissions` has entries for that role
- ✅ Ensure menus have `is_active: true`

---

## 📝 Code Conventions

### File Naming

- Components: `kebab-case.tsx` (e.g., `auth-page.tsx`)
- Hooks: `use-*.ts` (e.g., `use-auth.ts`)
- Types: `kebab-case.ts` (e.g., `auth.ts`)
- Pages: Next.js convention (`page.tsx`, `layout.tsx`)

### Component Structure

```typescript
"use client"; // If using hooks/state

import { ... } from "...";

interface ComponentProps {
  // Props definition
}

export function ComponentName({ ...props }: ComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Styling

- Tailwind utility classes
- Use `cn()` from `lib/utils.ts` for conditional classes
- Radix UI for base components (in `/components/ui/`)

---

## 🗄️ State Management

### 1. Server State (TanStack Query)

- All API data fetching
- Automatic caching, refetching, and invalidation
- Query keys namespace by domain

### 2. Auth State (React Context)

- `AuthContext` provides:
  - `user`: Current authenticated user
  - `profile`: User profile data
  - `loading`: Auth loading state
  - `signIn()`, `signOut()`, `signUp()`
  - `updateProfile()`, `uploadAvatar()`

### 3. Local Storage

- User data cache (quick load)
- Profile cache
- Menu permissions cache
- Cleared on sign out

---

## 🔍 Testing the App

### Manual Testing Checklist

**Authentication:**

- [ ] Sign up as brand/distributor/manufacturer
- [ ] Sign in with correct role portal
- [ ] Sign in with wrong role (should error)
- [ ] Password reset flow
- [ ] Profile setup completion

---

## 🧩 Backend (FastAPI) Overview

The `Backend/` folder contains a FastAPI service that handles file ingestion (Excel/CSV), AI-assisted column mapping, and persistence to Supabase. It exposes REST endpoints consumed by the Next.js app.

- Location: `Backend/`
- Entry points: `Backend/run.py` (uvicorn launcher), `Backend/app/main.py` (FastAPI app)
- Key modules:
  - `Backend/app/routes/excel_routes.py` – Excel/data endpoints
  - `Backend/app/utils/excel_processor.py` – CSV/Excel parsing, header detection, sheet scoring
  - `Backend/app/utils/openai_mapper.py` – AI mapping via OpenAI (with fallback)
  - `Backend/app/utils/column_mapper.py` – heuristic mapping & normalization
  - `Backend/app/services/supabase_service.py` – Supabase storage/DB and materialized views
  - `Backend/app/models/schemas.py` – Pydantic schemas

### Run Locally

- Python 3.10+
- Install: `pip install -r Backend/requirements.txt`
- Env (.env in `Backend/`):
  - `OPENAI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - Optional: `ALLOWED_ORIGINS`, `ENVIRONMENT`, `HTTP_PROXY`, `HTTPS_PROXY`
- Start:
  - `python Backend/run.py` (port 8880)
  - or `cd Backend && uvicorn app.main:app --reload --port 8880`

### CORS

Configured in `Backend/app/main.py`:
- Defaults allow `http://localhost:3000`, `https://growship-red.vercel.app`, `https://*.vercel.app`
- Override with `ALLOWED_ORIGINS` (comma-separated)

### API Endpoints (prefix `/api/v1/excel`)

- Upload/management
  - `POST /upload`
  - `POST /upload-and-process`
  - `DELETE /document/{document_id}`
  - `GET /sheets/{filename}`
- Data
  - `GET /data/{filename}/{sheet_name}`
  - `POST /data/{filename}/{sheet_name}/filter`
  - `GET /stats/{filename}`
- AI mapping
  - `POST /map-columns/{filename}`
  - `GET /mapped-data/{filename}`
  - `GET /mapped-data-summary/{filename}`
- Detection/debug
  - `GET /detect-best-sheet/{filename}`
  - `GET /debug/{filename}`
- Supabase views
  - `GET /data/{organization_id}/{user_id}`
  - `GET /admin/data/{organization_id}`

Root/health:
- `GET /` (banner), `GET /health`, `GET /cors-info`, `GET /debug/supabase`

### Data Flow

1) Upload → local `uploads/` → background upload to Supabase Storage with document status.
2) Parse CSV/Excel → detect headers/sheet → AI or heuristic mapping to standardized columns.
3) Clean/normalize → batch insert → maintain org-level materialized views for BI queries.

### Frontend Integration

- Base URL: `http://localhost:8880` locally; point Next.js fetchers to `/api/v1/excel/*`.
- Pass `user_id` and `organization_id` for uploads to align with Supabase auth.
- Handle large uploads gracefully; show processing state and poll for completion if needed.
- Ensure frontend origin included in CORS or set `ALLOWED_ORIGINS`.

### Deployment

- `Backend/Procfile` supported (`web: python run.py`).
- Set `ENVIRONMENT=production` for non-reload, info logs.
- Configure Supabase and OpenAI env vars in the host.

**Authorization:**

- [ ] Pending user can only access dashboard
- [ ] Approved user can access all permitted routes
- [ ] Suspended user redirected to suspended page
- [ ] Menu items show based on role

**User Management:**

- [ ] Invite new user
- [ ] Edit user profile
- [ ] Change user status
- [ ] Export users

**Profile:**

- [ ] Update profile information
- [ ] Upload avatar
- [ ] Change password

---

## 🐛 Known Issues / TODOs

1. **Sales pages are empty** - `/app/sales/page.tsx` returns empty fragment
2. **Dashboard has typo** - "Welcome bvmto" should be "Welcome to"
3. **Environment setup** - No `.env.example` file (now fixed)
4. **Build warnings** - Supabase Edge Runtime compatibility warnings (non-breaking)
5. **Security vulnerability** - 1 high severity npm package (check with `npm audit`)

---

## 📚 Important Files Reference

### Authentication

- `contexts/auth-context.tsx` - Main auth logic
- `middleware.ts` - Route protection
- `components/auth/auth-page.tsx` - Login UI
- `app/auth/*/page.tsx` - Role-specific login pages

### Menu System

- `lib/api/menu-permissions.ts` - Menu fetching logic
- `hooks/use-menu-permissions.ts` - Menu query hooks
- `components/layout/sidebar.tsx` - Menu rendering
- `types/menu.ts` - Menu type definitions

### User Management

- `components/users/users-management.tsx` - User list & management
- `hooks/use-users.ts` - User data hooks
- `app/api/users/invite/route.ts` - User invitation API

### Profile

- `hooks/use-profile.ts` - Profile CRUD operations
- `components/auth/profile-setup.tsx` - Profile completion form
- `app/profile/setup/page.tsx` - Profile setup page

---

## 🔄 Common Operations

### Adding a New Protected Route

1. Add route to `middleware.ts` protectedRoutes array
2. Create page in `/app/your-route/page.tsx`
3. Use `MainLayout` for consistent UI
4. Add menu entry to Supabase `sidebar_menus` table
5. Create `role_menu_permissions` for desired roles

### Creating a New Role

1. Add role to `types/auth.ts` UserRoleName
2. Insert into Supabase `roles` table
3. Add permissions to `lib/permissions.ts` ROLE_PERMISSIONS
4. Create menu permissions in `role_menu_permissions`

### Adding a New Component

1. Choose appropriate directory under `/components/`
2. Follow naming convention (kebab-case)
3. Use TypeScript interfaces for props
4. Add to shadcn/ui collection if reusable primitive

---

## 🎓 Learning Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)

---

## 📞 Agent Quick Commands

### Read Key Files

```
/app/layout.tsx          - Root app layout
/middleware.ts           - Auth middleware
/contexts/auth-context.tsx - Auth state
/lib/permissions.ts      - Permission logic
/components/layout/sidebar.tsx - Navigation
```

### Search Patterns

- Auth logic: `grep "supabase.auth"`
- Role checks: `grep "user_status"`
- Menu permissions: `grep "menuPermissions"`
- Protected routes: `grep "protectedRoutes"`

---

**Last Updated:** October 27, 2025
**Version:** 0.1.0
**Agent:** Claude Sonnet 4.5
