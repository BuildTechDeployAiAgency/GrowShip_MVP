-- =====================================================
-- Migration 20251205: Enhance Orders for Campaign Tracking
-- =====================================================
-- Description: Add campaign_id and sales_channel to orders table,
--              and unit_cost to order_lines for margin reporting
-- Date: 2025-12-05
-- Author: GrowShip Team
-- 
-- This migration addresses gaps identified in the orders schema to support:
-- 1. Campaign-level target vs actuals analysis
-- 2. Sales channel tracking for multi-channel reporting
-- 3. Historical cost tracking for accurate margin calculations
-- =====================================================

BEGIN;

-- ================================================
-- 1. ADD CAMPAIGN_ID TO ORDERS TABLE
-- ================================================
-- Links orders to marketing campaigns for Target vs Actuals analysis
-- This supports the new "campaign" target scope in sales_targets

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(100);

COMMENT ON COLUMN orders.campaign_id IS 'Marketing campaign identifier for campaign-level target vs actuals analysis';

-- Index for campaign-based queries and reporting
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id 
ON orders(campaign_id) 
WHERE campaign_id IS NOT NULL;

-- Composite index for campaign reporting by brand
CREATE INDEX IF NOT EXISTS idx_orders_brand_campaign 
ON orders(brand_id, campaign_id) 
WHERE campaign_id IS NOT NULL;

-- ================================================
-- 2. ADD SALES_CHANNEL TO ORDERS TABLE
-- ================================================
-- Tracks the source/channel of the order for channel-based analytics
-- e.g., "Portal", "EDI", "Shopify", "Amazon", "Direct"

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS sales_channel VARCHAR(50);

COMMENT ON COLUMN orders.sales_channel IS 'Sales channel/platform source: Portal, EDI, Shopify, Amazon, Direct, API, etc.';

-- Index for channel-based queries
CREATE INDEX IF NOT EXISTS idx_orders_sales_channel 
ON orders(sales_channel) 
WHERE sales_channel IS NOT NULL;

-- Composite index for channel reporting by brand
CREATE INDEX IF NOT EXISTS idx_orders_brand_channel 
ON orders(brand_id, sales_channel);

-- ================================================
-- 3. ADD UNIT_COST TO ORDER_LINES TABLE
-- ================================================
-- Freezes the product cost at order time for accurate historical margin/profit reporting
-- Product costs change over time, so we need to capture the cost at order creation

ALTER TABLE order_lines 
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) CHECK (unit_cost >= 0);

COMMENT ON COLUMN order_lines.unit_cost IS 'Product cost per unit at time of order for historical margin calculations';

-- Add a computed margin column for convenience
ALTER TABLE order_lines 
ADD COLUMN IF NOT EXISTS margin NUMERIC(10,2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN unit_cost IS NOT NULL AND unit_cost > 0 
    THEN (unit_price - unit_cost)
    ELSE NULL 
  END
) STORED;

COMMENT ON COLUMN order_lines.margin IS 'Computed margin per unit: unit_price - unit_cost';

-- Add margin percentage column
ALTER TABLE order_lines 
ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(5,2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN unit_cost IS NOT NULL AND unit_cost > 0 AND unit_price > 0
    THEN ((unit_price - unit_cost) / unit_price * 100)
    ELSE NULL 
  END
) STORED;

COMMENT ON COLUMN order_lines.margin_percent IS 'Computed margin percentage: ((unit_price - unit_cost) / unit_price) * 100';

-- ================================================
-- 4. CREATE HELPER FUNCTION TO AUTO-POPULATE UNIT_COST
-- ================================================
-- When an order line is created, automatically fetch the current product cost

CREATE OR REPLACE FUNCTION populate_order_line_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Only populate if unit_cost is not explicitly set and product_id exists
  IF NEW.unit_cost IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT cost_price INTO NEW.unit_cost
    FROM products
    WHERE id = NEW.product_id;
  END IF;
  
  -- Fallback: try to get cost by SKU if product_id is not set
  IF NEW.unit_cost IS NULL AND NEW.sku IS NOT NULL THEN
    SELECT cost_price INTO NEW.unit_cost
    FROM products
    WHERE sku = NEW.sku
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate unit_cost
DROP TRIGGER IF EXISTS trigger_populate_order_line_cost ON order_lines;
CREATE TRIGGER trigger_populate_order_line_cost
  BEFORE INSERT ON order_lines
  FOR EACH ROW
  EXECUTE FUNCTION populate_order_line_cost();

-- ================================================
-- 5. ADD CAMPAIGN_ID TO SALES_DATA TABLE (IF NOT EXISTS)
-- ================================================
-- Ensures consistency between orders and sales_data for reporting

ALTER TABLE sales_data 
ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(100);

COMMENT ON COLUMN sales_data.campaign_id IS 'Marketing campaign identifier for campaign-level reporting';

-- Index for campaign-based queries on sales_data
CREATE INDEX IF NOT EXISTS idx_sales_data_campaign_id 
ON sales_data(campaign_id) 
WHERE campaign_id IS NOT NULL;

