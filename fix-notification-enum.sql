-- ============================================================================
-- Migration: Add Missing PO Notification Types to notification_type Enum
-- Date: 2025-12-11
-- Description: Adds all PO-related notification types to the enum so notifications can be created
-- ============================================================================

BEGIN;

-- Add all PO-related notification types that are missing from the enum
DO $$
DECLARE
    notification_keys TEXT[] := ARRAY[
        'po_approval_required',
        'po_created', 
        'po_approved',
        'po_rejected',
        'po_placed',
        'po_received',
        'po_approval_due',
        'order_cancelled',
        'order_fulfilled',
        'shipment_created',
        'shipment_shipped',
        'shipment_in_transit',
        'shipment_delivered',
        'shipment_cancelled',
        'shipment_failed',
        'shipment_arrival_reminder',
        'low_stock_alert',
        'critical_stock_level',
        'overstock_alert',
        'product_out_of_stock',
        'stock_replenished',
        'stock_running_out_soon',
        'low_available_stock',
        'manual_stock_adjustment',
        'bulk_stock_adjustment',
        'backorder_review_reminder',
        'payment_due_soon',
        'payment_due_reminder',
        'compliance_review_due',
        'custom_event_reminder'
    ];
    key TEXT;
BEGIN
    FOREACH key IN ARRAY notification_keys
    LOOP
        -- Check if the enum value already exists
        IF NOT EXISTS (
            SELECT 1
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'notification_type'
              AND e.enumlabel = key
        ) THEN
            -- Add the value to the enum
            EXECUTE format('ALTER TYPE notification_type ADD VALUE %L', key);
            RAISE NOTICE 'Added "%" to notification_type enum', key;
        ELSE
            RAISE NOTICE '"%" already exists in notification_type enum', key;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- Show all enum values for confirmation
-- ============================================================================
SELECT 'Current notification_type enum values:' as info;
SELECT e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname = 'notification_type' 
ORDER BY e.enumsortorder;