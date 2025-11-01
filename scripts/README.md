# Database Setup Scripts

This directory contains scripts to add menu entries and permissions to your Supabase database.

## Quick Start (Supabase SQL Editor)

The easiest way is to run the SQL scripts directly in your Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/add-menu-entries.sql`
4. Click **Run**
5. Then copy and paste the contents of `scripts/assign-menu-permissions.sql`
6. Click **Run**

## Alternative: Using Node.js Scripts

If you prefer to use the TypeScript scripts:

### Prerequisites

1. Make sure you have `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Install tsx if not already installed:
   ```bash
   npm install -g tsx
   # or
   npm install --save-dev tsx
   ```

### Running the Scripts

```bash
# Add menu entries
npx tsx scripts/add-menu-entries.ts

# Assign permissions
npx tsx scripts/assign-menu-permissions.ts
```

## What These Scripts Do

### `add-menu-entries.sql` / `add-menu-entries.ts`

Adds the following menu entries to `sidebar_menus`:
- Orders (`/orders`)
- Purchase Orders (`/purchase-orders`)
- Shipments (`/shipments`)
- Invoices (`/invoices`)
- Reports (`/reports`)
- Financials (`/financials`)
- Marketing (`/marketing`)
- Calendar (`/calendar`)
- Notifications (`/notifications`)
- Distributors (`/distributors`)
- Manufacturers (`/manufacturers`)
- Products (`/products`)

### `assign-menu-permissions.sql` / `assign-menu-permissions.ts`

Assigns permissions to roles in `role_menu_permissions`:
- **super_admin**: Full access to all menus
- **brand_admin**: Access to Orders, Purchase Orders, Shipments, Invoices, Reports, Financials, Marketing, Calendar, Notifications, Distributors, Products
- **distributor_admin**: Access to Orders, Shipments, Invoices, Reports, Financials, Calendar, Notifications
- **manufacturer_admin**: Access to Orders, Purchase Orders, Shipments, Invoices, Reports, Financials, Calendar, Notifications, Products

## Verification

After running the scripts, verify in Supabase:

1. Check `sidebar_menus` table has 12 new entries
2. Check `role_menu_permissions` table has permissions assigned
3. Log in to your app and verify menu items appear in the sidebar

## Troubleshooting

- **Error: "Menu already exists"**: The scripts handle duplicates gracefully - existing menus won't be re-inserted
- **Error: "Role not found"**: Make sure your roles table has the expected role names
- **Menus not showing**: Check that:
  - Menu entries have `is_active = true`
  - Permissions are assigned to your user's role
  - User has `is_profile_complete = true` and `user_status = 'approved'`