-- ================================================
-- 6. CREATE VIEW FOR ORDER PROFITABILITY ANALYSIS
-- ================================================
-- Aggregated view for order-level profitability metrics

CREATE OR REPLACE VIEW order_profitability_view AS
SELECT 
  o.id AS order_id,
  o.order_number,
  o.order_date,
  o.brand_id,
  o.distributor_id,
  o.campaign_id,
  o.sales_channel,
  o.customer_name,
  o.total_amount AS order_revenue,
  COALESCE(SUM(ol.quantity * ol.unit_cost), 0) AS order_cost,
  o.total_amount - COALESCE(SUM(ol.quantity * ol.unit_cost), 0) AS order_profit,
  CASE 
    WHEN o.total_amount > 0 
    THEN ((o.total_amount - COALESCE(SUM(ol.quantity * ol.unit_cost), 0)) / o.total_amount * 100)
    ELSE 0 
  END AS profit_margin_percent,
  COUNT(ol.id) AS line_count,
  SUM(ol.quantity) AS total_units
FROM orders o
LEFT JOIN order_lines ol ON o.id = ol.order_id
GROUP BY 
  o.id, 
  o.order_number, 
  o.order_date, 
  o.brand_id, 
  o.distributor_id,
  o.campaign_id,
  o.sales_channel,
  o.customer_name, 
  o.total_amount;

COMMENT ON VIEW order_profitability_view IS 'Aggregated order profitability metrics including revenue, cost, profit, and margin';

-- ================================================
-- 7. CREATE RPC FOR CAMPAIGN PERFORMANCE SUMMARY
-- ================================================
-- Function to get campaign performance metrics

CREATE OR REPLACE FUNCTION get_campaign_performance(
  p_brand_id UUID,
  p_campaign_id VARCHAR DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  campaign_id VARCHAR,
  total_orders BIGINT,
  total_revenue NUMERIC,
  total_units NUMERIC,
  avg_order_value NUMERIC,
  unique_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.campaign_id,
    COUNT(DISTINCT o.id)::BIGINT AS total_orders,
    COALESCE(SUM(o.total_amount), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(ol.quantity), 0)::NUMERIC AS total_units,
    CASE 
      WHEN COUNT(DISTINCT o.id) > 0 
      THEN (SUM(o.total_amount) / COUNT(DISTINCT o.id))::NUMERIC
      ELSE 0 
    END AS avg_order_value,
    COUNT(DISTINCT o.customer_name)::BIGINT AS unique_customers
  FROM orders o
  LEFT JOIN order_lines ol ON o.id = ol.order_id
  WHERE o.brand_id = p_brand_id
    AND o.campaign_id IS NOT NULL
    AND (p_campaign_id IS NULL OR o.campaign_id = p_campaign_id)
    AND (p_start_date IS NULL OR o.order_date >= p_start_date)
    AND (p_end_date IS NULL OR o.order_date <= p_end_date)
  GROUP BY o.campaign_id
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_campaign_performance IS 'Returns campaign performance metrics: orders, revenue, units, AOV, and unique customers';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_campaign_performance TO authenticated;

-- ================================================
-- 8. CREATE RPC FOR SALES CHANNEL PERFORMANCE
-- ================================================
-- Function to get sales by channel metrics

CREATE OR REPLACE FUNCTION get_sales_by_channel(
  p_brand_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
  sales_channel VARCHAR,
  total_orders BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  order_count_percent NUMERIC
) AS $$
DECLARE
  v_total_orders BIGINT;
BEGIN
  -- Get total orders for percentage calculation
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE brand_id = p_brand_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM order_date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM order_date) = p_month);

  RETURN QUERY
  SELECT 
    COALESCE(o.sales_channel, 'Unknown')::VARCHAR AS sales_channel,
    COUNT(*)::BIGINT AS total_orders,
    COALESCE(SUM(o.total_amount), 0)::NUMERIC AS total_revenue,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (SUM(o.total_amount) / COUNT(*))::NUMERIC
      ELSE 0 
    END AS avg_order_value,
    CASE 
      WHEN v_total_orders > 0 
      THEN (COUNT(*)::NUMERIC / v_total_orders * 100)
      ELSE 0 
    END AS order_count_percent
  FROM orders o
  WHERE o.brand_id = p_brand_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM o.order_date) = p_month)
  GROUP BY COALESCE(o.sales_channel, 'Unknown')
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_sales_by_channel IS 'Returns sales metrics grouped by sales channel';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sales_by_channel TO authenticated;

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (Run separately)
-- ================================================

-- Verify new columns on orders
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
-- AND column_name IN ('campaign_id', 'sales_channel')
-- ORDER BY ordinal_position;

-- Verify new columns on order_lines
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'order_lines'
-- AND column_name IN ('unit_cost', 'margin', 'margin_percent')
-- ORDER BY ordinal_position;

-- Verify new column on sales_data
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'sales_data'
-- AND column_name = 'campaign_id';

-- Test the view
-- SELECT * FROM order_profitability_view LIMIT 5;

-- Test the functions
-- SELECT * FROM get_campaign_performance('your-brand-id-here');
-- SELECT * FROM get_sales_by_channel('your-brand-id-here', 2025);

