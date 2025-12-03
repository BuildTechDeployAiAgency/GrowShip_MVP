-- ================================================
-- Migration 065: Fix Shipments Visibility and Menu Cleanup
-- ================================================
-- Description: Ensure RLS policies on shipments table allow proper access,
--              and clean up any duplicate shipments menu items.
-- Date: 2025-12-03
-- Author: GrowShip Team
-- ================================================

BEGIN;

-- ================================================
-- 1. ENSURE ROW LEVEL SECURITY IS ENABLED ON SHIPMENTS TABLE
-- ================================================

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 2. DROP EXISTING SHIPMENTS RLS POLICIES (to recreate them cleanly)
-- ================================================

DROP POLICY IF EXISTS "Super admins can view all shipments" ON shipments;
DROP POLICY IF EXISTS "Super admins can manage all shipments" ON shipments;
DROP POLICY IF EXISTS "Brand users can view shipments for their brand" ON shipments;
DROP POLICY IF EXISTS "Brand users can manage shipments for their brand" ON shipments;
DROP POLICY IF EXISTS "Distributor admins can view shipments for their distributor" ON shipments;

-- ================================================
-- 3. CREATE RLS POLICIES FOR SHIPMENTS TABLE
-- ================================================

-- Super admins can view all shipments
CREATE POLICY "Super admins can view all shipments"
ON shipments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
);

-- Super admins can manage all shipments
CREATE POLICY "Super admins can manage all shipments"
ON shipments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
);

-- Brand users can view shipments for their brand
CREATE POLICY "Brand users can view shipments for their brand"
ON shipments FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles 
    WHERE user_id = auth.uid()
    AND brand_id IS NOT NULL
  )
);

-- Brand users can manage shipments for their brand (non-distributor users only)
CREATE POLICY "Brand users can manage shipments for their brand"
ON shipments FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles 
    WHERE user_id = auth.uid()
    AND brand_id IS NOT NULL
    AND distributor_id IS NULL
  )
);

-- Distributor admins can view shipments for their distributor
CREATE POLICY "Distributor admins can view shipments for their distributor"
ON shipments FOR SELECT
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid()
    AND distributor_id IS NOT NULL
  )
);

-- ================================================
-- 4. CLEAN UP DUPLICATE SHIPMENTS MENU ITEMS (if any)
-- Keep only the top-level Shipments menu item, remove any nested duplicates
-- ================================================

-- Delete any Shipments menu items that have a parent (nested under Inventory or other menus)
DELETE FROM sidebar_menus 
WHERE menu_label = 'Shipments' 
AND parent_id IS NOT NULL;

-- ================================================
-- 5. GRANT SHIPMENTS MENU ACCESS TO APPROPRIATE ROLES
-- ================================================

-- Grant Shipments menu access to brand roles and super_admin
INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve, created_at)
SELECT 
  r.id as role_id,
  m.id as menu_id,
  true as can_view,
  true as can_edit,
  false as can_delete,
  false as can_approve,
  NOW() as created_at
FROM roles r
CROSS JOIN sidebar_menus m
WHERE m.menu_label = 'Shipments'
  AND m.route_path = '/shipments'
  AND m.is_active = true
  AND r.role_name IN ('super_admin', 'brand_admin', 'brand_manager', 'brand_logistics')
  AND r.is_active = true
ON CONFLICT (role_id, menu_id) DO UPDATE SET can_view = true;

-- ================================================
-- 6. ADD COMMENTS
-- ================================================

COMMENT ON POLICY "Super admins can view all shipments" ON shipments IS 'Allows super admins to view all shipments across all brands';
COMMENT ON POLICY "Super admins can manage all shipments" ON shipments IS 'Allows super admins to create, update, delete all shipments';
COMMENT ON POLICY "Brand users can view shipments for their brand" ON shipments IS 'Allows brand users to view shipments belonging to their brand';
COMMENT ON POLICY "Brand users can manage shipments for their brand" ON shipments IS 'Allows non-distributor brand users to manage shipments for their brand';
COMMENT ON POLICY "Distributor admins can view shipments for their distributor" ON shipments IS 'Allows distributor admins to view shipments assigned to their distributor';

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately after applying migration)
-- ================================================
-- Check RLS policies on shipments:
-- SELECT * FROM pg_policies WHERE tablename = 'shipments';
--
-- Check menu items:
-- SELECT * FROM sidebar_menus WHERE menu_label = 'Shipments';
--
-- Test shipments query for an order:
-- SELECT * FROM shipments WHERE order_id = 'your-order-id';

