-- ================================================
-- MIGRATION 050: ENHANCE PO LINE APPROVAL SYSTEM
-- ================================================
-- Description: Add approval-specific columns for line-item decisions,
--              backorder tracking, and order-to-PO traceability
-- Date: November 24, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE LINE STATUS ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_line_status_type') THEN
    CREATE TYPE po_line_status_type AS ENUM (
      'pending',
      'approved',
      'partially_approved',
      'backordered',
      'rejected',
      'cancelled'
    );
    RAISE NOTICE '✅ Created po_line_status_type enum';
  ELSE
    RAISE NOTICE '✅ po_line_status_type enum already exists';
  END IF;
END $$;

-- ================================================
-- 2. CREATE BACKORDER STATUS ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'backorder_status_type') THEN
    CREATE TYPE backorder_status_type AS ENUM (
      'pending',
      'partially_fulfilled',
      'fulfilled',
      'cancelled'
    );
    RAISE NOTICE '✅ Created backorder_status_type enum';
  ELSE
    RAISE NOTICE '✅ backorder_status_type enum already exists';
  END IF;
END $$;

-- ================================================
-- 3. EXTEND PURCHASE_ORDER_LINES TABLE
-- ================================================

-- Add requested_qty (rename quantity if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'requested_qty'
  ) THEN
    -- If quantity exists, rename it to requested_qty
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'purchase_order_lines' 
      AND column_name = 'quantity'
    ) THEN
      ALTER TABLE purchase_order_lines RENAME COLUMN quantity TO requested_qty;
      RAISE NOTICE '✅ Renamed quantity to requested_qty';
    ELSE
      ALTER TABLE purchase_order_lines ADD COLUMN requested_qty NUMERIC(10,2) NOT NULL DEFAULT 0;
      RAISE NOTICE '✅ Added requested_qty column';
    END IF;
  ELSE
    RAISE NOTICE '✅ requested_qty column already exists';
  END IF;
END $$;

-- Add approved_qty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'approved_qty'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN approved_qty NUMERIC(10,2) DEFAULT 0 CHECK (approved_qty >= 0);
    RAISE NOTICE '✅ Added approved_qty column';
  ELSE
    RAISE NOTICE '✅ approved_qty column already exists';
  END IF;
END $$;

-- Add backorder_qty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'backorder_qty'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN backorder_qty NUMERIC(10,2) DEFAULT 0 CHECK (backorder_qty >= 0);
    RAISE NOTICE '✅ Added backorder_qty column';
  ELSE
    RAISE NOTICE '✅ backorder_qty column already exists';
  END IF;
END $$;

-- Add rejected_qty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'rejected_qty'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN rejected_qty NUMERIC(10,2) DEFAULT 0 CHECK (rejected_qty >= 0);
    RAISE NOTICE '✅ Added rejected_qty column';
  ELSE
    RAISE NOTICE '✅ rejected_qty column already exists';
  END IF;
END $$;

-- Add line_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'line_status'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN line_status po_line_status_type DEFAULT 'pending';
    RAISE NOTICE '✅ Added line_status column';
  ELSE
    RAISE NOTICE '✅ line_status column already exists';
  END IF;
END $$;

-- Add available_stock
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'available_stock'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN available_stock NUMERIC(10,2);
    RAISE NOTICE '✅ Added available_stock column';
  ELSE
    RAISE NOTICE '✅ available_stock column already exists';
  END IF;
END $$;

-- Add override_applied
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'override_applied'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN override_applied BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added override_applied column';
  ELSE
    RAISE NOTICE '✅ override_applied column already exists';
  END IF;
END $$;

-- Add override_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'override_by'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN override_by UUID REFERENCES auth.users(id);
    RAISE NOTICE '✅ Added override_by column';
  ELSE
    RAISE NOTICE '✅ override_by column already exists';
  END IF;
END $$;

-- Add override_reason
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'override_reason'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN override_reason TEXT;
    RAISE NOTICE '✅ Added override_reason column';
  ELSE
    RAISE NOTICE '✅ override_reason column already exists';
  END IF;
END $$;

-- Add override_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'override_at'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN override_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added override_at column';
  ELSE
    RAISE NOTICE '✅ override_at column already exists';
  END IF;
END $$;

-- Add line_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_order_lines' 
    AND column_name = 'line_notes'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN line_notes TEXT;
    RAISE NOTICE '✅ Added line_notes column';
  ELSE
    RAISE NOTICE '✅ line_notes column already exists';
  END IF;
END $$;

-- ================================================
-- 4. EXTEND PO_APPROVAL_HISTORY TABLE
-- ================================================

-- Add affected_line_ids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'po_approval_history' 
    AND column_name = 'affected_line_ids'
  ) THEN
    ALTER TABLE po_approval_history ADD COLUMN affected_line_ids UUID[];
    RAISE NOTICE '✅ Added affected_line_ids column';
  ELSE
    RAISE NOTICE '✅ affected_line_ids column already exists';
  END IF;
