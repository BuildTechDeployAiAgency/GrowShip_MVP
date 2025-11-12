-- =====================================================
-- Migration 024: Add Distributor RLS Policies
-- =====================================================
-- Description: Add RLS policies for distributor users to filter data by distributor_id
-- Date: 2025-11-10
-- Author: GrowShip Team
-- 
-- IMPORTANT: This migration requires migration 023 to run first
-- Migration 023 adds the distributor_id column to user_profiles table
-- =====================================================

BEGIN;

-- Verify that distributor_id column exists (will fail gracefully if migration 023 hasn't run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'distributor_id'
  ) THEN
    RAISE EXCEPTION 'Column distributor_id does not exist in user_profiles. Please run migration 023 first.';
  END IF;
END $$;

-- ================================================
-- DISTRIBUTORS TABLE RLS POLICIES
-- ================================================

-- Distributor users can only view their own distributor account
CREATE POLICY "Distributor users can view own distributor"
ON distributors FOR SELECT
USING (
  id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- Distributor users can manage their own distributor account
CREATE POLICY "Distributor users can manage own distributor"
ON distributors FOR ALL
USING (
  id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- ================================================
-- ORDERS TABLE RLS POLICIES
-- ================================================

-- Distributor users can only view orders for their distributor
CREATE POLICY "Distributor users can view own distributor orders"
ON orders FOR SELECT
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- Distributor users can manage orders for their distributor
CREATE POLICY "Distributor users can manage own distributor orders"
ON orders FOR ALL
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- ================================================
-- INVOICES TABLE RLS POLICIES
-- ================================================

-- Distributor users can only view invoices for their distributor
CREATE POLICY "Distributor users can view own distributor invoices"
ON invoices FOR SELECT
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- Distributor users can manage invoices for their distributor
CREATE POLICY "Distributor users can manage own distributor invoices"
ON invoices FOR ALL
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- ================================================
-- PURCHASE_ORDERS TABLE RLS POLICIES
-- ================================================

-- Distributor users can only view purchase orders for their distributor
CREATE POLICY "Distributor users can view own distributor purchase orders"
ON purchase_orders FOR SELECT
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- Distributor users can manage purchase orders for their distributor
CREATE POLICY "Distributor users can manage own distributor purchase orders"
ON purchase_orders FOR ALL
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- ================================================
-- SHIPMENTS TABLE RLS POLICIES
-- ================================================

-- Distributor users can only view shipments for their distributor
CREATE POLICY "Distributor users can view own distributor shipments"
ON shipments FOR SELECT
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- Distributor users can manage shipments for their distributor
CREATE POLICY "Distributor users can manage own distributor shipments"
ON shipments FOR ALL
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- ================================================
-- SALES_DATA TABLE RLS POLICIES
-- ================================================

-- Distributor users can only view sales data for their distributor
CREATE POLICY "Distributor users can view own distributor sales data"
ON sales_data FOR SELECT
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- Distributor users can manage sales data for their distributor
CREATE POLICY "Distributor users can manage own distributor sales data"
ON sales_data FOR ALL
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

COMMIT;

-- Verification queries (run separately)
-- Test that distributor users can only see their own data:
-- SELECT COUNT(*) FROM orders WHERE distributor_id IN (
--   SELECT distributor_id FROM user_profiles WHERE user_id = auth.uid() AND distributor_id IS NOT NULL
-- );

