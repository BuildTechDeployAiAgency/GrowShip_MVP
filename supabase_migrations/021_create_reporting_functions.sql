-- ================================================
-- MIGRATION 021: CREATE REPORTING FUNCTIONS
-- ================================================
-- Description: Create functions for order fulfillment and delivery performance
-- Date: November 12, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE FUNCTION: GET ORDER FULFILLMENT METRICS
-- ================================================

CREATE OR REPLACE FUNCTION get_order_fulfillment_metrics(
  p_brand_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_orders bigint,
  orders_shipped bigint,
  orders_delivered bigint,
  orders_pending bigint,
  orders_cancelled bigint,
  fulfillment_rate numeric,
  delivery_rate numeric,
  avg_delivery_days numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_orders,
    COUNT(*) FILTER (WHERE order_status IN ('shipped', 'delivered'))::bigint as orders_shipped,
    COUNT(*) FILTER (WHERE order_status = 'delivered')::bigint as orders_delivered,
    COUNT(*) FILTER (WHERE order_status IN ('pending', 'confirmed', 'processing'))::bigint as orders_pending,
    COUNT(*) FILTER (WHERE order_status = 'cancelled')::bigint as orders_cancelled,
    CASE 
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE order_status IN ('shipped', 'delivered'))::numeric / COUNT(*)::numeric * 100)
      ELSE 0
    END as fulfillment_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE order_status IN ('shipped', 'delivered')) > 0 THEN
        (COUNT(*) FILTER (WHERE order_status = 'delivered')::numeric / 
         COUNT(*) FILTER (WHERE order_status IN ('shipped', 'delivered'))::numeric * 100)
      ELSE 0
    END as delivery_rate,
    AVG(
      CASE 
        WHEN order_status = 'delivered' AND actual_delivery_date IS NOT NULL AND order_date IS NOT NULL THEN
          EXTRACT(EPOCH FROM (actual_delivery_date - order_date)) / 86400
        ELSE NULL
      END
    ) as avg_delivery_days
  FROM orders
  WHERE brand_id = p_brand_id
    AND (p_start_date IS NULL OR DATE(order_date) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(order_date) <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 2. CREATE FUNCTION: GET DELIVERY PERFORMANCE
-- ================================================

CREATE OR REPLACE FUNCTION get_delivery_performance(
  p_brand_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_deliveries bigint,
  on_time_deliveries bigint,
  late_deliveries bigint,
  on_time_percentage numeric,
  avg_days_late numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE order_status = 'delivered' AND actual_delivery_date IS NOT NULL)::bigint as total_deliveries,
    COUNT(*) FILTER (
      WHERE order_status = 'delivered' 
        AND actual_delivery_date IS NOT NULL
        AND estimated_delivery_date IS NOT NULL
        AND actual_delivery_date <= estimated_delivery_date
    )::bigint as on_time_deliveries,
    COUNT(*) FILTER (
      WHERE order_status = 'delivered' 
        AND actual_delivery_date IS NOT NULL
        AND estimated_delivery_date IS NOT NULL
        AND actual_delivery_date > estimated_delivery_date
    )::bigint as late_deliveries,
    CASE 
      WHEN COUNT(*) FILTER (WHERE order_status = 'delivered' AND actual_delivery_date IS NOT NULL) > 0 THEN
        (COUNT(*) FILTER (
          WHERE order_status = 'delivered' 
            AND actual_delivery_date IS NOT NULL
            AND estimated_delivery_date IS NOT NULL
            AND actual_delivery_date <= estimated_delivery_date
        )::numeric / 
        COUNT(*) FILTER (WHERE order_status = 'delivered' AND actual_delivery_date IS NOT NULL)::numeric * 100)
      ELSE 0
    END as on_time_percentage,
    AVG(
      CASE 
        WHEN order_status = 'delivered' 
          AND actual_delivery_date IS NOT NULL
          AND estimated_delivery_date IS NOT NULL
          AND actual_delivery_date > estimated_delivery_date THEN
          EXTRACT(EPOCH FROM (actual_delivery_date - estimated_delivery_date)) / 86400
        ELSE NULL
      END
    ) as avg_days_late
  FROM orders
  WHERE brand_id = p_brand_id
    AND (p_start_date IS NULL OR DATE(order_date) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(order_date) <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 3. CREATE FUNCTION: GET SKU PERFORMANCE REPORT
-- ================================================

CREATE OR REPLACE FUNCTION get_sku_performance_report(
  p_brand_id uuid,
  p_sku varchar,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  sku varchar,
  product_name varchar,
  total_quantity_sold integer,
  total_revenue numeric,
  order_count bigint,
  avg_order_value numeric,
  first_sale_date date,
  last_sale_date date
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.sku,
    p.product_name,
    COALESCE(SUM((item->>'quantity')::integer), 0)::integer as total_quantity_sold,
    COALESCE(SUM((item->>'total')::numeric), 0) as total_revenue,
    COUNT(DISTINCT o.id)::bigint as order_count,
    CASE 
      WHEN COUNT(DISTINCT o.id) > 0 THEN
        COALESCE(SUM((item->>'total')::numeric), 0) / COUNT(DISTINCT o.id)::numeric
      ELSE 0
    END as avg_order_value,
    MIN(DATE(o.order_date)) as first_sale_date,
    MAX(DATE(o.order_date)) as last_sale_date
  FROM products p
  LEFT JOIN orders o ON o.brand_id = p.brand_id
    AND (p_start_date IS NULL OR DATE(o.order_date) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(o.order_date) <= p_end_date)
  LEFT JOIN LATERAL jsonb_array_elements(o.items) AS item ON (item->>'sku') = p.sku
  WHERE p.brand_id = p_brand_id
    AND p.sku = p_sku
  GROUP BY p.sku, p.product_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Verification queries (run separately)
-- SELECT * FROM get_order_fulfillment_metrics('your-brand-id'::uuid);
-- SELECT * FROM get_delivery_performance('your-brand-id'::uuid);
-- SELECT * FROM get_sku_performance_report('your-brand-id'::uuid, 'SKU-001');