END $$;

-- Add override_applied
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'po_approval_history' 
    AND column_name = 'override_applied'
  ) THEN
    ALTER TABLE po_approval_history ADD COLUMN override_applied BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added override_applied column to history';
  ELSE
    RAISE NOTICE '✅ override_applied column in history already exists';
  END IF;
END $$;

-- Add stock_warnings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'po_approval_history' 
    AND column_name = 'stock_warnings'
  ) THEN
    ALTER TABLE po_approval_history ADD COLUMN stock_warnings JSONB;
    RAISE NOTICE '✅ Added stock_warnings column';
  ELSE
    RAISE NOTICE '✅ stock_warnings column already exists';
  END IF;
END $$;

-- Add generated_order_ids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'po_approval_history' 
    AND column_name = 'generated_order_ids'
  ) THEN
    ALTER TABLE po_approval_history ADD COLUMN generated_order_ids UUID[];
    RAISE NOTICE '✅ Added generated_order_ids column';
  ELSE
    RAISE NOTICE '✅ generated_order_ids column already exists';
  END IF;
END $$;

-- Add backorder_references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'po_approval_history' 
    AND column_name = 'backorder_references'
  ) THEN
    ALTER TABLE po_approval_history ADD COLUMN backorder_references JSONB;
    RAISE NOTICE '✅ Added backorder_references column';
  ELSE
    RAISE NOTICE '✅ backorder_references column already exists';
  END IF;
END $$;

-- ================================================
-- 5. EXTEND PURCHASE_ORDERS TABLE
-- ================================================

-- Add total_requested_qty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'total_requested_qty'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN total_requested_qty NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Added total_requested_qty column';
  ELSE
    RAISE NOTICE '✅ total_requested_qty column already exists';
  END IF;
END $$;

-- Add total_approved_qty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'total_approved_qty'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN total_approved_qty NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Added total_approved_qty column';
  ELSE
    RAISE NOTICE '✅ total_approved_qty column already exists';
  END IF;
END $$;

-- Add total_backordered_qty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'total_backordered_qty'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN total_backordered_qty NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Added total_backordered_qty column';
  ELSE
    RAISE NOTICE '✅ total_backordered_qty column already exists';
  END IF;
END $$;

-- Add fulfillment_percentage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'fulfillment_percentage'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN fulfillment_percentage NUMERIC(5,2) DEFAULT 0 CHECK (fulfillment_percentage >= 0 AND fulfillment_percentage <= 100);
    RAISE NOTICE '✅ Added fulfillment_percentage column';
  ELSE
    RAISE NOTICE '✅ fulfillment_percentage column already exists';
  END IF;
END $$;

