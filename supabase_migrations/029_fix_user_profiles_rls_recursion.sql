-- =====================================================
-- Migration 029: Fix User Profiles RLS Recursion Issue
-- =====================================================
-- Description: Fix RLS policy recursion issue that prevents users from reading their own profile
--              Uses SECURITY DEFINER helper functions to avoid circular dependencies
-- Date: 2025-11-12
-- Author: GrowShip Team
-- 
-- ISSUE: Migration 027 created a recursive RLS policy that queries user_profiles
--        within the RLS policy itself, causing issues when users try to read their own profile
--        during sign-in. This migration fixes it by using SECURITY DEFINER helper functions.
-- =====================================================

BEGIN;

-- ================================================
-- CREATE HELPER FUNCTIONS TO AVOID RECURSION
-- ================================================
-- These functions bypass RLS to check user attributes
-- Prevents infinite recursion in RLS policies

-- Function to get user's brand_id (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_brand_id_safe()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT brand_id 
  FROM user_profiles
  WHERE user_id = auth.uid()
  AND brand_id IS NOT NULL
  LIMIT 1;
$$;

-- Function to get user's distributor_id (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_distributor_id_safe()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT distributor_id 
  FROM user_profiles
  WHERE user_id = auth.uid()
  AND distributor_id IS NOT NULL
  LIMIT 1;
$$;

-- Function to check if user is brand admin (not distributor admin)
CREATE OR REPLACE FUNCTION is_brand_admin_safe()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles
    WHERE user_id = auth.uid()
    AND brand_id IS NOT NULL
    AND distributor_id IS NULL
    AND role_name LIKE 'brand_%'
  );
$$;

-- Function to check if user is distributor admin
CREATE OR REPLACE FUNCTION is_distributor_admin_safe()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles
    WHERE user_id = auth.uid()
    AND distributor_id IS NOT NULL
    AND role_name LIKE 'distributor_%'
  );
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_brand_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_distributor_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION is_brand_admin_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION is_distributor_admin_safe() TO authenticated;

-- ================================================
-- FIX USER_PROFILES TABLE RLS POLICIES
-- ================================================

-- Drop the problematic policy from migration 027
DROP POLICY IF EXISTS "Users can view profiles by brand/distributor" ON user_profiles;

-- Ensure the basic "Users can view own profile" policy exists (from migration 006)
-- This is critical for sign-in to work
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Create new non-recursive policy for brand/distributor visibility
-- Uses helper functions to avoid recursion
-- Note: Users seeing their own profile is handled by the policy above
CREATE POLICY "Users can view profiles by brand/distributor"
ON user_profiles FOR SELECT
USING (
  -- Super admin can see all (uses existing helper function)
  is_super_admin()
  OR
  -- Brand admin can see profiles in their brand
  (
    is_brand_admin_safe()
    AND brand_id = get_user_brand_id_safe()
  )
  OR
  -- Distributor admin can only see profiles linked to their distributor
  (
    is_distributor_admin_safe()
    AND distributor_id = get_user_distributor_id_safe()
    AND brand_id = get_user_brand_id_safe()
  )
);

COMMIT;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Test that users can read their own profile (should work for all users)
-- SELECT * FROM user_profiles WHERE user_id = auth.uid();

-- Test that brand admins can see profiles in their brand
-- SELECT COUNT(*) FROM user_profiles 
-- WHERE brand_id = get_user_brand_id_safe()
-- AND distributor_id IS NULL;

-- Test that distributor admins can see profiles linked to their distributor
-- SELECT COUNT(*) FROM user_profiles 
-- WHERE distributor_id = get_user_distributor_id_safe()
-- AND brand_id = get_user_brand_id_safe();

