-- ================================================
-- MIGRATION 019: ENHANCE PO WORKFLOW
-- ================================================
-- Description: Add workflow fields to purchase_orders and create approval history table
-- Date: November 12, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE PO ACTION ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_action_type') THEN
    CREATE TYPE po_action_type AS ENUM ('submitted', 'approved', 'rejected', 'cancelled');
  END IF;
END $$;

-- ================================================
-- 2. ADD COLUMNS TO PURCHASE_ORDERS TABLE
-- ================================================

-- Add approval_workflow_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'approval_workflow_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN approval_workflow_id uuid;
  END IF;
END $$;

-- Add submitted_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN submitted_at timestamptz;
  END IF;
END $$;

-- Add approved_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Add approved_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN approved_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add rejection_reason if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Add expected_delivery_date if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'expected_delivery_date'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN expected_delivery_date date;
  END IF;
END $$;

-- ================================================
-- 3. CREATE INDEXES FOR NEW COLUMNS
-- ================================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_submitted_at ON purchase_orders(submitted_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_at ON purchase_orders(approved_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_by ON purchase_orders(approved_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery_date ON purchase_orders(expected_delivery_date);

-- ================================================
-- 4. CREATE PO_APPROVAL_HISTORY TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS po_approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  action po_action_type NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  comments text,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- 5. CREATE INDEXES FOR PO_APPROVAL_HISTORY
-- ================================================

CREATE INDEX IF NOT EXISTS idx_po_approval_history_po_id ON po_approval_history(po_id);
CREATE INDEX IF NOT EXISTS idx_po_approval_history_actor_id ON po_approval_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_po_approval_history_created_at ON po_approval_history(created_at DESC);

-- ================================================
-- 6. CREATE RLS POLICIES FOR PO_APPROVAL_HISTORY
-- ================================================

ALTER TABLE po_approval_history ENABLE ROW LEVEL SECURITY;

-- Users can view approval history for POs in their brand
CREATE POLICY "Users can view approval history for their brand POs"
  ON po_approval_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN user_profiles up ON up.brand_id = po.brand_id
      WHERE po.id = po_approval_history.po_id
        AND up.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- Users can insert approval history for POs in their brand
CREATE POLICY "Users can insert approval history for their brand POs"
  ON po_approval_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN user_profiles up ON up.brand_id = po.brand_id
      WHERE po.id = po_approval_history.po_id
        AND up.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  )
  AND actor_id = auth.uid();

COMMIT;

-- Verification queries (run separately)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_orders' ORDER BY ordinal_position;
-- SELECT * FROM po_approval_history LIMIT 5;


