-- ================================================
-- Migration 061: Lock distributor order & shipment permissions
-- ================================================
-- Description: Prevent distributor roles from inserting/updating/deleting
--              orders, order_lines, and shipments. They retain read access
--              and purchase order management but can no longer manage
--              downstream fulfillment records.
-- Date: 2025-12-04
-- Author: GrowShip Team
-- ================================================

BEGIN;

-- Remove legacy distributor manage policy (older migrations & new unified policy)
DROP POLICY IF EXISTS "Distributor users can manage own distributor orders" ON orders;
DROP POLICY IF EXISTS "Users can manage orders by brand/distributor" ON orders;

-- Replace with brand-only management policy (super admins retain global access)
CREATE POLICY "Users can manage orders by brand"
ON orders FOR ALL
USING (
  -- Super admin override
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand-side users (any non-distributor role tied to the brand)
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL
    )
  )
);

-- Remove distributor control over order_lines
DROP POLICY IF EXISTS "Distributor admins can manage order lines for their distributor" ON order_lines;

-- Remove distributor manage policies for shipments (older + unified versions)
DROP POLICY IF EXISTS "Distributor users can manage own distributor shipments" ON shipments;
DROP POLICY IF EXISTS "Users can manage shipments by brand/distributor" ON shipments;

-- Brand-only shipment management
CREATE POLICY "Users can manage shipments by brand"
ON shipments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL
    )
  )
);

COMMIT;
