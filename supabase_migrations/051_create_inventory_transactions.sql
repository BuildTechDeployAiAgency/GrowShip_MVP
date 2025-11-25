-- ================================================
-- MIGRATION 051: CREATE INVENTORY TRANSACTIONS TABLE
-- ================================================
-- Description: Create inventory_transactions table for comprehensive stock movement tracking
-- Date: November 24, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE INVENTORY TRANSACTIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product Reference
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255), -- Denormalized for history
  
  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Source Reference (polymorphic)
  source_type VARCHAR(50),
  source_id UUID,
  reference_number VARCHAR(100),
  
  -- Quantity Movement
  quantity_change NUMERIC(10,2) NOT NULL,
  quantity_before NUMERIC(10,2) NOT NULL,
  quantity_after NUMERIC(10,2) NOT NULL,
  
  -- Stock Breakdown (allocated vs on-hand)
  allocated_before NUMERIC(10,2) DEFAULT 0,
  allocated_after NUMERIC(10,2) DEFAULT 0,
  inbound_before NUMERIC(10,2) DEFAULT 0,
  inbound_after NUMERIC(10,2) DEFAULT 0,
  
  -- Status & Context
  status VARCHAR(20) DEFAULT 'completed',
  notes TEXT,
  
  -- User & Brand Context
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id 
  ON inventory_transactions(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_sku 
  ON inventory_transactions(sku);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_brand_id 
  ON inventory_transactions(brand_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_source 
  ON inventory_transactions(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date 
  ON inventory_transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
  ON inventory_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_status 
  ON inventory_transactions(status);

-- Unique constraint to prevent duplicate transactions from same source
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_transactions_unique_source 
  ON inventory_transactions(source_type, source_id, transaction_type, sku)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- ================================================
-- 3. CREATE RLS POLICIES
-- ================================================

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Brand users can view their brand's transactions
CREATE POLICY "Brand users view their transactions"
ON inventory_transactions FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Distributors can view transactions related to their orders/POs
CREATE POLICY "Distributors view their related transactions"
ON inventory_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role_name = 'distributor'
    AND (
      -- Orders they're involved with
      (source_type = 'order' AND source_id IN (
        SELECT id FROM orders WHERE distributor_id = user_profiles.distributor_id
      ))
      OR
      -- POs they're involved with
      (source_type = 'purchase_order' AND source_id IN (
        SELECT id FROM purchase_orders WHERE distributor_id = user_profiles.distributor_id
      ))
    )
  )
);

-- Super admins can view all transactions
CREATE POLICY "Super admins view all transactions"
ON inventory_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role_name = 'super_admin'
  )
);

-- Brand users can insert transactions for their brand
CREATE POLICY "Brand users insert transactions"
ON inventory_transactions FOR INSERT
WITH CHECK (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Super admins can insert any transactions
CREATE POLICY "Super admins insert transactions"
ON inventory_transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role_name = 'super_admin'
  )
);

-- ================================================
-- 4. ADD COMMENTS
-- ================================================

COMMENT ON TABLE inventory_transactions IS 'Tracks all inventory movements including PO receipts, order allocations/fulfillments, and manual adjustments';
COMMENT ON COLUMN inventory_transactions.transaction_type IS 'PO_APPROVED, PO_RECEIVED, PO_CANCELLED, ORDER_ALLOCATED, ORDER_FULFILLED, ORDER_CANCELLED, MANUAL_ADJUSTMENT, STOCKTAKE_ADJUSTMENT';
COMMENT ON COLUMN inventory_transactions.source_type IS 'purchase_order, order, manual, stocktake, correction, return, damaged';
COMMENT ON COLUMN inventory_transactions.quantity_change IS 'Positive for inbound, negative for outbound';
COMMENT ON COLUMN inventory_transactions.status IS 'pending, completed, cancelled, reversed';

COMMIT;

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'inventory_transactions'
  ) THEN
    RAISE NOTICE '✅ inventory_transactions table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create inventory_transactions table';
  END IF;
END $$;

