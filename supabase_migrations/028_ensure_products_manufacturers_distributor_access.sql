-- =====================================================
-- Migration 028: Ensure Products and Manufacturers Access for Distributor Admins
-- =====================================================
-- Description: Ensure distributor admins can access products and manufacturers from their brand
-- Date: 2025-11-12
-- Author: GrowShip Team
-- 
-- IMPORTANT: Products and manufacturers are brand-level resources.
-- Distributor admins should be able to view products/manufacturers from their brand.
-- =====================================================

BEGIN;

-- ================================================
-- PRODUCTS TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing product policies
DROP POLICY IF EXISTS "Users can view products from their brand" ON products;
DROP POLICY IF EXISTS "Super admins can view all products" ON products;

-- Brand admins: Can view products from their brand
-- Distributor admins: Can view products from their brand (products are brand-level)
-- Super admins: Can view all products
CREATE POLICY "Users can view products by brand"
ON products FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin or distributor admin can see products from their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
    )
  )
);

-- Brand admins: Can manage products for their brand
-- Distributor admins: Can view but NOT manage products (read-only)
CREATE POLICY "Brand admins can manage products"
ON products FOR INSERT
WITH CHECK (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage products for their brand (distributor admins excluded)
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
      AND user_status = 'approved'
    )
  )
);

CREATE POLICY "Brand admins can update products"
ON products FOR UPDATE
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can update products for their brand (distributor admins excluded)
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
      AND user_status = 'approved'
    )
  )
)
WITH CHECK (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can update products for their brand (distributor admins excluded)
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
      AND user_status = 'approved'
    )
  )
);

CREATE POLICY "Brand admins can delete products"
ON products FOR DELETE
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can delete products for their brand (distributor admins excluded)
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
      AND user_status = 'approved'
    )
  )
);

-- ================================================
-- MANUFACTURERS TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing manufacturer policies
DROP POLICY IF EXISTS "Brand users can view own manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "Super admins can view all manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "Brand users can manage own manufacturers" ON manufacturers;

-- Brand admins: Can view manufacturers from their brand
-- Distributor admins: Can view manufacturers from their brand (manufacturers are brand-level)
-- Super admins: Can view all manufacturers
CREATE POLICY "Users can view manufacturers by brand"
ON manufacturers FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin or distributor admin can see manufacturers from their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
    )
  )
);

-- Brand admins: Can manage manufacturers for their brand
-- Distributor admins: Can view but NOT manage manufacturers (read-only)
CREATE POLICY "Brand admins can manage manufacturers"
ON manufacturers FOR ALL
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage manufacturers for their brand (distributor admins excluded)
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
)
WITH CHECK (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage manufacturers for their brand (distributor admins excluded)
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
);

COMMIT;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Test that distributor admins can see products from their brand
-- SELECT COUNT(*) FROM products 
-- WHERE brand_id IN (
--   SELECT brand_id FROM user_profiles 
--   WHERE user_id = auth.uid()
-- );

-- Test that distributor admins can see manufacturers from their brand
-- SELECT COUNT(*) FROM manufacturers 
-- WHERE brand_id IN (
--   SELECT brand_id FROM user_profiles 
--   WHERE user_id = auth.uid()
-- );

