-- ================================================
-- MIGRATION 055: FIX INVENTORY FUNCTIONS
-- ================================================
-- Description: Update inventory RPC functions to match current schema
--              - get_inventory_summary: Use new low_stock_threshold
--              - get_low_stock_products: Use new low_stock_threshold
--              - get_upcoming_shipments: Use purchase_order_lines instead of items jsonb
-- Date: November 25, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. UPDATE FUNCTION: GET INVENTORY SUMMARY
-- ================================================

CREATE OR REPLACE FUNCTION get_inventory_summary(p_brand_id uuid)
RETURNS TABLE (
  total_products bigint,
  total_value numeric,
  low_stock_count bigint,
  out_of_stock_count bigint,
  products_at_reorder_level bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_products,
    COALESCE(SUM(quantity_in_stock * unit_price), 0) as total_value,
    COUNT(*) FILTER (
      WHERE quantity_in_stock > 0 
      AND (
        (low_stock_threshold > 0 AND quantity_in_stock <= low_stock_threshold)
        OR 
        (low_stock_threshold = 0 AND reorder_level > 0 AND quantity_in_stock <= reorder_level)
      )
    )::bigint as low_stock_count,
    COUNT(*) FILTER (WHERE quantity_in_stock = 0)::bigint as out_of_stock_count,
    -- Keeping this for backward compatibility, but it's essentially low stock
    COUNT(*) FILTER (WHERE quantity_in_stock = reorder_level AND reorder_level > 0)::bigint as products_at_reorder_level
  FROM products
  WHERE brand_id = p_brand_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 2. UPDATE FUNCTION: GET LOW STOCK PRODUCTS
-- ================================================

CREATE OR REPLACE FUNCTION get_low_stock_products(p_brand_id uuid)
RETURNS TABLE (
  id uuid,
  sku varchar,
  product_name varchar,
  quantity_in_stock integer,
  reorder_level integer,
  reorder_quantity integer,
  unit_price numeric,
  status product_status,
  days_until_out_of_stock numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.sku,
    p.product_name,
    p.quantity_in_stock,
    COALESCE(p.low_stock_threshold, p.reorder_level, 0) as reorder_level, -- Return threshold as reorder level for display
    p.reorder_quantity,
    p.unit_price,
    p.status,
    CASE 
      WHEN p.quantity_in_stock > 0 THEN
        -- Estimate days until out of stock based on average daily sales from last 30 days
        (p.quantity_in_stock::numeric / NULLIF(
          (
            SELECT AVG(daily_sales)
            FROM (
              SELECT 
                DATE_TRUNC('day', o.order_date) as sale_date,
                SUM((item->>'quantity')::integer) as daily_sales
              FROM orders o
              CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item
              WHERE o.brand_id = p_brand_id
                AND (item->>'sku') = p.sku
                AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
              GROUP BY DATE_TRUNC('day', o.order_date)
            ) daily_stats
          ), 0
        ))
      ELSE 0
    END as days_until_out_of_stock
  FROM products p
  WHERE p.brand_id = p_brand_id
    AND p.status = 'active'
    AND (
      p.quantity_in_stock = 0
      OR (p.low_stock_threshold > 0 AND p.quantity_in_stock <= p.low_stock_threshold)
      OR (p.low_stock_threshold = 0 AND p.reorder_level > 0 AND p.quantity_in_stock <= p.reorder_level)
    )
  ORDER BY 
    CASE WHEN p.quantity_in_stock = 0 THEN 0 ELSE 1 END,
    p.quantity_in_stock ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 3. UPDATE FUNCTION: GET UPCOMING SHIPMENTS
-- ================================================

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
    po.expected_delivery_date,
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
    AND po.expected_delivery_date >= CURRENT_DATE
    AND po.expected_delivery_date <= CURRENT_DATE + (p_days_ahead || ' days')::interval
    AND po.po_status IN ('approved', 'ordered', 'received') -- partial_received might also be relevant
  ORDER BY po.expected_delivery_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

