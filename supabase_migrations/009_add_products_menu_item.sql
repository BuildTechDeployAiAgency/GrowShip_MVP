-- ================================================
-- MIGRATION 009: ADD PRODUCTS MENU ITEM
-- ================================================
-- Description: Add Products menu item to navigation
-- Date: November 5, 2025
-- Author: GrowShip MVP Team
-- ================================================

-- Insert Products menu item
-- This should be placed after Orders in the menu
-- Adjust the sort_order based on your current menu structure

INSERT INTO menu_items (
  menu_label,
  route_path,
  icon_name,
  parent_id,
  sort_order,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'Products',
  '/products',
  'Package',
  NULL, -- Set parent_id if you want it nested under another menu item (e.g., Inventory section)
  7, -- Adjust sort_order based on where you want it to appear (after Orders which is typically 6)
  true,
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- Alternative: If you want Products under an Inventory parent menu
-- First, check if Inventory parent exists, if not create it:
/*
INSERT INTO menu_items (
  menu_label,
  route_path,
  icon_name,
  parent_id,
  sort_order,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'Inventory',
  '/inventory',
  'Package',
  NULL,
  7,
  true,
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- Then add Products as a child:
INSERT INTO menu_items (
  menu_label,
  route_path,
  icon_name,
  parent_id,
  sort_order,
  is_active,
  created_at,
  updated_at
)
SELECT
  'Products',
  '/products',
  'Package',
  id, -- parent_id from Inventory menu item
  1,
  true,
  now(),
  now()
FROM menu_items
WHERE menu_label = 'Inventory' AND parent_id IS NULL
ON CONFLICT DO NOTHING;
*/

-- Grant permissions for the Products menu to appropriate roles
-- Adjust based on your roles table structure

-- Example: Grant access to all brand users
/*
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, created_at)
SELECT 
  r.id as role_id,
  m.id as menu_item_id,
  true as can_view,
  now() as created_at
FROM roles r
CROSS JOIN menu_items m
WHERE m.menu_label = 'Products'
  AND r.role_name IN ('brand', 'super_admin')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;
*/

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- Note: After running this migration, the Products menu item
-- should appear in the sidebar navigation for authorized users.
-- ================================================






