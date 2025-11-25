-- =====================================================
-- Migration 027: Ensure Brand and Distributor Admin Visibility
-- =====================================================
-- Description: Ensure brand admins only see their brand's data and distributor admins only see their distributor's data
-- Date: 2025-11-12
-- Author: GrowShip Team
-- 
-- IMPORTANT: This migration updates RLS policies to ensure proper data visibility:
-- - Brand admins: Only see distributors and records within their brand
-- - Distributor admins: Only see records linked to their specific distributor
-- =====================================================

BEGIN;

-- ================================================
-- HELPER FUNCTION: Check if user is distributor admin
-- ================================================
CREATE OR REPLACE FUNCTION is_distributor_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_uuid
    AND distributor_id IS NOT NULL
    AND role_name LIKE 'distributor_%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- HELPER FUNCTION: Get user's distributor_id
-- ================================================
CREATE OR REPLACE FUNCTION get_user_distributor_id(user_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT distributor_id FROM user_profiles
    WHERE user_id = user_uuid
    AND distributor_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- HELPER FUNCTION: Get user's brand_id
-- ================================================
CREATE OR REPLACE FUNCTION get_user_brand_id(user_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT brand_id FROM user_profiles
    WHERE user_id = user_uuid
    AND brand_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- DISTRIBUTORS TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing distributor policies
DROP POLICY IF EXISTS "Distributor users can view own distributor" ON distributors;
DROP POLICY IF EXISTS "Distributor users can manage own distributor" ON distributors;
DROP POLICY IF EXISTS "Brand users can view own distributors" ON distributors;
DROP POLICY IF EXISTS "Brand users can manage own distributors" ON distributors;

-- Brand admins: Can view/manage all distributors within their brand
CREATE POLICY "Brand admins can view own brand distributors"
ON distributors FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can see distributors in their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
  OR
  -- Distributor admin can only see their own distributor
  (
    id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Brand admins: Can manage distributors within their brand
CREATE POLICY "Brand admins can manage own brand distributors"
ON distributors FOR ALL
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage distributors in their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
  OR
  -- Distributor admin can only manage their own distributor
  (
    id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ================================================
-- ORDERS TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing order policies
DROP POLICY IF EXISTS "Distributor users can view own distributor orders" ON orders;
DROP POLICY IF EXISTS "Distributor users can manage own distributor orders" ON orders;
DROP POLICY IF EXISTS "Brand users can view own brand orders" ON orders;
DROP POLICY IF EXISTS "Brand users can manage own orders" ON orders;

-- Brand admins: Can view orders for their brand's distributors
-- Distributor admins: Can only view orders for their distributor
CREATE POLICY "Users can view orders by brand/distributor"
ON orders FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can see orders for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
    AND (
      distributor_id IS NULL OR
      distributor_id IN (
        SELECT id FROM distributors 
        WHERE brand_id IN (
          SELECT brand_id FROM user_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  OR
  -- Distributor admin can only see orders for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Brand admins: Can manage orders for their brand
-- Distributor admins: Can only manage orders for their distributor
CREATE POLICY "Users can manage orders by brand/distributor"
ON orders FOR ALL
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage orders for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
  OR
  -- Distributor admin can only manage orders for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ================================================
-- INVOICES TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing invoice policies
DROP POLICY IF EXISTS "Distributor users can view own distributor invoices" ON invoices;
DROP POLICY IF EXISTS "Distributor users can manage own distributor invoices" ON invoices;
DROP POLICY IF EXISTS "Brand users can view own brand invoices" ON invoices;
DROP POLICY IF EXISTS "Brand users can manage own invoices" ON invoices;

-- Brand admins: Can view invoices for their brand
-- Distributor admins: Can only view invoices for their distributor
CREATE POLICY "Users can view invoices by brand/distributor"
ON invoices FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can see invoices for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
    AND (
      distributor_id IS NULL OR
      distributor_id IN (
        SELECT id FROM distributors 
        WHERE brand_id IN (
          SELECT brand_id FROM user_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  OR
  -- Distributor admin can only see invoices for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Brand admins: Can manage invoices for their brand
-- Distributor admins: Can only manage invoices for their distributor
CREATE POLICY "Users can manage invoices by brand/distributor"
ON invoices FOR ALL
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage invoices for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
  OR
  -- Distributor admin can only manage invoices for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ================================================
-- PURCHASE_ORDERS TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing PO policies
DROP POLICY IF EXISTS "Distributor users can view own distributor purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Distributor users can manage own distributor purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Brand users can view own brand purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Brand users can manage own purchase orders" ON purchase_orders;

-- Brand admins: Can view POs for their brand
-- Distributor admins: Can only view POs for their distributor
CREATE POLICY "Users can view purchase orders by brand/distributor"
ON purchase_orders FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can see POs for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
    AND (
      distributor_id IS NULL OR
      distributor_id IN (
        SELECT id FROM distributors 
        WHERE brand_id IN (
          SELECT brand_id FROM user_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  OR
  -- Distributor admin can only see POs for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Brand admins: Can manage POs for their brand
-- Distributor admins: Can only manage POs for their distributor
CREATE POLICY "Users can manage purchase orders by brand/distributor"
ON purchase_orders FOR ALL
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage POs for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
  OR
  -- Distributor admin can only manage POs for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ================================================
-- SHIPMENTS TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing shipment policies
DROP POLICY IF EXISTS "Distributor users can view own distributor shipments" ON shipments;
DROP POLICY IF EXISTS "Distributor users can manage own distributor shipments" ON shipments;
DROP POLICY IF EXISTS "Brand users can view own brand shipments" ON shipments;
DROP POLICY IF EXISTS "Brand users can manage own shipments" ON shipments;

-- Brand admins: Can view shipments for their brand
-- Distributor admins: Can only view shipments for their distributor
CREATE POLICY "Users can view shipments by brand/distributor"
ON shipments FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can see shipments for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
    AND (
      distributor_id IS NULL OR
      distributor_id IN (
        SELECT id FROM distributors 
        WHERE brand_id IN (
          SELECT brand_id FROM user_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  OR
  -- Distributor admin can only see shipments for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Brand admins: Can manage shipments for their brand
-- Distributor admins: Can only manage shipments for their distributor
CREATE POLICY "Users can manage shipments by brand/distributor"
ON shipments FOR ALL
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage shipments for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
  OR
  -- Distributor admin can only manage shipments for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ================================================
-- SALES_DATA TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing sales_data policies
DROP POLICY IF EXISTS "Distributor users can view own distributor sales data" ON sales_data;
DROP POLICY IF EXISTS "Distributor users can manage own distributor sales data" ON sales_data;
DROP POLICY IF EXISTS "Brand users can view own brand sales data" ON sales_data;
DROP POLICY IF EXISTS "Brand users can manage own sales data" ON sales_data;

-- Brand admins: Can view sales data for their brand
-- Distributor admins: Can only view sales data for their distributor
CREATE POLICY "Users can view sales data by brand/distributor"
ON sales_data FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can see sales data for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
    AND (
      distributor_id IS NULL OR
      distributor_id IN (
        SELECT id FROM distributors 
        WHERE brand_id IN (
          SELECT brand_id FROM user_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  OR
  -- Distributor admin can only see sales data for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Brand admins: Can manage sales data for their brand
-- Distributor admins: Can only manage sales data for their distributor
CREATE POLICY "Users can manage sales data by brand/distributor"
ON sales_data FOR ALL
USING (
  -- Super admin can manage all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can manage sales data for their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
  OR
  -- Distributor admin can only manage sales data for their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ================================================
-- USER_PROFILES TABLE RLS POLICIES UPDATE
-- ================================================

-- Drop existing user_profiles policies (keep own profile policy)
DROP POLICY IF EXISTS "Brand users can view own brand profiles" ON user_profiles;

-- Brand admins: Can view profiles in their brand
-- Distributor admins: Can only view profiles linked to their distributor
CREATE POLICY "Users can view profiles by brand/distributor"
ON user_profiles FOR SELECT
USING (
  -- Users can always see their own profile
  auth.uid() = user_id
  OR
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
  OR
  -- Brand admin can see profiles in their brand
  (
    brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND brand_id IS NOT NULL
      AND distributor_id IS NULL  -- Not a distributor admin
    )
    AND brand_id = (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
  OR
  -- Distributor admin can only see profiles linked to their distributor
  (
    distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

COMMIT;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Test that brand admins can only see their brand's distributors
-- SELECT COUNT(*) FROM distributors 
-- WHERE brand_id IN (
--   SELECT brand_id FROM user_profiles 
--   WHERE user_id = auth.uid()
--   AND distributor_id IS NULL
-- );

-- Test that distributor admins can only see their distributor
-- SELECT COUNT(*) FROM distributors 
-- WHERE id IN (
--   SELECT distributor_id FROM user_profiles 
--   WHERE user_id = auth.uid() 
--   AND distributor_id IS NOT NULL
-- );

-- Test that brand admins can see orders for their brand
-- SELECT COUNT(*) FROM orders 
-- WHERE brand_id IN (
--   SELECT brand_id FROM user_profiles 
--   WHERE user_id = auth.uid()
--   AND distributor_id IS NULL
-- );

-- Test that distributor admins can only see orders for their distributor
-- SELECT COUNT(*) FROM orders 
-- WHERE distributor_id IN (
--   SELECT distributor_id FROM user_profiles 
--   WHERE user_id = auth.uid() 
--   AND distributor_id IS NOT NULL
-- );

