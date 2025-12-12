# Shipment Status Fix Plan

## Problem Analysis

The error "invalid input value for enum shipment_status: 'shipped'" occurs when trying to update a shipment status from "processing" to "shipped". This indicates that the database enum `shipment_status` is missing the "shipped" value that is defined in the TypeScript types.

### Root Cause

- The TypeScript type definition in `types/shipments.ts` defines ShipmentStatus as: `"pending" | "processing" | "in_transit" | "out_for_delivery" | "shipped" | "delivered" | "failed" | "returned" | "cancelled"`
- The database enum `shipment_status` is missing the "shipped" value
- The migration file `20251210_fix_enums_and_types.sql` adds several values to the enum but doesn't include "shipped"

## Solution

### 1. Create Migration File

Create a new migration file: `supabase_migrations/20251211_add_missing_shipped_status.sql`

```sql
-- ============================================================================
-- Migration: Add Missing "shipped" Status to shipment_status Enum
-- Date: 2025-12-11
-- Description: Adds the missing "shipped" value to shipment_status enum
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
```

### 2. Additional Verification

After applying the migration, run this verification query to ensure all required values are present:

```sql
-- Verify all required enum values exist
SELECT
  e.enumlabel,
  CASE
    WHEN e.enumlabel IN ('pending', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered', 'failed', 'returned', 'cancelled')
    THEN '✓ Valid'
    ELSE '✗ Unexpected'
  END as status
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'shipment_status'
ORDER BY e.enumsortorder;
```

### 3. Test the Fix

After applying the migration:

1. Try updating a shipment status from "processing" to "shipped"
2. Verify the update succeeds without errors
3. Check that the status is correctly saved in the database

### 4. Update RPC Function (if needed)

The `update_shipment_status` function in `supabase_migrations/064_fix_shipment_notification_type.sql` already handles the "shipped" status correctly:

- Line 410: `v_valid_transition := p_new_status IN ('in_transit', 'shipped', 'cancelled');`
- Line 415-416: `WHEN 'shipped' THEN v_valid_transition := p_new_status IN ('delivered', 'failed');`

No changes are needed to the RPC function.

## Implementation Steps

1. Create the migration file `supabase_migrations/20251211_add_missing_shipped_status.sql` with the SQL code above
2. Apply the migration to the database
3. Run the verification query to confirm the enum value was added
4. Test the shipment status update functionality
5. Verify that the history correctly records the status change

## Expected Outcome

After applying this fix:

- Users will be able to update shipment status from "processing" to "shipped"
- The error "invalid input value for enum shipment_status: 'shipped'" will be resolved
- The shipment status history will correctly record the status change
- All other shipment status transitions will continue to work as expected

## Additional Notes

- The migration uses `IF NOT EXISTS` to prevent errors if the value already exists
- The migration follows the same pattern as the existing enum fix migration (`20251210_fix_enums_and_types.sql`)
- No changes are needed to the TypeScript types as they already include the "shipped" value
- No changes are needed to the RPC function as it already handles the "shipped" status
