-- ================================================
-- Migration: Fix get_upcoming_shipments function
-- Description: Cast expected_delivery_date to date type to match function signature
-- Date: December 5, 2025
-- Issue: PostgreSQL error 42804 - type mismatch between timestamptz and date
-- ================================================

BEGIN;

-- Fix the get_upcoming_shipments function to explicitly cast the timestamp to date
CREATE OR REPLACE FUNCTION get_upcoming_shipments(
  p_brand_id uuid,
  p_days_ahead integer DEFAULT 30
)
RETURNS TABLE (
  po_id uuid,
  po_number varchar,
  supplier_name varchar,
  expected_delivery_date date,
  total_amount numeric,
  po_status po_status,
  items_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id as po_id,
    po.po_number,
    po.supplier_name,
    po.expected_delivery_date::date as expected_delivery_date,  -- Cast to date
    po.total_amount,
    po.po_status,
    (
      SELECT COUNT(*)
      FROM purchase_order_lines pol
      WHERE pol.purchase_order_id = po.id
    )::bigint as items_count
  FROM purchase_orders po
  WHERE po.brand_id = p_brand_id
    AND po.expected_delivery_date IS NOT NULL
    AND po.expected_delivery_date::date >= CURRENT_DATE
    AND po.expected_delivery_date::date <= CURRENT_DATE + (p_days_ahead || ' days')::interval
    AND po.po_status IN ('approved', 'ordered', 'received')
  ORDER BY po.expected_delivery_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ================================================
-- Verification
-- ================================================
-- After running, test with:
-- SELECT * FROM get_upcoming_shipments('your-brand-id'::uuid, 30);
