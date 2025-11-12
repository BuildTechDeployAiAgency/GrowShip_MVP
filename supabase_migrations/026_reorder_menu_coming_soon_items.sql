-- ================================================
-- MIGRATION 026: REORDER MENU - COMING SOON ITEMS AFTER READY ITEMS
-- ================================================
-- Description: Reorder sidebar menu so Coming Soon items appear after ready items
-- Date: January 2025
-- Author: GrowShip MVP Team
-- ================================================
-- 
-- Ready items (orders 1-8):
-- 1. Dashboard
-- 2. Distributors
-- 3. Orders
-- 4. Purchase Orders
-- 5. Products
-- 6. Users (Admins)
-- 7. Imports
-- 8. Super Admin
--
-- Coming Soon items (orders 9+):
-- 9. Reports
-- 10. Notifications
-- 11. Calendar
-- 12. Invoices
-- 13. Shipments
-- 14. Sales
-- 15. Inventory
-- 16. Forecasting
-- 17. Marketing
-- 18. Manufacturers
-- ================================================

-- ================================================
-- READY ITEMS (Orders 1-8)
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

-- Users (Admins): order 6
UPDATE sidebar_menus 
SET menu_order = 6, updated_at = NOW()
WHERE route_path = '/users' AND is_active = true;

-- Imports: order 7
UPDATE sidebar_menus 
SET menu_order = 7, updated_at = NOW()
WHERE route_path = '/import' AND is_active = true;

-- Super Admin: order 8 (this should already be filtered by role)
UPDATE sidebar_menus 
SET menu_order = 8, updated_at = NOW()
WHERE route_path = '/super-admin' AND is_active = true;

-- ================================================
-- COMING SOON ITEMS (Orders 9+)
-- ================================================

-- Reports: order 9
UPDATE sidebar_menus 
SET menu_order = 9, updated_at = NOW()
WHERE route_path = '/reports' AND is_active = true;

-- Notifications: order 10
UPDATE sidebar_menus 
SET menu_order = 10, updated_at = NOW()
WHERE route_path = '/notifications' AND is_active = true;

-- Calendar: order 11
UPDATE sidebar_menus 
SET menu_order = 11, updated_at = NOW()
WHERE route_path = '/calendar' AND is_active = true;

-- Invoices: order 12
UPDATE sidebar_menus 
SET menu_order = 12, updated_at = NOW()
WHERE route_path = '/invoices' AND is_active = true;

-- Shipments: order 13
UPDATE sidebar_menus 
SET menu_order = 13, updated_at = NOW()
WHERE route_path = '/shipments' AND is_active = true;

-- Sales: order 14
UPDATE sidebar_menus 
SET menu_order = 14, updated_at = NOW()
WHERE route_path = '/sales' AND is_active = true;

-- Inventory: order 15
UPDATE sidebar_menus 
SET menu_order = 15, updated_at = NOW()
WHERE route_path = '/inventory' AND is_active = true;

-- Forecasting: order 16
UPDATE sidebar_menus 
SET menu_order = 16, updated_at = NOW()
WHERE route_path = '/forecasting' AND is_active = true;

-- Marketing: order 17
UPDATE sidebar_menus 
SET menu_order = 17, updated_at = NOW()
WHERE route_path = '/marketing' AND is_active = true;

-- Manufacturers: order 18
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
    WHEN route_path IN ('/reports', '/notifications', '/calendar', '/invoices', '/shipments', '/sales', '/inventory', '/forecasting', '/marketing', '/manufacturers') 
    THEN 'Coming Soon'
    ELSE 'Ready'
  END as status
FROM sidebar_menus 
WHERE is_active = true
ORDER BY menu_order ASC;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

