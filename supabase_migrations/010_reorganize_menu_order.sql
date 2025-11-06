-- ================================================
-- MIGRATION 010: REORGANIZE MENU ORDER AND HIDE ITEMS
-- ================================================
-- Description: Reorganize sidebar menu order and hide Production/Financials
-- Date: November 6, 2025
-- Author: GrowShip MVP Team
-- ================================================

-- Update menu order for sidebar menus
-- New order: Dashboard, Distributors, Orders, Invoices, Purchase Orders, 
-- Products, Inventory, Forecasting, Calendar, Notifications, Users (Admins), 
-- Reports, Manufacturers, Marketing, Imports, Super Admin

-- Dashboard: order 1
UPDATE sidebar_menus 
SET menu_order = 1, updated_at = NOW()
WHERE route_path = '/dashboard' AND is_active = true;

-- Distributors: order 2
UPDATE sidebar_menus 
SET menu_order = 2, updated_at = NOW()
WHERE route_path = '/distributors' AND is_active = true;

-- Orders: order 3
UPDATE sidebar_menus 
SET menu_order = 3, updated_at = NOW()
WHERE route_path = '/orders' AND is_active = true;

-- Invoices: order 4
UPDATE sidebar_menus 
SET menu_order = 4, updated_at = NOW()
WHERE route_path = '/invoices' AND is_active = true;

-- Purchase Orders: order 5
UPDATE sidebar_menus 
SET menu_order = 5, updated_at = NOW()
WHERE route_path = '/purchase-orders' AND is_active = true;

-- Products: order 6
UPDATE sidebar_menus 
SET menu_order = 6, updated_at = NOW()
WHERE route_path = '/products' AND is_active = true;

-- Inventory: order 7
UPDATE sidebar_menus 
SET menu_order = 7, updated_at = NOW()
WHERE route_path = '/inventory' AND is_active = true;

-- Forecasting: order 8
UPDATE sidebar_menus 
SET menu_order = 8, updated_at = NOW()
WHERE route_path = '/forecasting' AND is_active = true;

-- Calendar: order 9
UPDATE sidebar_menus 
SET menu_order = 9, updated_at = NOW()
WHERE route_path = '/calendar' AND is_active = true;

-- Notifications: order 10
UPDATE sidebar_menus 
SET menu_order = 10, updated_at = NOW()
WHERE route_path = '/notifications' AND is_active = true;

-- Users (Admins): order 11
UPDATE sidebar_menus 
SET menu_order = 11, updated_at = NOW()
WHERE route_path = '/users' AND is_active = true;

-- Reports: order 12
UPDATE sidebar_menus 
SET menu_order = 12, updated_at = NOW()
WHERE route_path = '/reports' AND is_active = true;

-- Manufacturers: order 13
UPDATE sidebar_menus 
SET menu_order = 13, updated_at = NOW()
WHERE route_path = '/manufacturers' AND is_active = true;

-- Marketing: order 14
UPDATE sidebar_menus 
SET menu_order = 14, updated_at = NOW()
WHERE route_path = '/marketing' AND is_active = true;

-- Imports: order 15
UPDATE sidebar_menus 
SET menu_order = 15, updated_at = NOW()
WHERE route_path = '/imports' AND is_active = true;

-- Super Admin: order 16 (this should already be filtered by role)
UPDATE sidebar_menus 
SET menu_order = 16, updated_at = NOW()
WHERE route_path = '/super-admin' AND is_active = true;

-- Shipments: order 17 (keeping it after main items)
UPDATE sidebar_menus 
SET menu_order = 17, updated_at = NOW()
WHERE route_path = '/shipments' AND is_active = true;

-- ================================================
-- HIDE MENU ITEMS
-- ================================================

-- Hide Production menu item
UPDATE sidebar_menus 
SET is_active = false, updated_at = NOW()
WHERE route_path = '/production';

-- Hide Financials menu item  
UPDATE sidebar_menus 
SET is_active = false, updated_at = NOW()
WHERE route_path = '/financials';

-- Hide Settings from sidebar (if it should be moved to user dropdown only)
-- UPDATE sidebar_menus 
-- SET is_active = false, updated_at = NOW()
-- WHERE route_path = '/settings';

-- ================================================
-- VERIFY CHANGES
-- ================================================

-- Display the updated menu order
SELECT 
  menu_order,
  menu_label,
  route_path,
  is_active
FROM sidebar_menus 
ORDER BY 
  CASE WHEN is_active THEN 0 ELSE 1 END,
  menu_order ASC;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

