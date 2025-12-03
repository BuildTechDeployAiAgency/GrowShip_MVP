-- =====================================================
-- Migration 058: Fix Distributor RLS Visibility
-- =====================================================
-- Description: Relax RLS policy for distributor admins to view their own distributor
--              Removing the brand_id check ensures they can see their record
--              The distributor_id match is sufficient for security.
-- Date: 2025-12-01
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- Drop the existing policy
DROP POLICY IF EXISTS "Brand admins can view own brand distributors" ON distributors;

-- Recreate the policy with relaxed condition for distributor admins
CREATE POLICY "Brand admins can view own brand distributors"
ON distributors FOR SELECT
USING (
  -- Super admin can see all
  is_super_admin()
  OR
  -- Brand admin can see distributors in their brand
  (
    is_brand_admin_safe()
    AND brand_id = get_user_brand_id_safe()
  )
  OR
  -- Distributor admin can see their own distributor
  (
    is_distributor_admin_safe()
    AND id = get_user_distributor_id_safe()
    -- Removed: AND brand_id = get_user_brand_id_safe() to avoid context mismatches
  )
);

-- Drop and recreate the management policy as well
DROP POLICY IF EXISTS "Brand admins can manage own brand distributors" ON distributors;

CREATE POLICY "Brand admins can manage own brand distributors"
ON distributors FOR ALL
USING (
  -- Super admin can manage all
  is_super_admin()
  OR
  -- Brand admin can manage distributors in their brand
  (
    is_brand_admin_safe()
    AND brand_id = get_user_brand_id_safe()
  )
  OR
  -- Distributor admin can only manage their own distributor
  (
    is_distributor_admin_safe()
    AND id = get_user_distributor_id_safe()
    -- Removed: AND brand_id = get_user_brand_id_safe()
  )
)
WITH CHECK (
  -- Super admin can manage all
  is_super_admin()
  OR
  -- Brand admin can manage distributors in their brand
  (
    is_brand_admin_safe()
    AND brand_id = get_user_brand_id_safe()
  )
  OR
  -- Distributor admin can only manage their own distributor
  (
    is_distributor_admin_safe()
    AND id = get_user_distributor_id_safe()
    -- Removed: AND brand_id = get_user_brand_id_safe()
  )
);

COMMIT;

