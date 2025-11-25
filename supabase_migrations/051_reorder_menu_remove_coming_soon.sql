-- ================================================
-- MIGRATION 051: REORDER MENU - REMOVE COMING SOON FROM NOTIFICATIONS, CALENDAR, INVENTORY, FORECASTING
-- ================================================
-- Description: Remove "Coming Soon" badges from Notifications, Calendar, Inventory, and Forecasting
--              and reorder menu so these items appear after Products and before Users
-- Date: November 24, 2025
-- Author: GrowShip MVP Team
-- ================================================
-- 
-- New menu order:
-- 1. Dashboard
-- 2. Distributors
-- 3. Orders
-- 4. Purchase Orders
-- 5. Products
-- 6. Notifications (moved from order 10, removed Coming Soon)
-- 7. Calendar (moved from order 11, removed Coming Soon)
-- 8. Inventory (moved from order 15, removed Coming Soon)
-- 9. Forecasting (moved from order 16, removed Coming Soon)
-- 10. Users (moved from order 6)
-- 11. Imports (moved from order 7)
-- 12. Super Admin (moved from order 8)
-- 13. Reports (moved from order 9, still Coming Soon)
-- 14. Invoices (moved from order 12, still Coming Soon)
-- 15. Shipments (moved from order 13, still Coming Soon)
-- 16. Sales (moved from order 14, still Coming Soon)
-- 17. Marketing (stays at order 17, still Coming Soon)
-- 18. Manufacturers (stays at order 18, still Coming Soon)
-- ================================================

-- ================================================
-- MAIN MENU ITEMS (Orders 1-5)
-- ================================================

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

-- Purchase Orders: order 4
UPDATE sidebar_menus 
SET menu_order = 4, updated_at = NOW()
WHERE route_path = '/purchase-orders' AND is_active = true;

-- Products: order 5
UPDATE sidebar_menus 
SET menu_order = 5, updated_at = NOW()
WHERE route_path = '/products' AND is_active = true;

-- ================================================
-- NEWLY ACTIVATED ITEMS (Orders 6-9)
-- ================================================

-- Notifications: order 6 (removed Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 6, updated_at = NOW()
WHERE route_path = '/notifications' AND is_active = true;

-- Calendar: order 7 (removed Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 7, updated_at = NOW()
WHERE route_path = '/calendar' AND is_active = true;

-- Inventory: order 8 (removed Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 8, updated_at = NOW()
WHERE route_path = '/inventory' AND is_active = true;

-- Forecasting: order 9 (removed Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 9, updated_at = NOW()
WHERE route_path = '/forecasting' AND is_active = true;

-- ================================================
-- ADMIN ITEMS (Orders 10-12)
-- ================================================

-- Users (Admins): order 10
UPDATE sidebar_menus 
SET menu_order = 10, updated_at = NOW()
WHERE route_path = '/users' AND is_active = true;

-- Imports: order 11
UPDATE sidebar_menus 
SET menu_order = 11, updated_at = NOW()
WHERE route_path = '/import' AND is_active = true;

-- Super Admin: order 12 (this should already be filtered by role)
UPDATE sidebar_menus 
SET menu_order = 12, updated_at = NOW()
WHERE route_path = '/super-admin' AND is_active = true;

-- ================================================
-- COMING SOON ITEMS (Orders 13+)
-- ================================================

-- Reports: order 13 (still Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 13, updated_at = NOW()
WHERE route_path = '/reports' AND is_active = true;

-- Invoices: order 14 (still Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 14, updated_at = NOW()
WHERE route_path = '/invoices' AND is_active = true;

-- Shipments: order 15 (still Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 15, updated_at = NOW()
WHERE route_path = '/shipments' AND is_active = true;

-- Sales: order 16 (still Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 16, updated_at = NOW()
WHERE route_path = '/sales' AND is_active = true;

-- Marketing: order 17 (still Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 17, updated_at = NOW()
WHERE route_path = '/marketing' AND is_active = true;

-- Manufacturers: order 18 (still Coming Soon)
UPDATE sidebar_menus 
SET menu_order = 18, updated_at = NOW()
WHERE route_path = '/manufacturers' AND is_active = true;

-- ================================================
-- VERIFY CHANGES
-- ================================================

-- Display the updated menu order
SELECT 
  menu_order,
  menu_label,
  route_path,
  is_active,
  CASE 
    WHEN route_path IN ('/reports', '/invoices', '/shipments', '/sales', '/marketing', '/manufacturers') 
    THEN 'Coming Soon'
    ELSE 'Ready'
  END as status
FROM sidebar_menus 
WHERE is_active = true
ORDER BY menu_order ASC;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

