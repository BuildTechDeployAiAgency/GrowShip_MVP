-- ================================================
-- Migration: Fix Dashboard RPC Types
-- ================================================
-- Description: Explicitly cast varchar columns to TEXT in dashboard RPC functions to match return types
-- Date: 2025-12-06
-- Author: GrowShip MVP Team
--
-- This migration updates:
-- 1. get_sales_by_category
-- 2. get_top_products_by_revenue1
-- 3. get_sales_by_territory
-- 4. get_top_customers_by_revenue
-- ================================================

BEGIN;

-- ================================================
-- 4. GET SALES BY CATEGORY
-- ================================================

CREATE OR REPLACE FUNCTION get_sales_by_category(
  p_table_suffix TEXT DEFAULT '',
  p_user_id TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_user_role TEXT DEFAULT '',
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  category TEXT,
  revenue NUMERIC,
  revenue_display TEXT
) AS $$
DECLARE
  v_year INTEGER;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

  -- Calculate date range
  IF p_month IS NOT NULL THEN
    v_start_date := make_date(v_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    v_start_date := make_date(v_year, 1, 1);
    v_end_date := make_date(v_year, 12, 31);
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(sd.product_category, p.product_category, 'Uncategorized')::TEXT AS cat,
    COALESCE(SUM(sd.total_sales), 0) AS rev,
    '$' || TO_CHAR(COALESCE(SUM(sd.total_sales), 0), 'FM999,999,999')
  FROM sales_data sd
  LEFT JOIN products p ON p.sku = sd.sku AND p.brand_id = sd.brand_id
  WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
    AND sd.sales_date >= v_start_date
    AND sd.sales_date <= v_end_date
  GROUP BY COALESCE(sd.product_category, p.product_category, 'Uncategorized')
  ORDER BY rev DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sales_by_category IS 'Returns revenue grouped by product category for Sales by Category chart';


-- ================================================
-- 5. GET TOP PRODUCTS BY REVENUE (Top 10 SKUs)
-- ================================================

CREATE OR REPLACE FUNCTION get_top_products_by_revenue1(
  p_table_suffix TEXT DEFAULT '',
  p_user_id TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_user_role TEXT DEFAULT '',
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  rank_position INTEGER,
  product_name TEXT,
  country TEXT,
  year INTEGER,
  month INTEGER,
  week INTEGER,
  revenue NUMERIC,
  previous_period_revenue NUMERIC,
  growth_percentage NUMERIC,
  current_soh INTEGER,
  type TEXT
) AS $$
DECLARE
  v_year INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  
  -- Current period: full year
  v_start_date := make_date(v_year, 1, 1);
  v_end_date := make_date(v_year, 12, 31);
  -- Previous period: previous year
  v_prev_start_date := make_date(v_year - 1, 1, 1);
  v_prev_end_date := make_date(v_year - 1, 12, 31);

  RETURN QUERY
  WITH current_period_sales AS (
    SELECT 
      sd.sku,
      COALESCE(sd.product_name, p.product_name, 'Unknown Product') AS prod_name,
      COALESCE(sd.territory_country, sd.country, 'Unknown') AS cntry,
      COALESCE(SUM(sd.total_sales), 0) AS revenue
    FROM sales_data sd
    LEFT JOIN products p ON p.sku = sd.sku AND p.brand_id = sd.brand_id
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_start_date
      AND sd.sales_date <= v_end_date
    GROUP BY sd.sku, COALESCE(sd.product_name, p.product_name, 'Unknown Product'), 
             COALESCE(sd.territory_country, sd.country, 'Unknown')
  ),
  previous_period_sales AS (
    SELECT 
      sd.sku,
      COALESCE(SUM(sd.total_sales), 0) AS revenue
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_prev_start_date
      AND sd.sales_date <= v_prev_end_date
    GROUP BY sd.sku
  ),
  product_stock AS (
    SELECT 
      p.sku,
      COALESCE(p.quantity_in_stock, 0) AS stock,
      COALESCE(p.product_category, 'Uncategorized') AS category
    FROM products p
    WHERE p_brand_id IS NULL OR p.brand_id = p_brand_id
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY cps.revenue DESC)::INTEGER,
    cps.prod_name::TEXT,
    cps.cntry::TEXT,
    v_year,
    NULL::INTEGER,
    NULL::INTEGER,
    cps.revenue,
    pps.revenue,
    CASE 
      WHEN pps.revenue IS NOT NULL AND pps.revenue > 0 THEN
        ROUND(((cps.revenue - pps.revenue) / pps.revenue) * 100, 1)
      ELSE NULL
    END,
    COALESCE(ps.stock, 0)::INTEGER,
    COALESCE(ps.category, 'Uncategorized')::TEXT
  FROM current_period_sales cps
  LEFT JOIN previous_period_sales pps ON pps.sku = cps.sku
  LEFT JOIN product_stock ps ON ps.sku = cps.sku
  ORDER BY cps.revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_products_by_revenue1 IS 'Returns top SKUs with revenue, YoY growth, and stock-on-hand for Top 10 SKUs table';


-- ================================================
-- 6. GET SALES BY TERRITORY
-- ================================================

CREATE OR REPLACE FUNCTION get_sales_by_territory(
  p_table_suffix TEXT DEFAULT '',
  p_user_id TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_user_role TEXT DEFAULT '',
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  territory TEXT,
  revenue NUMERIC,
  revenue_display TEXT,
  previous_revenue NUMERIC,
  revenue_growth_percentage NUMERIC,
  revenue_growth_display TEXT,
  country_count BIGINT,
  countries TEXT
) AS $$
DECLARE
  v_year INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

  -- Calculate date range
  IF p_month IS NOT NULL THEN
    v_start_date := make_date(v_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_prev_start_date := make_date(v_year - 1, p_month, 1);
    v_prev_end_date := (v_prev_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    v_start_date := make_date(v_year, 1, 1);
    v_end_date := make_date(v_year, 12, 31);
    v_prev_start_date := make_date(v_year - 1, 1, 1);
    v_prev_end_date := make_date(v_year - 1, 12, 31);
  END IF;

  RETURN QUERY
  WITH current_sales AS (
    SELECT 
      COALESCE(sd.territory, 'Unknown') AS terr,
      COALESCE(SUM(sd.total_sales), 0) AS rev,
      COUNT(DISTINCT COALESCE(sd.territory_country, sd.country)) AS cnt_count,
      STRING_AGG(DISTINCT COALESCE(sd.territory_country, sd.country), ', ' ORDER BY COALESCE(sd.territory_country, sd.country)) AS countries_list
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_start_date
      AND sd.sales_date <= v_end_date
    GROUP BY COALESCE(sd.territory, 'Unknown')
  ),
  previous_sales AS (
    SELECT 
      COALESCE(sd.territory, 'Unknown') AS terr,
      COALESCE(SUM(sd.total_sales), 0) AS rev
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_prev_start_date
      AND sd.sales_date <= v_prev_end_date
    GROUP BY COALESCE(sd.territory, 'Unknown')
  )
  SELECT 
    cs.terr::TEXT,
    cs.rev,
    '$' || TO_CHAR(cs.rev / 1000, 'FM999,999') || 'k',
    COALESCE(ps.rev, 0),
    CASE 
      WHEN COALESCE(ps.rev, 0) > 0 THEN
        ROUND(((cs.rev - ps.rev) / ps.rev) * 100, 1)
      ELSE 0
    END,
    CASE 
      WHEN COALESCE(ps.rev, 0) > 0 THEN
        CASE WHEN cs.rev >= ps.rev THEN '+' ELSE '' END ||
        ROUND(((cs.rev - ps.rev) / ps.rev) * 100, 1)::TEXT || '%'
      ELSE '+0.0%'
    END,
    cs.cnt_count,
    COALESCE(cs.countries_list, '')::TEXT
  FROM current_sales cs
  LEFT JOIN previous_sales ps ON ps.terr = cs.terr
  ORDER BY cs.rev DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sales_by_territory IS 'Returns revenue grouped by territory/region with YoY growth for Top Regions chart';


-- ================================================
-- 7. GET TOP CUSTOMERS BY REVENUE
-- ================================================

CREATE OR REPLACE FUNCTION get_top_customers_by_revenue(
  p_table_suffix TEXT DEFAULT '',
  p_user_id TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_user_role TEXT DEFAULT '',
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  customer_name TEXT,
  distributor_name TEXT,
  revenue NUMERIC,
  order_count BIGINT,
  previous_period_revenue NUMERIC,
  customer_id UUID,
  distributor_id UUID
) AS $$
DECLARE
  v_year INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

  -- Calculate date range
  IF p_month IS NOT NULL THEN
    v_start_date := make_date(v_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_prev_start_date := make_date(v_year - 1, p_month, 1);
    v_prev_end_date := (v_prev_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    v_start_date := make_date(v_year, 1, 1);
    v_end_date := make_date(v_year, 12, 31);
    v_prev_start_date := make_date(v_year - 1, 1, 1);
    v_prev_end_date := make_date(v_year - 1, 12, 31);
  END IF;

  RETURN QUERY
  WITH current_sales AS (
    SELECT 
      COALESCE(sd.retailer_name, 'Unknown Customer') AS cust_name,
      d.name AS dist_name,
      COALESCE(SUM(sd.total_sales), 0) AS rev,
      COUNT(DISTINCT sd.id) AS ord_count,
      sd.distributor_id AS dist_id
    FROM sales_data sd
    LEFT JOIN distributors d ON d.id = sd.distributor_id
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_start_date
      AND sd.sales_date <= v_end_date
    GROUP BY COALESCE(sd.retailer_name, 'Unknown Customer'), d.name, sd.distributor_id
  ),
  previous_sales AS (
    SELECT 
      COALESCE(sd.retailer_name, 'Unknown Customer') AS cust_name,
      COALESCE(SUM(sd.total_sales), 0) AS rev
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_prev_start_date
      AND sd.sales_date <= v_prev_end_date
    GROUP BY COALESCE(sd.retailer_name, 'Unknown Customer')
  )
  SELECT 
    cs.cust_name::TEXT,
    cs.dist_name::TEXT,
    cs.rev,
    cs.ord_count,
    ps.rev,
    NULL::UUID,
    cs.dist_id
  FROM current_sales cs
  LEFT JOIN previous_sales ps ON ps.cust_name = cs.cust_name
  ORDER BY cs.rev DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_customers_by_revenue IS 'Returns top customers/retailers by revenue for Top Customers chart';

COMMIT;

