# Coming Soon Menu Labels Implementation

**Date:** January 2025  
**Feature:** Add "Coming Soon" labels to menu items and reorder menu

## Overview

Implemented "Coming Soon" badges on specific menu items and reordered the menu to clearly separate ready features from upcoming features.

## Changes Made

### 1. Sidebar Component Updates (`components/layout/sidebar.tsx`)

#### Added Coming Soon Routes Constant
- Defined `COMING_SOON_ROUTES` array containing all routes that should display "Coming Soon" badge:
  - `/reports`
  - `/notifications`
  - `/calendar`
  - `/invoices`
  - `/shipments`
  - `/sales`
  - `/inventory`
  - `/forecasting`
  - `/marketing`
  - `/manufacturers`

#### Updated MenuItemComponent
- Added `isComingSoon` check based on route path
- Added "Coming Soon" badge display with conditional styling:
  - Active state: `bg-white/20 text-white` (for better visibility on teal background)
  - Inactive state: `bg-amber-100 text-amber-700` (amber badge)
- Badge appears next to menu label with proper spacing

#### Updated MenuItemWithChildren
- Added `isComingSoon` check for parent menu items
- Added "Coming Soon" badge for both expandable and non-expandable menu items
- Badge styling adapts to active/inactive states

#### Menu Sorting Logic
- Added sorting function to separate ready items from coming soon items:
  - Ready items appear first (maintains original `menu_order`)
  - Coming soon items appear after ready items
  - Within each group, original order is preserved

### 2. Database Migration (`supabase_migrations/026_reorder_menu_coming_soon_items.sql`)

#### Menu Order Reorganization

**Ready Items (Orders 1-8):**
1. Dashboard (`/dashboard`) - Order 1
2. Distributors (`/distributors`) - Order 2
3. Orders (`/orders`) - Order 3
4. Purchase Orders (`/purchase-orders`) - Order 4
5. Products (`/products`) - Order 5
6. Users (`/users`) - Order 6
7. Imports (`/import`) - Order 7
8. Super Admin (`/super-admin`) - Order 8

**Coming Soon Items (Orders 9-18):**
9. Reports (`/reports`) - Order 9
10. Notifications (`/notifications`) - Order 10
11. Calendar (`/calendar`) - Order 11
12. Invoices (`/invoices`) - Order 12
13. Shipments (`/shipments`) - Order 13
14. Sales (`/sales`) - Order 14
15. Inventory (`/inventory`) - Order 15
16. Forecasting (`/forecasting`) - Order 16
17. Marketing (`/marketing`) - Order 17
18. Manufacturers (`/manufacturers`) - Order 18

#### Migration Features
- Updates `menu_order` for all active menu items
- Sets `updated_at` timestamp for each update
- Includes verification query to display menu order with status labels
- Only updates active menu items (`is_active = true`)

## Visual Design

### Coming Soon Badge
- **Size:** `text-xs` with `px-2 py-0.5` padding
- **Shape:** `rounded-full` (pill shape)
- **Font:** `font-medium`
- **Colors:**
  - Inactive: Amber background (`bg-amber-100`) with amber text (`text-amber-700`)
  - Active: White with 20% opacity (`bg-white/20`) and white text (`text-white`)

### Menu Organization
- Clear visual separation between ready and coming soon features
- Badge provides immediate visual feedback about feature availability
- Maintains consistent spacing and alignment

## User Experience

1. **Clear Feature Status:** Users can immediately see which features are available and which are coming soon
2. **Organized Menu:** Ready features are prioritized at the top of the menu
3. **Visual Consistency:** Badge styling adapts to menu item state (active/inactive)
4. **Non-Intrusive:** Badges don't interfere with menu functionality or navigation

## Technical Details

### Component Changes
- **File:** `components/layout/sidebar.tsx`
- **Lines Modified:** Multiple sections
- **New Constants:** `COMING_SOON_ROUTES` array
- **New Logic:** Sorting function for menu items

### Database Changes
- **Migration File:** `supabase_migrations/026_reorder_menu_coming_soon_items.sql`
- **Tables Affected:** `sidebar_menus`
- **Fields Updated:** `menu_order`, `updated_at`
- **Records Updated:** All active menu items

## Testing Checklist

- [x] Coming Soon badges appear on all specified menu items
- [x] Badge styling works correctly in active and inactive states
- [x] Menu items are sorted correctly (ready items first, then coming soon)
- [x] Original menu order is preserved within each group
- [x] Badges don't interfere with menu item functionality
- [x] Migration updates database correctly
- [x] No linter errors

## Future Considerations

1. **Dynamic Badge Management:** Consider adding a `is_coming_soon` field to the `sidebar_menus` table for easier management
2. **Badge Customization:** Allow different badge styles or text for different menu items
3. **Feature Flags:** Integrate with feature flag system for more granular control
4. **Analytics:** Track clicks on coming soon items to gauge user interest

## Notes

- The sorting logic in the sidebar component ensures correct display even if database order is not yet updated
- Badge visibility is controlled by route path matching, making it easy to add/remove items
- Migration can be run multiple times safely (idempotent)

