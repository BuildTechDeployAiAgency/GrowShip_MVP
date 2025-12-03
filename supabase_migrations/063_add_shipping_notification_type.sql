-- ================================================
-- Migration 063: Add shipping notification type
-- ================================================
-- Description: Ensure the notification_type enum includes the
--              'shipping' value used by shipment alerts.
-- Date: 2025-12-04
-- Author: GrowShip Team
-- ================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type'
      AND e.enumlabel = 'shipping'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'shipping';
  END IF;
END $$;

COMMIT;
