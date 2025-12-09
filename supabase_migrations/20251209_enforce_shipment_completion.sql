-- ================================================
-- MIGRATION: ENFORCE SHIPMENT COMPLETION FOR ORDER DELIVERY
-- ================================================
-- Description: Prevents orders from being marked as 'delivered' unless
--              all associated shipments are in a terminal state (delivered, cancelled, returned)
-- Date: December 9, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE VALIDATION FUNCTION
-- ================================================
-- This function checks if all shipments for an order are completed
-- before allowing the order status to be set to 'delivered'

CREATE OR REPLACE FUNCTION check_order_shipments_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_incomplete_shipments INTEGER;
  v_total_shipments INTEGER;
BEGIN
  -- Only check when transitioning TO 'delivered' status
  IF NEW.order_status = 'delivered' AND (OLD.order_status IS NULL OR OLD.order_status != 'delivered') THEN
    
    -- Count total shipments for this order
    SELECT COUNT(*) INTO v_total_shipments
    FROM shipments
    WHERE order_id = NEW.id;
    
    -- If there are no shipments, allow the transition
    -- (Some orders may be fulfilled without creating shipment records)
    IF v_total_shipments = 0 THEN
      RETURN NEW;
    END IF;
    
    -- Count shipments that are NOT in a terminal state
    SELECT COUNT(*) INTO v_incomplete_shipments
    FROM shipments
    WHERE order_id = NEW.id
      AND shipment_status NOT IN ('delivered', 'cancelled', 'returned');
    
    -- If any shipments are incomplete, prevent the status change
    IF v_incomplete_shipments > 0 THEN
      RAISE EXCEPTION 'Cannot mark order as delivered. % of % shipment(s) are not yet completed. All associated shipments must be delivered, cancelled, or returned first.', 
        v_incomplete_shipments, v_total_shipments;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 2. CREATE TRIGGER ON ORDERS TABLE
-- ================================================
-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS enforce_shipment_completion_trigger ON orders;

-- Create the trigger that runs BEFORE UPDATE on orders
CREATE TRIGGER enforce_shipment_completion_trigger
  BEFORE UPDATE OF order_status ON orders
  FOR EACH ROW
  WHEN (NEW.order_status = 'delivered' AND OLD.order_status IS DISTINCT FROM 'delivered')
  EXECUTE FUNCTION check_order_shipments_completed();

-- ================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- ================================================
COMMENT ON FUNCTION check_order_shipments_completed() IS 
  'Validates that all shipments for an order are in a terminal state (delivered, cancelled, returned) before allowing the order to be marked as delivered.';

COMMENT ON TRIGGER enforce_shipment_completion_trigger ON orders IS 
  'Prevents order status from being set to delivered unless all associated shipments are completed.';

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (Run separately to test)
-- ================================================
-- Test 1: Try to mark an order as delivered when it has incomplete shipments
-- This should fail with the custom error message
-- UPDATE orders SET order_status = 'delivered' WHERE id = 'your-order-id';

-- Test 2: Query to check shipment statuses for a specific order
-- SELECT o.order_number, o.order_status, s.shipment_number, s.shipment_status
-- FROM orders o
-- LEFT JOIN shipments s ON s.order_id = o.id
-- WHERE o.id = 'your-order-id';
