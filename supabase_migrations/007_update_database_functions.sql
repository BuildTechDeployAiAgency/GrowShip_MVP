-- =====================================================
-- Migration 007: Update Database Functions
-- =====================================================
-- Description: Update analytics functions and views to use brand_id instead of organization_id
-- Date: 2025-11-04
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- ================================================
-- UPDATE ANALYTICS FUNCTIONS
-- ================================================

-- Update get_brand_sales_data function
CREATE OR REPLACE FUNCTION get_brand_sales_data(
  p_brand_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  sales_date date,
  total_sales numeric,
  total_quantity integer,
  product_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.sales_date,
    SUM(sd.total_sales) as total_sales,
    SUM(sd.quantity_sold) as total_quantity,
    COUNT(DISTINCT sd.sku) as product_count
  FROM sales_data sd
  WHERE sd.brand_id = p_brand_id
    AND (p_start_date IS NULL OR sd.sales_date >= p_start_date)
    AND (p_end_date IS NULL OR sd.sales_date <= p_end_date)
  GROUP BY sd.sales_date
  ORDER BY sd.sales_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Update get_category_performance function
CREATE OR REPLACE FUNCTION get_category_performance(
  p_brand_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  category text,
  total_sales numeric,
  total_quantity integer,
  avg_price numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.product_category,
    SUM(sd.total_sales) as total_sales,
    SUM(sd.quantity_sold) as total_quantity,
    AVG(sd.unit_price) as avg_price
  FROM sales_data sd
  WHERE sd.brand_id = p_brand_id
    AND (p_start_date IS NULL OR sd.sales_date >= p_start_date)
    AND (p_end_date IS NULL OR sd.sales_date <= p_end_date)
  GROUP BY sd.product_category
  ORDER BY total_sales DESC;
END;
$$ LANGUAGE plpgsql;

-- Update get_monthly_sales_trend function
CREATE OR REPLACE FUNCTION get_monthly_sales_trend(
  p_brand_id uuid,
  p_months integer DEFAULT 12
)
RETURNS TABLE (
  month date,
  total_sales numeric,
  order_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', sd.sales_date)::date as month,
    SUM(sd.total_sales) as total_sales,
    COUNT(DISTINCT sd.id) as order_count
  FROM sales_data sd
  WHERE sd.brand_id = p_brand_id
    AND sd.sales_date >= CURRENT_DATE - (p_months || ' months')::interval
  GROUP BY DATE_TRUNC('month', sd.sales_date)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql;

-- Update get_sales_by_country function
CREATE OR REPLACE FUNCTION get_sales_by_country(
  p_brand_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  country text,
  total_sales numeric,
  total_quantity integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.country,
    SUM(sd.total_sales) as total_sales,
    SUM(sd.quantity_sold) as total_quantity
  FROM sales_data sd
  WHERE sd.brand_id = p_brand_id
    AND (p_start_date IS NULL OR sd.sales_date >= p_start_date)
    AND (p_end_date IS NULL OR sd.sales_date <= p_end_date)
  GROUP BY sd.country
  ORDER BY total_sales DESC;
END;
$$ LANGUAGE plpgsql;

-- Update get_top_products_by_sales function
CREATE OR REPLACE FUNCTION get_top_products_by_sales(
  p_brand_id uuid,
  p_limit integer DEFAULT 10,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  sku text,
  product_name text,
  total_sales numeric,
  total_quantity integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.sku,
    sd.product_name,
    SUM(sd.total_sales) as total_sales,
    SUM(sd.quantity_sold) as total_quantity
  FROM sales_data sd
  WHERE sd.brand_id = p_brand_id
    AND (p_start_date IS NULL OR sd.sales_date >= p_start_date)
    AND (p_end_date IS NULL OR sd.sales_date <= p_end_date)
  GROUP BY sd.sku, sd.product_name
  ORDER BY total_sales DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- CREATE NEW BRAND VIEW FUNCTION (formerly create_organization_view)
-- ================================================

CREATE OR REPLACE FUNCTION create_brand_view(
  p_brand_id uuid,
  p_view_name text,
  p_user_table text
)
RETURNS boolean AS $$
BEGIN
  -- Create a view for brand admins to see all users' data in their brand
  EXECUTE format(
    'CREATE OR REPLACE VIEW %I AS 
     SELECT * FROM %I 
     WHERE brand_id = %L',
    p_view_name,
    p_user_table,
    p_brand_id
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating brand view: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- DROP OLD ORGANIZATION VIEW FUNCTION
-- ================================================

DROP FUNCTION IF EXISTS create_organization_view(uuid, text, text);

-- ================================================
-- UPDATE MATERIALIZED VIEWS
-- ================================================

-- Drop and recreate orders_analytics_view with brand_id
DROP MATERIALIZED VIEW IF EXISTS orders_analytics_view;

CREATE MATERIALIZED VIEW orders_analytics_view AS
SELECT 
  o.id,
  o.order_number,
  o.order_date,
  o.brand_id,
  o.distributor_id,
  o.customer_name,
  o.customer_type,
  o.total_amount,
  o.order_status,
  o.payment_status,
  DATE_TRUNC('month', o.order_date)::date as order_month,
  DATE_TRUNC('year', o.order_date)::date as order_year,
  EXTRACT(QUARTER FROM o.order_date) as order_quarter
FROM orders o;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_orders_analytics_brand_id ON orders_analytics_view(brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_analytics_distributor_id ON orders_analytics_view(distributor_id);
CREATE INDEX IF NOT EXISTS idx_orders_analytics_order_month ON orders_analytics_view(order_month);

-- Update refresh function
CREATE OR REPLACE FUNCTION refresh_orders_analytics_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW orders_analytics_view;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- UPDATE VIEW DOCUMENTS FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION update_view_documents()
RETURNS trigger AS $$
BEGIN
  -- Update the brand view when documents are inserted/updated
  -- This function may need to be updated based on specific view logic
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- ADD HELPER FUNCTION: Get Distributors for Brand
-- ================================================

CREATE OR REPLACE FUNCTION get_brand_distributors(
  p_brand_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  status distributor_status,
  orders_count integer,
  revenue_to_date numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.code,
    d.status,
    d.orders_count,
    d.revenue_to_date
  FROM distributors d
  WHERE d.brand_id = p_brand_id
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- ADD HELPER FUNCTION: Get Sales Data by Distributor
-- ================================================

CREATE OR REPLACE FUNCTION get_sales_by_distributor(
  p_brand_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  distributor_id uuid,
  distributor_name text,
  total_sales numeric,
  total_quantity integer,
  order_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as distributor_id,
    d.name as distributor_name,
    COALESCE(SUM(sd.total_sales), 0) as total_sales,
    COALESCE(SUM(sd.quantity_sold), 0) as total_quantity,
    COUNT(DISTINCT sd.id) as order_count
  FROM distributors d
  LEFT JOIN sales_data sd ON sd.distributor_id = d.id
    AND sd.brand_id = p_brand_id
    AND (p_start_date IS NULL OR sd.sales_date >= p_start_date)
    AND (p_end_date IS NULL OR sd.sales_date <= p_end_date)
  WHERE d.brand_id = p_brand_id
  GROUP BY d.id, d.name
  ORDER BY total_sales DESC;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Verification queries (run separately)
-- SELECT * FROM get_brand_sales_data('your-brand-id'::uuid, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);
-- SELECT * FROM get_brand_distributors('your-brand-id'::uuid);
-- SELECT * FROM get_sales_by_distributor('your-brand-id'::uuid);

