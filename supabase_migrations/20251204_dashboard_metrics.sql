-- ================================================
-- Migration: Dashboard Metrics RPC Functions
-- ================================================
-- Description: Create RPC functions needed for the Brand Dashboard MVP
-- Date: 2025-12-04
-- Author: GrowShip MVP Team
--
-- This migration creates/updates:
-- 1. get_sales_dashboard_metrics - Core KPI summary (Total Revenue, Growth, Profit Margin, Target Achievement, Pending Orders)
-- 2. get_monthly_yoy_revenue - Revenue Comparison chart (current vs previous year by month)
-- 3. get_seasonal_analysis - Seasonal Analysis chart (quarterly revenue with YoY growth)
-- 4. get_sales_by_category - Sales by Category chart
-- 5. get_top_products_by_revenue1 - Top 10 SKUs with growth and stock-on-hand
-- 6. get_sales_by_territory - Top Regions/Countries chart
-- 7. get_top_customers_by_revenue - Top Customers/Retailers chart
--
-- Data source: sales_data table (populated from distributor Excel imports)
-- Reference date field: sales_date (with reporting_month for aggregations)
-- ================================================

BEGIN;

-- ================================================
-- 0. DROP EXISTING FUNCTIONS (if they exist with different signatures)
-- ================================================
-- This ensures we can recreate functions even if they have different parameter lists

