# Menu Reorganization - November 6, 2025

## Overview
This document details the reorganization of the sidebar navigation menu and hiding of specific menu items.

## Changes Made

### New Menu Order
The sidebar menu items have been reordered as follows:

1. **Dashboard** - `/dashboard`
2. **Distributors** - `/distributors`
3. **Orders** - `/orders`
4. **Invoices** - `/invoices`
5. **Purchase Orders** - `/purchase-orders`
6. **Products** - `/products`
7. **Inventory** - `/inventory`
8. **Forecasting** - `/forecasting`
9. **Calendar** - `/calendar`
10. **Notifications** - `/notifications`
11. **Users (Admins)** - `/users`
12. **Reports** - `/reports`
13. **Manufacturers** - `/manufacturers`
14. **Marketing** - `/marketing`
15. **Imports** - `/imports`
16. **Super Admin** - `/super-admin` _(only visible to Super Admin users)_

### Hidden Menu Items
The following menu items have been hidden by setting `is_active = false`:

- **Production** - `/production`
- **Financials** - `/financials`

## Implementation

### Database Changes
All changes are stored in the `sidebar_menus` table with updates to:
- `menu_order` - Determines the display order
- `is_active` - Controls visibility (false = hidden)
- `updated_at` - Timestamp of the change

### Migration File
**File:** `supabase_migrations/010_reorganize_menu_order.sql`

This SQL migration file contains all the UPDATE statements to:
1. Reorder menu items by updating the `menu_order` field
2. Hide Production and Financials by setting `is_active = false`
3. Display verification query to confirm changes

### How to Apply

#### Option 1: Via Supabase Dashboard (Recommended)
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/runefgxmlbsegacjrvvu/sql/new)
2. Copy the contents of `supabase_migrations/010_reorganize_menu_order.sql`
3. Paste into the SQL editor
4. Click "Run" or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Return` (Mac)
5. Refresh your application

#### Option 2: Using the Helper Script
```bash
cd "/Users/diogoppedro/<:> Software Implementations/GrowShip_MVP"
./scripts/apply-menu-reorder.sh
```

This will display the SQL that needs to be run in the Supabase Dashboard.

## Technical Details

### Menu Loading System
- **Component:** `components/layout/sidebar.tsx`
- **Hook:** `hooks/use-menu-permissions.ts`
- **API:** `lib/api/menu-permissions.ts`
- **Database Table:** `sidebar_menus`

### How It Works
1. User logs in and their role is determined
2. `fetchUserMenuPermissions()` queries the database for menu items
3. Menu items are filtered based on:
   - `is_active = true` (hidden items excluded)
   - User's role permissions via `role_menu_permissions` table
   - `can_view = true` in the permissions table
4. Items are ordered by `menu_order` ascending
5. Hierarchical structure is built for nested menus
6. Menu data is cached in localStorage for instant display

### Caching
The menu is cached in:
- **TanStack Query cache** - 5 minutes stale time
- **localStorage** - For instant display on page refresh

After making changes to the menu, users may need to:
- Refresh the page to see changes immediately
- Or wait up to 5 minutes for the cache to refresh automatically

## Verification

After applying the migration, you can verify the changes by running this query in Supabase:

```sql
SELECT 
  menu_order,
  menu_label,
  route_path,
  is_active
FROM sidebar_menus 
ORDER BY 
  CASE WHEN is_active THEN 0 ELSE 1 END,
  menu_order ASC;
```

Expected output:
- Active menu items displayed in the new order (1-16)
- Production and Financials shown with `is_active = false`

## Impact on Users

### All Users
- Menu items will appear in the new, more logical order
- Production and Financials tabs will no longer be visible
- No functionality is removed, only menu visibility changed

### Super Admin Users
- All menu items including Super Admin section remain accessible
- Same reorganization applies to their menu

### Role-Based Filtering
- Menu visibility is still controlled by role permissions
- Users only see menus they have permission to access
- Hidden items (Production, Financials) are hidden for all roles

## Rollback

If you need to rollback this change:

1. Set Production and Financials back to active:
```sql
UPDATE sidebar_menus 
SET is_active = true, updated_at = NOW()
WHERE route_path IN ('/production', '/financials');
```

2. Restore original menu order (if needed):
```sql
-- Run the old order from supabase_migrations/reorder-menu-items.sql
```

## Future Maintenance

### Adding New Menu Items
When adding new menu items, set an appropriate `menu_order` value:
```sql
INSERT INTO sidebar_menus (menu_label, route_path, menu_icon, menu_order, is_active)
VALUES ('New Item', '/new-item', 'IconName', 17, true);
```

### Changing Menu Order
Simply update the `menu_order` field:
```sql
UPDATE sidebar_menus 
SET menu_order = NEW_ORDER, updated_at = NOW()
WHERE route_path = '/path';
```

### Hiding Menu Items
Set `is_active` to false:
```sql
UPDATE sidebar_menus 
SET is_active = false, updated_at = NOW()
WHERE route_path = '/path';
```

## Files Modified

- Created: `supabase_migrations/010_reorganize_menu_order.sql`
- Created: `scripts/apply-menu-reorder.sh`
- Created: `Project-Research-Files/MENU_REORGANIZATION.md` (this file)

## Related Documentation

- Menu Permissions System: See `hooks/use-menu-permissions.ts`
- Sidebar Component: See `components/layout/sidebar.tsx`
- Menu Types: See `types/menu.ts`

## Date & Author
- **Date:** November 6, 2025
- **Author:** GrowShip MVP Development Team
- **Migration:** 010_reorganize_menu_order.sql

