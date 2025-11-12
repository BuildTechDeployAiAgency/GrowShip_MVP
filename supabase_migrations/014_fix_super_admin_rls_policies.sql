-- =====================================================
-- Migration 014: Fix Super Admin RLS Policies (Fixed - No Recursion)
-- =====================================================
-- Description: Fix RLS policies to check both role_name and role_type for super admin
--              Uses SECURITY DEFINER function to avoid infinite recursion
-- Date: 2025-01-XX
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- ================================================
-- CREATE HELPER FUNCTION TO CHECK SUPER ADMIN
-- ================================================
-- This function bypasses RLS to check if current user is super admin
-- Prevents infinite recursion in RLS policies

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- ================================================
-- USER_PROFILES TABLE RLS POLICIES FIX
-- ================================================

-- Drop existing super admin policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON user_profiles;

-- Super admins can view all profiles
-- Use helper function to avoid recursion
CREATE POLICY "Super admins can view all profiles"
ON user_profiles FOR SELECT
USING (is_super_admin());

-- Super admins can manage all profiles
CREATE POLICY "Super admins can manage all profiles"
ON user_profiles FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ================================================
-- USER_MEMBERSHIPS TABLE RLS POLICIES FIX
-- ================================================

-- Drop existing super admin policies
DROP POLICY IF EXISTS "Super admins can view all memberships" ON user_memberships;
DROP POLICY IF EXISTS "Super admins can manage all memberships" ON user_memberships;

-- Super admins can view all memberships
CREATE POLICY "Super admins can view all memberships"
ON user_memberships FOR SELECT
USING (is_super_admin());

-- Super admins can manage all memberships
CREATE POLICY "Super admins can manage all memberships"
ON user_memberships FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ================================================
-- BRANDS TABLE RLS POLICIES FIX
-- ================================================

-- Drop existing super admin policies
DROP POLICY IF EXISTS "Super admins can view all brands" ON brands;
DROP POLICY IF EXISTS "Super admins can manage brands" ON brands;

-- Super admins can view all brands
CREATE POLICY "Super admins can view all brands"
ON brands FOR SELECT
USING (is_super_admin());

-- Super admins can manage all brands
CREATE POLICY "Super admins can manage brands"
ON brands FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

COMMIT;

-- Verification queries (run separately to test)
-- Test as super admin user:
-- SELECT COUNT(*) FROM user_profiles; -- Should return all users
-- SELECT COUNT(*) FROM brands; -- Should return all brands
-- SELECT COUNT(*) FROM user_memberships; -- Should return all memberships
-- SELECT is_super_admin(); -- Should return true for super admin
