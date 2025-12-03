-- ================================================
-- MIGRATION 057: GRANT PURCHASE ORDERS MENU TO DISTRIBUTOR ADMIN
-- ================================================
-- Description: Grant distributor_admin role permission to view, edit, and approve Purchase Orders
-- Date: December 01, 2025
-- Author: GrowShip MVP Team
-- ================================================

-- Grant Purchase Orders menu permission to distributor_admin role
INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve, created_at)
SELECT 
  r.id as role_id,
  m.id as menu_id,
  true as can_view,
  true as can_edit,    -- Allow creating/editing POs
  false as can_delete, -- Generally restrict deletion
  true as can_approve, -- Allow submitting/approving (depending on workflow, distributor submits)
  NOW() as created_at
FROM roles r
CROSS JOIN sidebar_menus m
WHERE r.role_name = 'distributor_admin'
  AND m.menu_label = 'Purchase Orders'
  AND m.is_active = true
  AND r.is_active = true
ON CONFLICT (role_id, menu_id) 
DO UPDATE SET 
  can_view = true,
  can_edit = true,
  can_approve = true;

-- Verify the permission was granted
SELECT 
  r.role_name,
  m.menu_label,
  m.route_path,
  rmp.can_view,
  rmp.can_edit,
  rmp.can_approve
FROM role_menu_permissions rmp
JOIN roles r ON rmp.role_id = r.id
JOIN sidebar_menus m ON rmp.menu_id = m.id
WHERE r.role_name = 'distributor_admin'
  AND m.menu_label = 'Purchase Orders';

