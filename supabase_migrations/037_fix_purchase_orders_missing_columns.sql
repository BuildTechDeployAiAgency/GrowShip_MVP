-- ================================================
-- MIGRATION 037: FIX PURCHASE ORDERS MISSING COLUMNS
-- ================================================
-- Description: Ensure all workflow-related columns exist in purchase_orders table
-- Date: November 22, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. ADD MISSING COLUMNS TO PURCHASE_ORDERS
-- ================================================

-- Add submitted_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN submitted_at timestamptz;
    RAISE NOTICE '✅ Added submitted_at column';
  ELSE
    RAISE NOTICE '✅ submitted_at column already exists';
  END IF;
END $$;

-- Add approved_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN approved_at timestamptz;
    RAISE NOTICE '✅ Added approved_at column';
  ELSE
    RAISE NOTICE '✅ approved_at column already exists';
  END IF;
END $$;

-- Add approved_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN approved_by uuid REFERENCES auth.users(id);
    RAISE NOTICE '✅ Added approved_by column';
  ELSE
    RAISE NOTICE '✅ approved_by column already exists';
  END IF;
END $$;

-- Add rejection_reason if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN rejection_reason text;
    RAISE NOTICE '✅ Added rejection_reason column';
  ELSE
    RAISE NOTICE '✅ rejection_reason column already exists';
  END IF;
END $$;

-- Add expected_delivery_date if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'expected_delivery_date'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN expected_delivery_date date;
    RAISE NOTICE '✅ Added expected_delivery_date column';
  ELSE
    RAISE NOTICE '✅ expected_delivery_date column already exists';
  END IF;
END $$;

-- Add approval_workflow_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'approval_workflow_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN approval_workflow_id uuid;
    RAISE NOTICE '✅ Added approval_workflow_id column';
  ELSE
    RAISE NOTICE '✅ approval_workflow_id column already exists';
  END IF;
END $$;

-- ================================================
-- 2. CREATE INDEXES FOR NEW COLUMNS IF NOT EXISTS
-- ================================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_submitted_at ON purchase_orders(submitted_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_at ON purchase_orders(approved_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_by ON purchase_orders(approved_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery_date ON purchase_orders(expected_delivery_date);

-- ================================================
-- 3. RELOAD POSTGREST SCHEMA CACHE
-- ================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ================================================
-- VERIFICATION
-- ================================================
-- Run this to verify:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name = 'purchase_orders' 
-- AND column_name IN ('submitted_at', 'approved_at', 'approved_by', 'rejection_reason', 'expected_delivery_date', 'approval_workflow_id')
-- ORDER BY column_name;

