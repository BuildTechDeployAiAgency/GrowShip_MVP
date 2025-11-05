-- Update menu order for sidebar menus
-- Desired order: Dashboard, Distributors, Orders, Inventory, Forecasting, Sales, Calendar, Notifications, Others

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

-- Inventory: order 4
UPDATE sidebar_menus 
SET menu_order = 4, updated_at = NOW()
WHERE route_path = '/inventory' AND is_active = true;

-- Forecasting: order 5
UPDATE sidebar_menus 
SET menu_order = 5, updated_at = NOW()
WHERE route_path = '/forecasting' AND is_active = true;

-- Sales: order 6
UPDATE sidebar_menus 
SET menu_order = 6, updated_at = NOW()
WHERE route_path = '/sales' AND is_active = true;

-- Calendar: order 7
UPDATE sidebar_menus 
SET menu_order = 7, updated_at = NOW()
WHERE route_path = '/calendar' AND is_active = true;

-- Notifications: order 8
UPDATE sidebar_menus 
SET menu_order = 8, updated_at = NOW()
WHERE route_path = '/notifications' AND is_active = true;

-- Other menu items: Set to order 9+
-- This will keep other items (like Users, Settings, Reports, etc.) after the main items
UPDATE sidebar_menus 
SET menu_order = menu_order + 100, updated_at = NOW()
WHERE is_active = true 
  AND route_path NOT IN (
    '/dashboard',
    '/distributors',
    '/orders',
    '/inventory',
    '/forecasting',
    '/sales',
    '/calendar',
    '/notifications'
  )
  AND menu_order < 100;

-- Verify the changes
SELECT menu_label, route_path, menu_order 
FROM sidebar_menus 
WHERE is_active = true 
ORDER BY menu_order ASC;
