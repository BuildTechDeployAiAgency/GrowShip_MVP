# GrowShip Setup Checklist

## ✅ Quick Start Guide

### Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm or bun package manager
- [ ] Supabase account created
- [ ] Git repository cloned

### Environment Setup

1. **Create Environment File**

   ```bash
   cp env.example .env.local
   ```

2. **Configure Supabase**

   - [ ] Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - [ ] Create a new project or use existing
   - [ ] Navigate to Settings > API
   - [ ] Copy the following values to `.env.local`:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - Project API keys (anon public) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Project API keys (service_role secret) → `SUPABASE_SERVICE_ROLE_KEY`

3. **Install Dependencies**
   ```bash
   npm install
   ```

### Database Setup

1. **Run Database Migrations**

   - [ ] In Supabase Dashboard, go to SQL Editor
   - [ ] Run the schema SQL (if available in `database/` folder)
   - [ ] Create the following tables:
     - `user_profiles`
     - `roles`
     - `sidebar_menus`
     - `role_menu_permissions`
     - `organizations`
     - `user_memberships`

2. **Seed Initial Data**

   - [ ] Create default roles in `roles` table:
     - super_admin (level 1)
     - brand_admin (level 2)
     - distributor_admin (level 2)
     - manufacturer_admin (level 2)
   - [ ] Create sidebar menu items in `sidebar_menus`
   - [ ] Assign menu permissions in `role_menu_permissions`

3. **Set Up Row Level Security (RLS)**
   - [ ] Enable RLS on all tables
   - [ ] Create policies for user access control
   - [ ] Test policies with different user roles

### Authentication Setup

1. **Email Authentication**

   - [ ] In Supabase Dashboard → Authentication → Providers
   - [ ] Ensure "Email" provider is enabled
   - [ ] Configure email templates (optional)

2. **Google OAuth (Optional)**
   - [ ] Create Google Cloud Project
   - [ ] Enable Google+ API
   - [ ] Create OAuth 2.0 credentials
   - [ ] Add authorized redirect URI: `http://localhost:3000/auth/callback`
   - [ ] Add credentials to `.env.local`
   - [ ] Enable Google provider in Supabase

### Development Server

1. **Start the Application**

   ```bash
   npm run dev
   ```

   - [ ] Server should start on http://localhost:3000
   - [ ] No build errors in terminal

2. **Test Core Functionality**
   - [ ] Landing page loads
   - [ ] Can navigate to brand/distributor/manufacturer login
   - [ ] Can create new account
   - [ ] Receives verification email
   - [ ] Can sign in after verification
   - [ ] Redirected to profile setup
   - [ ] Can complete profile
   - [ ] Redirected to dashboard
   - [ ] Sidebar menu appears with correct items
   - [ ] Can navigate between pages
   - [ ] Can sign out

### Production Build

1. **Build for Production**

   ```bash
   npm run build
   ```

   - [ ] Build completes successfully
   - [ ] No TypeScript errors
   - [ ] No critical warnings

2. **Test Production Build**
   ```bash
   npm run start
   ```
   - [ ] Production server starts
   - [ ] Application functions correctly

### Deployment (Optional)

1. **Vercel Deployment**

   - [ ] Install Vercel CLI: `npm i -g vercel`
   - [ ] Run `vercel` in project directory
   - [ ] Add environment variables in Vercel dashboard
   - [ ] Update `NEXT_PUBLIC_APP_URL` to your domain
   - [ ] Update Supabase redirect URLs to include production URL

2. **Update Supabase Settings**
   - [ ] Add production URL to allowed redirect URLs
   - [ ] Update CORS settings if needed
   - [ ] Test authentication on production

## 🐛 Troubleshooting

### Build Fails with Supabase Error

**Error:** "Your project's URL and API key are required to create a Supabase client"

**Solution:**

1. Ensure `.env.local` file exists in project root
2. Check all required environment variables are set
3. Restart development server after adding env vars

### User Can't Access Pages

**Symptoms:** Redirected to login or shows "no menu items"

**Possible Causes:**

1. User status is "pending" or "suspended"
   - Check `user_profiles.user_status` in Supabase
2. Profile not complete
   - Check `user_profiles.is_profile_complete`
3. No menu permissions assigned
   - Check `role_menu_permissions` for user's role

### Menu Not Showing

**Solution:**

1. Verify role exists in `roles` table
2. Check `role_menu_permissions` has entries for that role
3. Ensure menus have `is_active: true`
4. Clear browser localStorage and refresh
5. Check browser console for errors

### Session/Auth Issues

**Solution:**

1. Clear browser cookies and localStorage
2. Sign out and sign in again
3. Check Supabase auth logs in dashboard
4. Verify API keys are correct in `.env.local`

### Build Warnings about Edge Runtime

**Warning:** "A Node.js API is used which is not supported in the Edge Runtime"

**Note:** This is a known warning from Supabase SDK. It's non-breaking and can be ignored.

## 📊 Database Schema Reference

### Required Tables

1. **user_profiles**

   - Stores user information and settings
   - Links to Supabase auth.users via user_id

2. **roles**

   - Defines available roles in the system
   - Sets permission levels

3. **sidebar_menus**

   - Navigation menu structure
   - Supports hierarchical menus (parent_id)

4. **role_menu_permissions**

   - Maps roles to menu items
   - Defines CRUD permissions per menu

5. **organizations**

   - Multi-tenant organization data
   - Supports parent-child relationships

6. **user_memberships**
   - User-to-organization mapping
   - Role assignments per organization

## 🔐 Security Checklist

- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Service role key kept secret (never in client code)
- [ ] CORS properly configured in Supabase
- [ ] Auth redirect URLs whitelisted
- [ ] Environment variables not committed to git
- [ ] User input validated with Zod schemas
- [ ] SQL injection prevented (using Supabase client methods)

## 📝 Post-Setup Tasks

1. **Create Super Admin User**

   - [ ] Sign up through UI or create directly in Supabase
   - [ ] Set role_name to "super_admin" in user_profiles
   - [ ] Set user_status to "approved"

2. **Create Test Users**

   - [ ] Brand admin user
   - [ ] Distributor admin user
   - [ ] Manufacturer admin user
   - [ ] Test with different permission levels

3. **Configure Business Logic**
   - [ ] Customize dashboard metrics
   - [ ] Set up sales data import
   - [ ] Configure notification preferences
   - [ ] Add company branding (logo, colors)

## 🎉 Setup Complete!

Once all items are checked, your GrowShip installation is ready for use!

For ongoing reference, see `agent.MD` for detailed architecture documentation.

---

**Last Updated:** October 27, 2025