DROP FUNCTION IF EXISTS get_sales_dashboard_metrics(TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS get_sales_dashboard_metrics(TEXT, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_sales_dashboard_metrics();

DROP FUNCTION IF EXISTS get_monthly_yoy_revenue(TEXT, TEXT, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS get_monthly_yoy_revenue(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_monthly_yoy_revenue();

DROP FUNCTION IF EXISTS get_seasonal_analysis(TEXT, TEXT, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS get_seasonal_analysis(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_seasonal_analysis();

DROP FUNCTION IF EXISTS get_sales_by_category(TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS get_sales_by_category(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_sales_by_category();

DROP FUNCTION IF EXISTS get_top_products_by_revenue1(TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS get_top_products_by_revenue1(UUID, INTEGER, DATE, DATE);
DROP FUNCTION IF EXISTS get_top_products_by_revenue1();

DROP FUNCTION IF EXISTS get_sales_by_territory(TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS get_sales_by_territory(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_sales_by_territory();

DROP FUNCTION IF EXISTS get_top_customers_by_revenue(TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS get_top_customers_by_revenue(UUID, INTEGER, DATE, DATE);
DROP FUNCTION IF EXISTS get_top_customers_by_revenue();

-- ================================================
-- 1. GET SALES DASHBOARD METRICS
-- ================================================
-- Returns KPIs for the dashboard metric cards:
-- - Total Revenue (for selected period)
-- - Revenue Growth % (vs same period previous year)
-- - Profit Margin % (based on products cost_price)
-- - Target Achievement % (vs sales_targets)
-- - Pending Orders Count and Value

CREATE OR REPLACE FUNCTION get_sales_dashboard_metrics(
  p_table_suffix TEXT DEFAULT '',  -- Legacy parameter, not used (kept for compatibility)
  p_user_id TEXT DEFAULT NULL,     -- Legacy parameter, not used (kept for compatibility)
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_user_role TEXT DEFAULT '',
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_revenue_display TEXT,
  revenue_growth_percentage NUMERIC,
  revenue_growth_display TEXT,
  profit_margin NUMERIC,
  profit_margin_display TEXT,
  profit_margin_growth_percentage NUMERIC,
  profit_margin_growth_display TEXT,
  target_achievement NUMERIC,
  target_achievement_display TEXT,
  target_period TEXT,
  pending_orders_count BIGINT,
  pending_orders_count_display TEXT,
  pending_orders_value NUMERIC,
  pending_orders_value_display TEXT
) AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_current_revenue NUMERIC;
  v_previous_revenue NUMERIC;
  v_revenue_growth NUMERIC;
  v_target_revenue NUMERIC;
  v_target_achievement NUMERIC;
  v_profit_margin NUMERIC;
  v_pending_count BIGINT;
  v_pending_value NUMERIC;
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
BEGIN
  -- Default to current year if not specified
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_month := p_month;

  -- Calculate date ranges based on filters
  IF v_month IS NOT NULL THEN
    -- Specific month
    v_start_date := make_date(v_year, v_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_prev_start_date := make_date(v_year - 1, v_month, 1);
    v_prev_end_date := (v_prev_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    -- Whole year
    v_start_date := make_date(v_year, 1, 1);
    v_end_date := make_date(v_year, 12, 31);
    v_prev_start_date := make_date(v_year - 1, 1, 1);
    v_prev_end_date := make_date(v_year - 1, 12, 31);
  END IF;

  -- Calculate current period revenue from sales_data
  SELECT COALESCE(SUM(sd.total_sales), 0)
  INTO v_current_revenue
  FROM sales_data sd
  WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
    AND sd.sales_date >= v_start_date
    AND sd.sales_date <= v_end_date;

  -- Calculate previous period revenue for growth calculation
  SELECT COALESCE(SUM(sd.total_sales), 0)
  INTO v_previous_revenue
  FROM sales_data sd
  WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
    AND sd.sales_date >= v_prev_start_date
    AND sd.sales_date <= v_prev_end_date;

  -- Calculate revenue growth percentage
  IF v_previous_revenue > 0 THEN
    v_revenue_growth := ((v_current_revenue - v_previous_revenue) / v_previous_revenue) * 100;
  ELSE
    v_revenue_growth := 0;
  END IF;

  -- Calculate profit margin from products (unit_price - cost_price) weighted by sales
  -- Note: This is an approximation based on average margins
  SELECT COALESCE(
    AVG(
      CASE 
        WHEN p.unit_price > 0 AND p.cost_price IS NOT NULL THEN
          ((p.unit_price - p.cost_price) / p.unit_price) * 100
        ELSE NULL
      END
    ), 0
  )
  INTO v_profit_margin
  FROM sales_data sd
  JOIN products p ON p.sku = sd.sku AND p.brand_id = sd.brand_id
  WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
    AND sd.sales_date >= v_start_date
    AND sd.sales_date <= v_end_date;

  -- Calculate target achievement from sales_targets
  SELECT COALESCE(SUM(st.target_revenue), 0)
  INTO v_target_revenue
  FROM sales_targets st
  WHERE (p_brand_id IS NULL OR st.brand_id = p_brand_id)
    AND st.target_period >= v_start_date
    AND st.target_period <= v_end_date;

  IF v_target_revenue > 0 THEN
    v_target_achievement := (v_current_revenue / v_target_revenue) * 100;
  ELSE
    v_target_achievement := 0;
  END IF;

  -- Calculate pending orders count and value from orders table
  SELECT 
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(o.total_amount), 0)
  INTO v_pending_count, v_pending_value
  FROM orders o
  WHERE (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    AND o.order_status IN ('pending', 'confirmed', 'processing')
    AND o.order_date >= v_start_date
    AND o.order_date <= v_end_date;

  RETURN QUERY SELECT
    v_current_revenue,
    '$' || TO_CHAR(v_current_revenue, 'FM999,999,999'),
    ROUND(v_revenue_growth, 1),
    CASE WHEN v_revenue_growth >= 0 THEN '+' ELSE '' END || ROUND(v_revenue_growth, 1)::TEXT || '%',
    ROUND(v_profit_margin, 1),
    ROUND(v_profit_margin, 1)::TEXT || '%',
    0::NUMERIC, -- Profit margin growth (would need previous period calculation)
    '+0%',
    ROUND(v_target_achievement, 1),
    ROUND(v_target_achievement, 1)::TEXT || '%',
    CASE 
      WHEN v_month IS NOT NULL THEN TO_CHAR(v_start_date, 'Month YYYY')
      ELSE 'Year ' || v_year::TEXT
    END,
    v_pending_count,
    v_pending_count::TEXT,
    v_pending_value,
    '$' || TO_CHAR(v_pending_value, 'FM999,999,999');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sales_dashboard_metrics IS 'Returns KPI metrics for the Brand Dashboard: Total Revenue, Growth, Profit Margin, Target Achievement, Pending Orders';


-- ================================================
-- 2. GET MONTHLY YOY REVENUE
-- ================================================
-- Returns monthly revenue for current year vs previous year
-- Used for Revenue Comparison chart

CREATE OR REPLACE FUNCTION get_monthly_yoy_revenue(
  p_table_suffix TEXT DEFAULT '',
  p_user_id TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_user_role TEXT DEFAULT '',
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  month INTEGER,
  month_name TEXT,
  current_year_revenue NUMERIC,
  previous_year_revenue NUMERIC,
  growth_percentage NUMERIC
) AS $$
DECLARE
  v_year INTEGER;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) AS month_num
  ),
  current_year_sales AS (
    SELECT 
      EXTRACT(MONTH FROM sd.sales_date)::INTEGER AS month_num,
      COALESCE(SUM(sd.total_sales), 0) AS revenue
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND EXTRACT(YEAR FROM sd.sales_date) = v_year
    GROUP BY EXTRACT(MONTH FROM sd.sales_date)
  ),
  previous_year_sales AS (
    SELECT 
      EXTRACT(MONTH FROM sd.sales_date)::INTEGER AS month_num,
      COALESCE(SUM(sd.total_sales), 0) AS revenue
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND EXTRACT(YEAR FROM sd.sales_date) = v_year - 1
    GROUP BY EXTRACT(MONTH FROM sd.sales_date)
  )
  SELECT 
    m.month_num,
    TO_CHAR(make_date(v_year, m.month_num, 1), 'Mon'),
    COALESCE(cy.revenue, 0),
    COALESCE(py.revenue, 0),
    CASE 
      WHEN COALESCE(py.revenue, 0) > 0 THEN
        ROUND(((COALESCE(cy.revenue, 0) - py.revenue) / py.revenue) * 100, 1)
      ELSE 0
    END
  FROM months m
  LEFT JOIN current_year_sales cy ON cy.month_num = m.month_num
  LEFT JOIN previous_year_sales py ON py.month_num = m.month_num
  ORDER BY m.month_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_monthly_yoy_revenue IS 'Returns monthly revenue comparison (current year vs previous year) for Revenue Comparison chart';


-- ================================================
-- 3. GET SEASONAL ANALYSIS
-- ================================================
-- Returns quarterly revenue with YoY growth
-- Used for Seasonal Analysis chart

CREATE OR REPLACE FUNCTION get_seasonal_analysis(
  p_table_suffix TEXT DEFAULT '',
  p_user_id TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_user_role TEXT DEFAULT '',
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  quarter TEXT,
  quarter_num INTEGER,
  revenue NUMERIC,
  revenue_display TEXT,
  previous_year_revenue NUMERIC,
  growth_percentage NUMERIC,
  growth_display TEXT,
  season TEXT
) AS $$
DECLARE
  v_year INTEGER;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

  RETURN QUERY
  WITH quarters AS (
    SELECT 1 AS q_num, 'Q1' AS q_name, 'Winter' AS season_name UNION ALL
    SELECT 2, 'Q2', 'Spring' UNION ALL
    SELECT 3, 'Q3', 'Summer' UNION ALL
    SELECT 4, 'Q4', 'Fall'
  ),
  current_year_sales AS (
    SELECT 
      EXTRACT(QUARTER FROM sd.sales_date)::INTEGER AS q_num,
      COALESCE(SUM(sd.total_sales), 0) AS revenue
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND EXTRACT(YEAR FROM sd.sales_date) = v_year
    GROUP BY EXTRACT(QUARTER FROM sd.sales_date)
  ),
  previous_year_sales AS (
    SELECT 
      EXTRACT(QUARTER FROM sd.sales_date)::INTEGER AS q_num,
      COALESCE(SUM(sd.total_sales), 0) AS revenue
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND EXTRACT(YEAR FROM sd.sales_date) = v_year - 1
    GROUP BY EXTRACT(QUARTER FROM sd.sales_date)
  )
  SELECT 
    q.q_name,
    q.q_num,
    COALESCE(cy.revenue, 0),
    '$' || TO_CHAR(COALESCE(cy.revenue, 0) / 1000, 'FM999,999') || 'k',
    COALESCE(py.revenue, 0),
    CASE 
      WHEN COALESCE(py.revenue, 0) > 0 THEN
        ROUND(((COALESCE(cy.revenue, 0) - py.revenue) / py.revenue) * 100, 1)
      ELSE 0
    END,
    CASE 
      WHEN COALESCE(py.revenue, 0) > 0 THEN
        CASE 
          WHEN COALESCE(cy.revenue, 0) >= py.revenue THEN '+'
          ELSE ''
        END || ROUND(((COALESCE(cy.revenue, 0) - py.revenue) / py.revenue) * 100, 1)::TEXT || '%'
      ELSE '+0.0%'
    END,
    q.season_name
  FROM quarters q
  LEFT JOIN current_year_sales cy ON cy.q_num = q.q_num
  LEFT JOIN previous_year_sales py ON py.q_num = q.q_num
  ORDER BY q.q_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_seasonal_analysis IS 'Returns quarterly revenue with YoY growth for Seasonal Analysis chart';


-- ================================================
-- 4. GET SALES BY CATEGORY
-- ================================================
-- Returns revenue grouped by product category
-- Used for Sales by Category chart

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
    COALESCE(sd.product_category, p.product_category, 'Uncategorized') AS cat,
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
-- Returns top SKUs with revenue, growth, and stock-on-hand
-- Used for Top 10 SKUs table

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
    cps.prod_name,
    cps.cntry,
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
    COALESCE(ps.category, 'Uncategorized')
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
-- Returns revenue grouped by territory/region
-- Used for Top Regions chart

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
    cs.terr,
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
    COALESCE(cs.countries_list, '')
  FROM current_sales cs
  LEFT JOIN previous_sales ps ON ps.terr = cs.terr
  ORDER BY cs.rev DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sales_by_territory IS 'Returns revenue grouped by territory/region with YoY growth for Top Regions chart';


-- ================================================
-- 7. GET TOP CUSTOMERS BY REVENUE
-- ================================================
-- Returns top customers/retailers by revenue
-- Used for Top Customers chart

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
    cs.cust_name,
    cs.dist_name,
    cs.rev,
    cs.ord_count,
    ps.rev,
    NULL::UUID,  -- customer_id not directly available in sales_data
    cs.dist_id
  FROM current_sales cs
  LEFT JOIN previous_sales ps ON ps.cust_name = cs.cust_name
  ORDER BY cs.rev DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_customers_by_revenue IS 'Returns top customers/retailers by revenue for Top Customers chart';


-- ================================================
-- 8. FIX TARGET VS ACTUAL VIEW (CONDITIONAL)
-- ================================================
-- Recreate view to use sales_data instead of orders for actuals
-- Only creates the view if sales_targets table exists
-- NOTE: If sales_targets doesn't exist, run migration 015_create_sales_targets_table.sql first

DO $$
BEGIN
  -- Check if sales_targets table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_targets') THEN
    -- Drop existing view if it exists
    DROP MATERIALIZED VIEW IF EXISTS target_vs_actual_view CASCADE;
    
    -- Create the materialized view
    CREATE MATERIALIZED VIEW target_vs_actual_view AS
    SELECT 
      st.brand_id,
      st.sku,
      st.target_period,
      st.period_type::TEXT,
      st.target_quantity,
      st.target_revenue,
      -- Actual quantity and revenue from sales_data
      COALESCE(
        (
          SELECT SUM(sd.quantity_sold)
          FROM sales_data sd
          WHERE sd.brand_id = st.brand_id
            AND sd.sku = st.sku
            AND DATE_TRUNC(
              CASE st.period_type::TEXT
                WHEN 'monthly' THEN 'month'
                WHEN 'quarterly' THEN 'quarter'
                WHEN 'yearly' THEN 'year'
              END,
              sd.sales_date
            ) = DATE_TRUNC(
              CASE st.period_type::TEXT
                WHEN 'monthly' THEN 'month'
                WHEN 'quarterly' THEN 'quarter'
                WHEN 'yearly' THEN 'year'
              END,
              st.target_period
            )
        ), 0
      ) AS actual_quantity,
      COALESCE(
        (
          SELECT SUM(sd.total_sales)
          FROM sales_data sd
          WHERE sd.brand_id = st.brand_id
            AND sd.sku = st.sku
            AND DATE_TRUNC(
              CASE st.period_type::TEXT
                WHEN 'monthly' THEN 'month'
                WHEN 'quarterly' THEN 'quarter'
                WHEN 'yearly' THEN 'year'
              END,
              sd.sales_date
            ) = DATE_TRUNC(
              CASE st.period_type::TEXT
                WHEN 'monthly' THEN 'month'
                WHEN 'quarterly' THEN 'quarter'
                WHEN 'yearly' THEN 'year'
              END,
              st.target_period
            )
        ), 0
      ) AS actual_revenue,
      -- Quantity variance percentage
      CASE 
        WHEN st.target_quantity > 0 THEN
          ((COALESCE(
            (
              SELECT SUM(sd.quantity_sold)
              FROM sales_data sd
              WHERE sd.brand_id = st.brand_id
                AND sd.sku = st.sku
                AND DATE_TRUNC(
                  CASE st.period_type::TEXT
                    WHEN 'monthly' THEN 'month'
                    WHEN 'quarterly' THEN 'quarter'
                    WHEN 'yearly' THEN 'year'
                  END,
                  sd.sales_date
                ) = DATE_TRUNC(
                  CASE st.period_type::TEXT
                    WHEN 'monthly' THEN 'month'
                    WHEN 'quarterly' THEN 'quarter'
                    WHEN 'yearly' THEN 'year'
                  END,
                  st.target_period
                )
            ), 0
          ) - st.target_quantity) / st.target_quantity * 100)
        ELSE NULL
      END AS quantity_variance_percent,
      -- Revenue variance percentage
      CASE 
        WHEN st.target_revenue > 0 THEN
          ((COALESCE(
            (
              SELECT SUM(sd.total_sales)
              FROM sales_data sd
              WHERE sd.brand_id = st.brand_id
                AND sd.sku = st.sku
                AND DATE_TRUNC(
                  CASE st.period_type::TEXT
                    WHEN 'monthly' THEN 'month'
                    WHEN 'quarterly' THEN 'quarter'
                    WHEN 'yearly' THEN 'year'
                  END,
                  sd.sales_date
                ) = DATE_TRUNC(
                  CASE st.period_type::TEXT
                    WHEN 'monthly' THEN 'month'
                    WHEN 'quarterly' THEN 'quarter'
                    WHEN 'yearly' THEN 'year'
                  END,
                  st.target_period
                )
            ), 0
          ) - st.target_revenue) / st.target_revenue * 100)
        ELSE NULL
      END AS revenue_variance_percent
    FROM sales_targets st;
    
    -- Create indexes on materialized view
    CREATE INDEX IF NOT EXISTS idx_target_vs_actual_brand_sku ON target_vs_actual_view(brand_id, sku);
    CREATE INDEX IF NOT EXISTS idx_target_vs_actual_period ON target_vs_actual_view(target_period);
    CREATE INDEX IF NOT EXISTS idx_target_vs_actual_period_type ON target_vs_actual_view(period_type);
    
    RAISE NOTICE 'Created target_vs_actual_view materialized view';
  ELSE
    RAISE NOTICE 'Skipping target_vs_actual_view: sales_targets table does not exist. Run migration 015_create_sales_targets_table.sql first.';
  END IF;
END $$;

-- Recreate refresh function (always create this, it will just fail gracefully if view doesn't exist)
CREATE OR REPLACE FUNCTION refresh_target_vs_actual_view()
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'target_vs_actual_view') THEN
    REFRESH MATERIALIZED VIEW target_vs_actual_view;
  ELSE
    RAISE NOTICE 'target_vs_actual_view does not exist, skipping refresh';
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ================================================
-- 9. ADD INDEXES FOR DASHBOARD PERFORMANCE
-- ================================================

-- Additional indexes for faster dashboard queries
CREATE INDEX IF NOT EXISTS idx_sales_data_year_month 
  ON sales_data(EXTRACT(YEAR FROM sales_date), EXTRACT(MONTH FROM sales_date));

CREATE INDEX IF NOT EXISTS idx_sales_data_territory 
  ON sales_data(territory);

CREATE INDEX IF NOT EXISTS idx_sales_data_retailer_name 
  ON sales_data(retailer_name);

CREATE INDEX IF NOT EXISTS idx_sales_data_brand_year 
  ON sales_data(brand_id, EXTRACT(YEAR FROM sales_date));


-- ================================================
-- 10. GRANT PERMISSIONS
-- ================================================

GRANT EXECUTE ON FUNCTION get_sales_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_yoy_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION get_seasonal_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products_by_revenue1 TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_territory TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_customers_by_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_target_vs_actual_view TO authenticated;

-- Grant SELECT on target_vs_actual_view only if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'target_vs_actual_view') THEN
    GRANT SELECT ON target_vs_actual_view TO authenticated;
    RAISE NOTICE 'Granted SELECT on target_vs_actual_view to authenticated';
  ELSE
    RAISE NOTICE 'Skipping GRANT on target_vs_actual_view: view does not exist';
  END IF;
END $$;

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately)
-- ================================================

-- Test get_sales_dashboard_metrics:
-- SELECT * FROM get_sales_dashboard_metrics(p_year := 2025, p_brand_id := 'your-brand-id'::uuid);

-- Test get_monthly_yoy_revenue:
-- SELECT * FROM get_monthly_yoy_revenue(p_year := 2025, p_brand_id := 'your-brand-id'::uuid);

-- Test get_seasonal_analysis:
-- SELECT * FROM get_seasonal_analysis(p_year := 2025, p_brand_id := 'your-brand-id'::uuid);

-- Test get_sales_by_category:
-- SELECT * FROM get_sales_by_category(p_year := 2025, p_brand_id := 'your-brand-id'::uuid);

-- Test get_top_products_by_revenue1:
-- SELECT * FROM get_top_products_by_revenue1(p_year := 2025, p_brand_id := 'your-brand-id'::uuid);

-- Test get_sales_by_territory:
-- SELECT * FROM get_sales_by_territory(p_year := 2025, p_brand_id := 'your-brand-id'::uuid);

-- Test get_top_customers_by_revenue:
-- SELECT * FROM get_top_customers_by_revenue(p_year := 2025, p_brand_id := 'your-brand-id'::uuid);

-- Test target_vs_actual_view:
-- SELECT * FROM target_vs_actual_view LIMIT 10;

