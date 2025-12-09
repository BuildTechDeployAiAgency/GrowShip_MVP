-- ============================================================================
-- Migration: Add Missing "shipped" Status to shipment_status Enum
-- Date: 2025-12-11
-- Description: Adds the missing "shipped" value to the shipment_status enum
--              to resolve "invalid input value for enum shipment_status: 'shipped'" error
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD MISSING "shipped" VALUE TO shipment_status ENUM
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shipment_status'
      AND e.enumlabel = 'shipped'
  ) THEN
    ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'shipped';
    RAISE NOTICE 'Added "shipped" to shipment_status enum';
  ELSE
    RAISE NOTICE '"shipped" already exists in shipment_status enum';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION (run separately after applying migration)
-- ============================================================================
-- Check shipment_status enum values:
-- SELECT e.enumlabel 
-- FROM pg_type t 
-- JOIN pg_enum e ON t.oid = e.enumtypid 
-- WHERE t.typname = 'shipment_status' 
-- ORDER BY e.enumsortorder;