-- ================================================
-- 6. CREATE PO_BACKORDERS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS po_backorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES purchase_order_lines(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku VARCHAR(100) NOT NULL,
  backorder_qty NUMERIC(10,2) NOT NULL CHECK (backorder_qty > 0),
  expected_fulfillment_date DATE,
  backorder_status backorder_status_type DEFAULT 'pending',
  fulfilled_qty NUMERIC(10,2) DEFAULT 0 CHECK (fulfilled_qty >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ================================================
-- 7. EXTEND ORDER_LINES TABLE
-- ================================================

-- Add source_po_line_id to order_lines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_lines' 
    AND column_name = 'source_po_line_id'
  ) THEN
    ALTER TABLE order_lines ADD COLUMN source_po_line_id UUID REFERENCES purchase_order_lines(id);
    RAISE NOTICE '✅ Added source_po_line_id to order_lines';
  ELSE
    RAISE NOTICE '✅ source_po_line_id in order_lines already exists';
  END IF;
END $$;

-- ================================================
-- 8. CREATE INDEXES
-- ================================================

-- Indexes for purchase_order_lines
CREATE INDEX IF NOT EXISTS idx_po_lines_line_status ON purchase_order_lines(line_status);
CREATE INDEX IF NOT EXISTS idx_po_lines_override_applied ON purchase_order_lines(override_applied) WHERE override_applied = true;
CREATE INDEX IF NOT EXISTS idx_po_lines_override_by ON purchase_order_lines(override_by);

-- Indexes for po_backorders
CREATE INDEX IF NOT EXISTS idx_po_backorders_po_id ON po_backorders(po_id);
CREATE INDEX IF NOT EXISTS idx_po_backorders_po_line_id ON po_backorders(po_line_id);
CREATE INDEX IF NOT EXISTS idx_po_backorders_product_id ON po_backorders(product_id);
CREATE INDEX IF NOT EXISTS idx_po_backorders_sku ON po_backorders(sku);
CREATE INDEX IF NOT EXISTS idx_po_backorders_status ON po_backorders(backorder_status);
CREATE INDEX IF NOT EXISTS idx_po_backorders_expected_date ON po_backorders(expected_fulfillment_date);

-- Indexes for order_lines
CREATE INDEX IF NOT EXISTS idx_order_lines_source_po_line_id ON order_lines(source_po_line_id);

-- Indexes for purchase_orders (summary fields)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_fulfillment_pct ON purchase_orders(fulfillment_percentage);

-- ================================================
-- 9. CREATE RLS POLICIES FOR PO_BACKORDERS
-- ================================================

ALTER TABLE po_backorders ENABLE ROW LEVEL SECURITY;

-- Users can view backorders for their brand
CREATE POLICY "Users can view backorders for their brand"
ON po_backorders FOR SELECT
USING (
  po_id IN (
    SELECT id FROM purchase_orders 
    WHERE brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
);

-- Distributor admins can view backorders for their distributor
CREATE POLICY "Distributor admins can view backorders for their distributor"
ON po_backorders FOR SELECT
USING (
  po_id IN (
    SELECT id FROM purchase_orders 
    WHERE distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
  )
);

-- Brand users can manage backorders for their brand
CREATE POLICY "Brand users can manage backorders for their brand"
ON po_backorders FOR ALL
USING (
  po_id IN (
    SELECT id FROM purchase_orders 
    WHERE brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND distributor_id IS NULL
    )
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
);

-- ================================================
-- 10. CREATE TRIGGER FOR PO_BACKORDERS UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_po_backorders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_po_backorders_updated_at ON po_backorders;
CREATE TRIGGER update_po_backorders_updated_at
  BEFORE UPDATE ON po_backorders
  FOR EACH ROW
  EXECUTE FUNCTION update_po_backorders_updated_at();

-- ================================================
-- 11. ADD COMMENTS
-- ================================================

COMMENT ON TABLE po_backorders IS 'Tracks backordered items from purchase orders';
COMMENT ON COLUMN po_backorders.po_id IS 'Reference to parent purchase order';
COMMENT ON COLUMN po_backorders.po_line_id IS 'Reference to specific PO line that was backordered';
COMMENT ON COLUMN po_backorders.product_id IS 'Product reference (nullable for external SKUs)';
COMMENT ON COLUMN po_backorders.backorder_qty IS 'Quantity on backorder';
COMMENT ON COLUMN po_backorders.fulfilled_qty IS 'Quantity fulfilled from this backorder';
COMMENT ON COLUMN po_backorders.expected_fulfillment_date IS 'Expected date when backorder will be fulfilled';

COMMENT ON COLUMN purchase_order_lines.requested_qty IS 'Original quantity requested in PO';
COMMENT ON COLUMN purchase_order_lines.approved_qty IS 'Quantity approved for fulfillment';
COMMENT ON COLUMN purchase_order_lines.backorder_qty IS 'Quantity moved to backorder';
COMMENT ON COLUMN purchase_order_lines.rejected_qty IS 'Quantity rejected';
COMMENT ON COLUMN purchase_order_lines.line_status IS 'Current status of this line item';
COMMENT ON COLUMN purchase_order_lines.available_stock IS 'Cached stock level at time of review';
COMMENT ON COLUMN purchase_order_lines.override_applied IS 'Whether stock override was applied';
COMMENT ON COLUMN purchase_order_lines.override_by IS 'User who applied the override';
COMMENT ON COLUMN purchase_order_lines.override_reason IS 'Reason for stock override';

COMMENT ON COLUMN purchase_orders.total_requested_qty IS 'Sum of all requested quantities';
COMMENT ON COLUMN purchase_orders.total_approved_qty IS 'Sum of all approved quantities';
COMMENT ON COLUMN purchase_orders.total_backordered_qty IS 'Sum of all backordered quantities';
COMMENT ON COLUMN purchase_orders.fulfillment_percentage IS 'Percentage of requested qty that was approved';

COMMENT ON COLUMN order_lines.source_po_line_id IS 'Links order line back to originating PO line';

-- ================================================
-- 12. RELOAD POSTGREST SCHEMA CACHE
-- ================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ================================================
-- VERIFICATION
-- ================================================
-- Run these queries to verify the migration:
--
-- Check purchase_order_lines columns:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'purchase_order_lines' AND column_name IN 
-- ('requested_qty', 'approved_qty', 'backorder_qty', 'rejected_qty', 'line_status', 
--  'available_stock', 'override_applied', 'override_by', 'override_reason', 'override_at', 'line_notes')
-- ORDER BY column_name;
--
-- Check po_backorders table:
-- SELECT * FROM po_backorders LIMIT 1;
--
-- Check purchase_orders summary columns:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'purchase_orders' AND column_name IN 
-- ('total_requested_qty', 'total_approved_qty', 'total_backordered_qty', 'fulfillment_percentage')
-- ORDER BY column_name;

