-- =====================================================
-- Migration 030: Fix Distributors RLS Recursion Issue
-- =====================================================
-- Description: Fix RLS policy recursion issue on distributors table
--              Uses SECURITY DEFINER helper functions to avoid circular dependencies
-- Date: 2025-11-12
-- Author: GrowShip Team
-- 
-- ISSUE: Migration 027 created a recursive RLS policy that queries user_profiles
--        within the RLS policy itself, causing issues when distributor_admin users
--        try to read their own distributor record.
--        This migration fixes it by using SECURITY DEFINER helper functions.
-- =====================================================

BEGIN;

-- ================================================
-- FIX DISTRIBUTORS TABLE RLS POLICIES
-- ================================================

-- Drop the problematic policy from migration 027
DROP POLICY IF EXISTS "Brand admins can view own brand distributors" ON distributors;

-- Create new non-recursive policy for distributors visibility
-- Uses helper functions from migration 029 to avoid recursion
CREATE POLICY "Brand admins can view own brand distributors"
ON distributors FOR SELECT
USING (
  -- Super admin can see all (uses existing helper function)
  is_super_admin()
  OR
  -- Brand admin can see distributors in their brand
  (
    is_brand_admin_safe()
    AND brand_id = get_user_brand_id_safe()
  )
  OR
  -- Distributor admin can only see their own distributor
  (
    is_distributor_admin_safe()
    AND id = get_user_distributor_id_safe()
    AND brand_id = get_user_brand_id_safe()
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
    AND brand_id = get_user_brand_id_safe()
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
    AND brand_id = get_user_brand_id_safe()
  )
);

COMMIT;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Test that distributor admins can read their own distributor
-- SELECT * FROM distributors 
-- WHERE id = get_user_distributor_id_safe()
-- AND brand_id = get_user_brand_id_safe();

-- Test that brand admins can see distributors in their brand
-- SELECT COUNT(*) FROM distributors 
-- WHERE brand_id = get_user_brand_id_safe();

