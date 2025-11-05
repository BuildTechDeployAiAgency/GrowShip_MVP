-- =====================================================
-- Migration 006: Update RLS Policies
-- =====================================================
-- Description: Update all RLS policies to use brand_id and implement hierarchical brand → distributor visibility
-- Date: 2025-11-04
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- ================================================
-- BRANDS TABLE RLS POLICIES
-- ================================================

-- Drop old organization policies
DROP POLICY IF EXISTS "Organization member access" ON brands;
DROP POLICY IF EXISTS "Users can view own organization" ON brands;
DROP POLICY IF EXISTS "Super admins can view all organizations" ON brands;

-- Brand users can view their own brand
CREATE POLICY "Brand users can view own brand"
ON brands FOR SELECT
USING (
  id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Super admins can view all brands
CREATE POLICY "Super admins can view all brands"
ON brands FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Super admins can manage all brands
CREATE POLICY "Super admins can manage brands"
ON brands FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- ================================================
-- DISTRIBUTORS TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Users can view distributors" ON distributors;
DROP POLICY IF EXISTS "Organization member access" ON distributors;

-- Brand users can only view their own brand's distributors
CREATE POLICY "Brand users can view own distributors"
ON distributors FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Super admins can view all distributors
CREATE POLICY "Super admins can view all distributors"
ON distributors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Brand users can manage their own brand's distributors
CREATE POLICY "Brand users can manage own distributors"
ON distributors FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- ================================================
-- MANUFACTURERS TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Users can view manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "Organization member access" ON manufacturers;

-- Brand users can only view their own brand's manufacturers
CREATE POLICY "Brand users can view own manufacturers"
ON manufacturers FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Super admins can view all manufacturers
CREATE POLICY "Super admins can view all manufacturers"
ON manufacturers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Brand users can manage their own brand's manufacturers
CREATE POLICY "Brand users can manage own manufacturers"
ON manufacturers FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- ================================================
-- SALES_DATA TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Organization member access" ON sales_data;
DROP POLICY IF EXISTS "Users can view own sales data" ON sales_data;

-- Brand users can only view sales data for their brand's distributors
CREATE POLICY "Brand users can view own brand sales data"
ON sales_data FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
  AND (
    distributor_id IS NULL OR
    distributor_id IN (
      SELECT id FROM distributors WHERE brand_id IN (
        SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- Super admins can view all sales data
CREATE POLICY "Super admins can view all sales data"
ON sales_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Brand users can manage their own brand's sales data
CREATE POLICY "Brand users can manage own sales data"
ON sales_data FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- ================================================
-- ORDERS TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Organization member access" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;

-- Brand users can only view orders for their brand (and their distributors if specified)
CREATE POLICY "Brand users can view own brand orders"
ON orders FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
  AND (
    distributor_id IS NULL OR
    distributor_id IN (
      SELECT id FROM distributors WHERE brand_id IN (
        SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- Super admins can view all orders
CREATE POLICY "Super admins can view all orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Brand users can manage their own brand's orders
CREATE POLICY "Brand users can manage own orders"
ON orders FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- ================================================
-- PURCHASE_ORDERS TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Organization member access" ON purchase_orders;
DROP POLICY IF EXISTS "Users can view own purchase orders" ON purchase_orders;

-- Brand users can view their own brand's purchase orders
CREATE POLICY "Brand users can view own brand purchase orders"
ON purchase_orders FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Super admins can view all purchase orders
CREATE POLICY "Super admins can view all purchase orders"
ON purchase_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Brand users can manage their own brand's purchase orders
CREATE POLICY "Brand users can manage own purchase orders"
ON purchase_orders FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- ================================================
-- INVOICES TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Organization member access" ON invoices;
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;

-- Brand users can view their own brand's invoices
CREATE POLICY "Brand users can view own brand invoices"
ON invoices FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Super admins can view all invoices
CREATE POLICY "Super admins can view all invoices"
ON invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Brand users can manage their own brand's invoices
CREATE POLICY "Brand users can manage own invoices"
ON invoices FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- ================================================
-- SHIPMENTS TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Organization member access" ON shipments;
DROP POLICY IF EXISTS "Users can view own shipments" ON shipments;

-- Brand users can view their own brand's shipments
CREATE POLICY "Brand users can view own brand shipments"
ON shipments FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Super admins can view all shipments
CREATE POLICY "Super admins can view all shipments"
ON shipments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Brand users can manage their own brand's shipments
CREATE POLICY "Brand users can manage own shipments"
ON shipments FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- ================================================
-- USER_PROFILES TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Brand users can view profiles in their brand
CREATE POLICY "Brand users can view own brand profiles"
ON user_profiles FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Super admins can manage all profiles
CREATE POLICY "Super admins can manage all profiles"
ON user_profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- ================================================
-- USER_MEMBERSHIPS TABLE RLS POLICIES
-- ================================================

DROP POLICY IF EXISTS "Users can view own memberships" ON user_memberships;

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
ON user_memberships FOR SELECT
USING (auth.uid() = user_id);

-- Super admins can view all memberships
CREATE POLICY "Super admins can view all memberships"
ON user_memberships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

-- Super admins can manage all memberships
CREATE POLICY "Super admins can manage all memberships"
ON user_memberships FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
  )
);

COMMIT;

-- Verification queries (run separately)
-- Test brand user can only see their brand:
-- SELECT * FROM brands WHERE id IN (SELECT brand_id FROM user_profiles WHERE user_id = auth.uid());
-- Test brand user can only see their distributors:
-- SELECT * FROM distributors WHERE brand_id IN (SELECT brand_id FROM user_profiles WHERE user_id = auth.uid());

