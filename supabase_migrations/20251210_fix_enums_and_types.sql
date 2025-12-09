-- ============================================================================
-- Migration: Fix Enum Types for Shipments and Notifications
-- Date: 2025-12-10
-- Description: Adds missing values to shipment_status and notification_type enums
--              to resolve "invalid input value" errors during order processing
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD MISSING VALUES TO shipment_status ENUM
-- The TypeScript types define these values but the DB enum is missing some:
-- pending, processing, in_transit, out_for_delivery, shipped, delivered, 
-- failed, returned, cancelled
-- ============================================================================

-- Add 'processing' if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shipment_status'
      AND e.enumlabel = 'processing'
  ) THEN
    ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'processing';
    RAISE NOTICE 'Added "processing" to shipment_status enum';
  ELSE
    RAISE NOTICE '"processing" already exists in shipment_status enum';
  END IF;
END $$;

-- Add 'cancelled' if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shipment_status'
      AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'cancelled';
    RAISE NOTICE 'Added "cancelled" to shipment_status enum';
  ELSE
    RAISE NOTICE '"cancelled" already exists in shipment_status enum';
  END IF;
END $$;

-- Add 'out_for_delivery' if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shipment_status'
      AND e.enumlabel = 'out_for_delivery'
  ) THEN
    ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
    RAISE NOTICE 'Added "out_for_delivery" to shipment_status enum';
  ELSE
    RAISE NOTICE '"out_for_delivery" already exists in shipment_status enum';
  END IF;
END $$;

-- Add 'returned' if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shipment_status'
      AND e.enumlabel = 'returned'
  ) THEN
    ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'returned';
    RAISE NOTICE 'Added "returned" to shipment_status enum';
  ELSE
    RAISE NOTICE '"returned" already exists in shipment_status enum';
  END IF;
END $$;

-- Add 'failed' if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shipment_status'
      AND e.enumlabel = 'failed'
  ) THEN
    ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'failed';
    RAISE NOTICE 'Added "failed" to shipment_status enum';
  ELSE
    RAISE NOTICE '"failed" already exists in shipment_status enum';
  END IF;
END $$;

-- ============================================================================
-- 2. ADD 'purchase_order' TO notification_type ENUM
-- This allows PO notifications to use the correct type for proper filtering
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type'
      AND e.enumlabel = 'purchase_order'
  ) THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'purchase_order';
    RAISE NOTICE 'Added "purchase_order" to notification_type enum';
  ELSE
    RAISE NOTICE '"purchase_order" already exists in notification_type enum';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION (run separately)
-- ============================================================================
-- Check shipment_status enum values:
-- SELECT e.enumlabel 
-- FROM pg_type t 
-- JOIN pg_enum e ON t.oid = e.enumtypid 
-- WHERE t.typname = 'shipment_status' 
-- ORDER BY e.enumsortorder;

-- Check notification_type enum values:
-- SELECT e.enumlabel 
-- FROM pg_type t 
-- JOIN pg_enum e ON t.oid = e.enumtypid 
-- WHERE t.typname = 'notification_type' 
-- ORDER BY e.enumsortorder;
