-- ================================================
-- Migration 060: Backfill order_lines from legacy orders.items
-- ================================================
-- Description: Ensure all orders have normalized order_lines rows so
--              shipments can be created (especially for legacy/imported orders
--              that only stored items JSON).
-- Date: 2025-12-03
-- Author: GrowShip Team
-- ================================================

BEGIN;

-- Backfill order_lines for orders that have no order_lines but do have items JSON
WITH target_orders AS (
  SELECT id, items, currency, created_at
  FROM orders o
  WHERE NOT EXISTS (SELECT 1 FROM order_lines ol WHERE ol.order_id = o.id)
    AND jsonb_typeof(o.items) = 'array'
    AND jsonb_array_length(o.items) > 0
)
INSERT INTO order_lines (
  order_id,
  product_id,
  sku,
  product_name,
  quantity,
  unit_price,
  discount,
  tax,
  currency,
  notes,
  created_at,
  updated_at,
  shipped_quantity
)
SELECT
  t.id,
  NULLIF(item->>'product_id', '')::uuid,
  COALESCE(item->>'sku', ''),
  item->>'product_name',
  COALESCE((item->>'quantity')::numeric, 0),
  COALESCE((item->>'unit_price')::numeric, 0),
  COALESCE((item->>'discount')::numeric, 0),
  COALESCE((item->>'tax')::numeric, COALESCE((item->>'tax_rate')::numeric, 0)),
  COALESCE(item->>'currency', t.currency, 'USD'),
  item->>'notes',
  t.created_at,
  NOW(),
  0
FROM target_orders t
CROSS JOIN LATERAL jsonb_array_elements(t.items) AS item;

COMMIT;
