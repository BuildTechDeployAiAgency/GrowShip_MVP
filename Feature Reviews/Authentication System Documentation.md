# Authentication System Documentation

**Last Updated:** December 5, 2025  
**Status:** Active - Production Ready  
**Version:** 2.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication Flows](#authentication-flows)
4. [Session Management](#session-management)
5. [Middleware & Route Protection](#middleware--route-protection)
6. [Role-Based Access Control](#role-based-access-control)
7. [User Status Management](#user-status-management)
8. [Key Components](#key-components)
9. [API Routes](#api-routes)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)

---

## Overview

GrowShip uses **Supabase Auth** for authentication, providing secure user management with email/password authentication, email verification, password reset, and invitation flows. The system implements multi-tenant architecture with role-based access control (RBAC) and organization-level permissions.

### Key Features

- ✅ Email/Password Authentication
- ✅ Email Verification
- ✅ Password Reset Flow
- ✅ User Invitations (Brand Admin & Super Admin)
- ✅ Role-Based Access Control (RBAC)
- ✅ Multi-Organization Support
- ✅ Session Management with Auto-Refresh
- ✅ Profile Completion Workflow
- ✅ User Status Management (pending/approved/suspended)

---

## Architecture

### Authentication Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│  Auth Contexts                                          │
│  ├── auth-context.tsx (Legacy)                          │
│  └── enhanced-auth-context.tsx (Primary)                │
├─────────────────────────────────────────────────────────┤
│  Supabase Client                                         │
│  ├── lib/supabase/client.ts (Browser)                   │
│  └── lib/supabase/server.ts (Server)                    │
├─────────────────────────────────────────────────────────┤
│  Middleware (middleware.ts)                             │
│  └── Route Protection & Session Refresh                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase Auth Service                       │
│  ├── User Authentication                                │
│  ├── Session Management                                 │
│  └── Email Service                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase Database                           │
│  ├── auth.users (Supabase managed)                      │
│  ├── user_profiles (Application managed)                │
│  └── user_memberships (Organization access)             │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

#### `auth.users` (Supabase Managed)

- Managed by Supabase Auth
- Contains: `id`, `email`, `encrypted_password`, `email_confirmed_at`, etc.

#### `user_profiles` (Application Managed)

```typescript
{
  id: uuid (PK)
  user_id: uuid (FK → auth.users)
  role_name: UserRoleName (e.g., "brand_admin", "distributor_admin")
  role_type: UserRole ("brand" | "distributor" | "manufacturer" | "super_admin")
  email: string
  company_name: string
  contact_name: string
  is_profile_complete: boolean
  user_status: "pending" | "approved" | "suspended"
  brand_id?: uuid
  distributor_id?: uuid
  created_at: timestamp
  updated_at: timestamp
}
```

#### `user_memberships` (Multi-Organization Support)

```typescript
{
  id: uuid (PK)
  user_id: uuid (FK → auth.users)
  brand_id: uuid (FK → brands)
  role_name: UserRoleName
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

---

## Authentication Flows

### 1. User Signup Flow

**Path:** `/auth/brand`, `/auth/distributor`, `/auth/manufacturer`

**Process:**

1. **User Initiates Signup**

   - User selects role (brand/distributor/manufacturer)
   - Enters email and password
   - Note: Signup is **blocked** for `manufacturer` and `distributor` roles (invitation-only)

2. **Supabase Auth Creates User**

   ```typescript
   // contexts/enhanced-auth-context.tsx
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: `${window.location.origin}/auth/callback`,
     },
   });
   ```

3. **Profile Creation via API** (Bypasses RLS)

   ```typescript
   // Frontend calls server-side API
   POST /api/auth/signup
   {
     userId: string,
     email: string,
     role: string,
     brandId?: string
   }
   ```

   **Why API Route?** The frontend uses the anon key which is blocked by RLS policies. The API route uses the service role key (`SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS.

4. **Profile Created**

   - `role_name`: `{role}_admin` (e.g., "brand_admin")
   - `role_type`: `{role}` (e.g., "brand")
   - `user_status`: `"approved"`
   - `is_profile_complete`: `false`
   - `brand_id`: Set if provided

5. **User Membership Created** (if `brandId` provided)

   - Creates entry in `user_memberships` table
   - Links user to brand/organization

6. **Email Verification Sent**

   - Supabase sends verification email
   - User clicks link → redirects to `/auth/callback`

7. **Callback Processing**
   - Verifies session
   - Checks profile completion
   - Redirects to `/profile/setup` if incomplete
   - Redirects to `/dashboard` if complete

**Files:**

- `contexts/enhanced-auth-context.tsx` (signUp function)
- `app/api/auth/signup/route.ts` (profile creation API)
- `components/auth/auth-page.tsx` (signup UI)

---

### 2. User Login Flow

**Path:** `/auth/brand`, `/auth/distributor`, `/auth/manufacturer`

**Process:**

1. **User Enters Credentials**

   - Email and password
   - Role portal selection (brand/distributor/manufacturer)

2. **Authentication**

   ```typescript
   // contexts/enhanced-auth-context.tsx
   const { data, error } = await supabase.auth.signInWithPassword({
     email,
     password,
   });
   ```

3. **Profile Verification**

   - Fetches user profile from `user_profiles`
   - Checks `user_status`:
     - `"suspended"` → Sign out, show error
     - `"pending"` → Allow login (limited access)
     - `"approved"` → Full access

4. **Role Portal Validation**

   - Checks `role_type` matches expected portal
   - Exception: `super_admin` can access any portal
   - Mismatch → Sign out, show error

5. **Session Established**

   - User data stored in context
   - Profile cached in localStorage
   - Menu permissions fetched and cached
   - Organizations/memberships loaded

6. **Redirect Logic**
   - If `is_profile_complete === false` → `/profile/setup`
   - Otherwise → `/dashboard`

**Files:**

- `contexts/enhanced-auth-context.tsx` (signIn function)
- `components/auth/auth-page.tsx` (login UI)

---

### 3. User Invitation Flow

**Path:** `/auth/invite`

**Who Can Invite:**

- `brand_admin` (can invite to their own brand)
- `super_admin` (can invite to any brand)

**Process:**

1. **Admin Initiates Invitation**

   ```typescript
   // app/api/users/invite/route.ts
   POST /api/users/invite
   {
     email: string,
     role: string,
     brand_id: string,
     message?: string
   }
   ```

2. **Server-Side Processing**

   - Validates admin permissions
   - Uses `adminSupabase.auth.admin.inviteUserByEmail()`
   - Creates user profile (bypasses RLS)
   - Creates user membership
   - Sends invitation email

3. **User Receives Email**

   - Email contains invitation link
   - Link format: `https://app.com/auth/invite#access_token=...&refresh_token=...&type=invite`

4. **User Clicks Link**

   - Redirects to `/auth/invite`
   - Extracts tokens from URL hash
   - Sets session: `supabase.auth.setSession({ access_token, refresh_token })`

5. **Profile Verification**
   - Checks if profile exists
   - Checks `is_profile_complete`:
     - `true` → Redirect to `/dashboard`
     - `false` → Redirect to `/auth/setup-password`

**Files:**

- `app/api/users/invite/route.ts` (invitation API)
- `app/auth/invite/page.tsx` (invitation handler)

---

### 4. Password Setup Flow (Invited Users)

**Path:** `/auth/setup-password`

**Process:**

1. **User Arrives from Invitation**

   - Session already established from `/auth/invite`
   - Page validates session exists

2. **Password Entry**

   - User enters password
   - Password validation (min length, complexity)
   - Confirm password match

3. **Password Update**

   ```typescript
   // app/auth/setup-password/page.tsx
   await supabase.auth.updateUser({
     password: newPassword,
   });
   ```

4. **Profile Completion**
   - Updates `is_profile_complete` to `true`
   - Redirects to `/dashboard`

**Files:**

- `app/auth/setup-password/page.tsx`

---

### 5. Password Reset Flow

**Path:** `/auth/reset-password`

**Process:**

1. **User Requests Reset**

   ```typescript
   // contexts/enhanced-auth-context.tsx
   await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/auth/reset-password`,
   });
   ```

2. **Email Sent**

   - Supabase sends password reset email
   - Contains reset link with tokens

3. **User Clicks Link**

   - Redirects to `/auth/reset-password`
   - Tokens extracted from URL

4. **Password Update**
   - User enters new password
   - Password validated
   - Updated via `supabase.auth.updateUser()`

**Files:**

- `contexts/enhanced-auth-context.tsx` (resetPassword function)
- `app/auth/reset-password/page.tsx` (reset UI)

---

### 6. Email Verification Flow

**Path:** `/auth/callback`

**Process:**

1. **User Clicks Verification Link**

   - Email contains verification link
   - Link format: `https://app.com/auth/callback?token=...`

2. **Callback Processing**

   ```typescript
   // app/auth/callback/page.tsx
   const { data } = await supabase.auth.getSession();
   ```

3. **Profile Check**
   - Fetches user profile
   - Checks `is_profile_complete`:
     - `false` → Redirect to `/profile/setup`
     - `true` → Redirect to `/dashboard`

**Files:**

- `app/auth/callback/page.tsx`

---

## Session Management

### Session Lifecycle

1. **Session Creation**

   - On successful login/signup
   - Stored in HTTP-only cookies (managed by Supabase)
   - Contains: `access_token`, `refresh_token`

2. **Session Refresh**

   - Automatic token refresh via Supabase SDK
   - Middleware refreshes session on each request
   - `onAuthStateChange` listener handles token refresh events

3. **Session Persistence**

   - Cookies persist across browser sessions
   - localStorage caches user data (non-sensitive)
   - Profile data cached for performance

4. **Session Invalidation**
   - On explicit sign out
   - On token expiration (if refresh fails)
   - On account suspension

### Auth State Listener

```typescript
// contexts/enhanced-auth-context.tsx
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT" || !session?.user) {
    // Clear user state
    setUser(null);
    clearAllStoredData();
  } else if (event === "SIGNED_IN" && session?.user) {
    // Update user state
    setUser({ id: session.user.id, email: session.user.email });
  } else if (event === "TOKEN_REFRESHED" && session?.user) {
    // Refresh user data
    setUser({ id: session.user.id, email: session.user.email });
  }
});
```

**Events:**

- `SIGNED_IN` - User logged in
- `SIGNED_OUT` - User logged out
- `TOKEN_REFRESHED` - Access token refreshed
- `USER_UPDATED` - User data updated
- `PASSWORD_RECOVERY` - Password reset initiated

---

## Middleware & Route Protection

### Middleware File: `middleware.ts`

**Purpose:**

- Protects routes from unauthenticated access
- Enforces profile completion requirement
- Handles session refresh
- Caches profile completion status

**Protected Routes:**

```typescript
const protectedRoutes = [
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

**Public Routes:**

- `/` (landing page)
- `/auth/*` (all auth pages)
- `/profile/setup` (for authenticated users)

**Middleware Logic:**

1. **Check Authentication**

   ```typescript
   const {
     data: { user },
   } = await supabase.auth.getUser();
   ```

2. **Unauthenticated Access**

   - If accessing protected route → Redirect to `/`
   - If accessing public route → Allow

3. **Authenticated Access**
   - Check profile completion cookie (performance optimization)
   - If cookie indicates complete → Allow
   - If cookie missing/incomplete → Query database
   - If `is_profile_complete === false` → Redirect to `/profile/setup`
   - If complete → Set cookie, allow access

**Performance Optimization:**

- Uses cookie `growship_profile_complete_{userId}` to cache completion status
- Avoids database query on every request
- Cookie expires in 7 days

**Files:**

- `middleware.ts` (primary middleware)

---

## Role-Based Access Control

### Role Hierarchy

```
super_admin (Level 1)
├── Full access to all organizations
├── Can manage all users
└── Can manage all brands

brand_admin (Level 2)
├── Manage brand organization
├── Manage brand users
└── Access brand features

distributor_admin (Level 2)
├── Manage distributor organization
├── Manage distributor users
└── Access distributor features

brand_finance / distributor_finance (Level 3)
├── Financial management
└── Limited operational access

brand_manager / distributor_manager (Level 3)
├── Operational management
└── Limited financial access

brand_user / distributor_user (Level 4)
└── Read-only / limited access
```

### Role Types

**UserRoleName** (Specific Role):

- `super_admin`
- `brand_admin`, `brand_finance`, `brand_manager`, `brand_user`, `brand_customer`
- `distributor_admin`, `distributor_finance`, `distributor_manager`, `distributor_user`, `distributor_customer`
- `manufacturer_admin`, `manufacturer_finance`, `manufacturer_manager`, `manufacturer_customer`

**UserRole** (Role Type):

- `super_admin`
- `brand`
- `distributor`
- `manufacturer`

### Permission Checking

**Client-Side:**

```typescript
// lib/permissions.ts
import { createPermissionChecker } from "@/lib/permissions";

const canPerformAction = createPermissionChecker(profile);
const canManage = canPerformAction("manage_users", brandId);
```

**Server-Side:**

```typescript
// API routes check permissions
const { data: profile } = await supabase
  .from("user_profiles")
  .select("role_name, brand_id")
  .eq("user_id", user.id)
  .single();

if (profile.role_name !== "super_admin" && profile.brand_id !== targetBrandId) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**Files:**

- `lib/permissions.ts` (permission definitions)
- `lib/api/menu-permissions.ts` (menu access control)

---

## User Status Management

### User Status Types

1. **`pending`**

   - New user awaiting approval
   - Limited access (dashboard only)
   - Cannot access full features

2. **`approved`**

   - User approved by admin
   - Full access based on role
   - Can use all permitted features

3. **`suspended`**
   - User account suspended
   - Cannot log in
   - Redirected to suspended page

### Status Checks

**During Login:**

```typescript
if (profile.user_status === "suspended") {
  await supabase.auth.signOut();
  return { error: { message: "Account suspended" } };
}
```

**During Access:**

- Middleware checks status (if needed)
- Components check status via `ProtectedPage` wrapper
- API routes validate status

**Files:**

- `components/common/protected-page.tsx` (status protection)
- `hooks/use-user-status-protection.ts` (status hook)

---

## Key Components

### 1. Enhanced Auth Context

**File:** `contexts/enhanced-auth-context.tsx`

**Purpose:** Primary authentication context provider

**Features:**

- User state management
- Profile management
- Organization/membership management
- Sign up/in/out functions
- Password reset
- Profile updates
- Avatar upload

**Usage:**

```typescript
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

const { user, profile, signIn, signOut } = useEnhancedAuth();
```

### 2. Auth Page Component

**File:** `components/auth/auth-page.tsx`

**Purpose:** Unified auth UI for all portals

**Features:**

- Sign in/sign up toggle
- Role-specific styling
- Form validation
- Error handling
- Portal selection

### 3. Authenticated Layout

**File:** `app/(authenticated)/layout.tsx`

**Purpose:** Server-side layout for authenticated routes

**Features:**

- Verifies authentication server-side
- Fetches menu permissions
- Provides initial data to client

### 4. Protected Page Component

**File:** `components/common/protected-page.tsx`

**Purpose:** Wrapper for pages requiring specific user status

**Usage:**

```typescript
<ProtectedPage allowedStatuses={["approved"]}>
  <YourPageContent />
</ProtectedPage>
```

---

## API Routes

### Authentication APIs

#### `POST /api/auth/signup`

**Purpose:** Create user profile (bypasses RLS)

**Request:**

```json
{
  "userId": "uuid",
  "email": "string",
  "role": "string",
  "brandId": "uuid (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User profile created successfully",
  "profile": { ... }
}
```

**Security:** Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS

---

#### `POST /api/users/invite`

**Purpose:** Invite new user (Brand Admin & Super Admin only)

**Request:**

```json
{
  "email": "string",
  "role": "string",
  "brand_id": "uuid",
  "message": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "userId": "uuid"
}
```

**Security:** Validates admin permissions before sending invitation

---

#### `POST /api/users/reset-password`

**Purpose:** Reset user password (admin action)

**Security:** Requires admin permissions

---

### Other Auth-Related APIs

- `POST /api/customers/invite` - Invite customer users
- `PATCH /api/users/manage` - Update user profile/status

---

## Security Considerations

### 1. Row Level Security (RLS)

**Issue:** Frontend cannot directly insert into `user_profiles` due to RLS policies

**Solution:** Use server-side API routes with service role key

**Files:**

- `app/api/auth/signup/route.ts` (uses `createAdminClient()`)

### 2. Session Security

- **HTTP-only Cookies:** Session tokens stored in HTTP-only cookies (not accessible via JavaScript)
- **Secure Cookies:** In production, cookies marked as `secure`
- **SameSite:** Cookies use `lax` SameSite policy
- **Token Refresh:** Automatic token refresh prevents session expiration

### 3. Password Security

- **Encryption:** Passwords encrypted by Supabase (bcrypt)
- **Validation:** Password complexity requirements
- **Reset:** Secure password reset flow with time-limited tokens

### 4. Role-Based Access

- **Server-Side Validation:** All API routes validate user permissions
- **Client-Side UI:** UI elements hidden based on role (UX only, not security)
- **Middleware:** Route-level protection

### 5. Profile Completion

- **Enforced:** Users cannot access protected routes until profile complete
- **Middleware:** Checks profile completion on every protected route access

### 6. User Status

- **Suspended Users:** Cannot log in (checked during authentication)
- **Pending Users:** Limited access (dashboard only)

---

## Troubleshooting

### Common Issues

#### 1. "Database error saving new user" (RLS Policy Violation)

**Symptom:** Error code `42501` when signing up

**Cause:** Frontend trying to insert into `user_profiles` with anon key

**Solution:** ✅ Fixed - Now uses `/api/auth/signup` route with service role key

**Files:**

- `app/api/auth/signup/route.ts`
- `contexts/enhanced-auth-context.tsx` (updated to use API)

---

#### 2. "Access denied" - Wrong Portal

**Symptom:** User cannot log in to portal

**Cause:** User's `role_type` doesn't match portal

**Solution:**

- User must log in through correct portal
- Exception: `super_admin` can access any portal

---

#### 3. Profile Not Found After Signup

**Symptom:** User created but profile missing

**Cause:** Profile creation API call failed

**Solution:**

- Check server logs for `/api/auth/signup` errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check RLS policies allow service role inserts

---

#### 4. Session Expired / Token Refresh Failed

**Symptom:** User logged out unexpectedly

**Cause:** Token refresh failed or session expired

**Solution:**

- Check Supabase project settings
- Verify email confirmation (if required)
- Check network connectivity

---

#### 5. Redirect Loop on Profile Setup

**Symptom:** User stuck in redirect loop

**Cause:** Profile completion check failing

**Solution:**

- Clear cookies: `growship_profile_complete_{userId}`
- Verify `is_profile_complete` field in database
- Check middleware logic

---

### Debugging Tips

1. **Check Browser Console**

   - Look for authentication errors
   - Check network requests to `/api/auth/*`

2. **Check Server Logs**

   - Vercel logs for API route errors
   - Supabase logs for database errors

3. **Verify Environment Variables**

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

4. **Check Supabase Dashboard**

   - Verify user exists in `auth.users`
   - Verify profile exists in `user_profiles`
   - Check RLS policies

5. **Test Session**
   ```typescript
   const {
     data: { session },
   } = await supabase.auth.getSession();
   console.log("Session:", session);
   ```

---

## Future Enhancements

### Planned Features

- [ ] OAuth providers (Google, Microsoft)
- [ ] Two-factor authentication (2FA)
- [ ] Session management dashboard
- [ ] Audit logging for auth events
- [ ] IP-based access restrictions
- [ ] Device management

### Known Limitations

- Signup blocked for manufacturer/distributor (invitation-only)
- No OAuth providers yet
- No 2FA support
- Session timeout not configurable per user

---

## Changelog

### December 5, 2025 - v2.0

- ✅ Fixed RLS policy violation on signup
- ✅ Created `/api/auth/signup` route using service role key
- ✅ Updated auth contexts to use API route for profile creation

### Previous Versions

- Initial authentication system implementation
- Enhanced auth context with multi-organization support
- Middleware route protection
- Role-based access control

---

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Feature: User Management](./Notification%20Center%20implementation%20doc.md)
- [Feature: Purchase Order Approval](./Purchase%20Order%20Approval%20implementation%20doc.md)

---

**Document Maintainer:** Development Team  
**Last Review:** December 5, 2025  
**Next Review:** As needed when authentication features are updated
