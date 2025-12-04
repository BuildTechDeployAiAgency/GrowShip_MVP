-- ================================================
-- Migration: Update Territory Analytics RPCs
-- ================================================
-- Description: Update dashboard RPC functions to use normalized territory/region tables
-- Date: 2025-12-08
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. GET SALES BY TERRITORY (Updated)
-- ================================================
-- Uses normalized territories table for proper grouping

DROP FUNCTION IF EXISTS get_sales_by_territory(TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID);

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
  territory_id UUID,
  region_name TEXT,
  region_id UUID,
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
      COALESCE(t.name, sd.territory, 'Unknown')::TEXT AS terr_name,
      sd.territory_id AS terr_id,
      r.name::TEXT AS reg_name,
      r.id AS reg_id,
      COALESCE(SUM(sd.total_sales), 0) AS rev,
      COUNT(DISTINCT COALESCE(sd.territory_country, '')) AS cnt_count,
      STRING_AGG(DISTINCT COALESCE(sd.territory_country, ''), ', ' ORDER BY COALESCE(sd.territory_country, ''))::TEXT AS countries_list
    FROM sales_data sd
    LEFT JOIN territories t ON sd.territory_id = t.id
    LEFT JOIN regions r ON sd.region_id = r.id
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_start_date
      AND sd.sales_date <= v_end_date
    GROUP BY COALESCE(t.name, sd.territory, 'Unknown'), sd.territory_id, r.name, r.id
  ),
  previous_sales AS (
    SELECT 
      COALESCE(t.name, sd.territory, 'Unknown')::TEXT AS terr_name,
      sd.territory_id AS terr_id,
      COALESCE(SUM(sd.total_sales), 0) AS rev
    FROM sales_data sd
    LEFT JOIN territories t ON sd.territory_id = t.id
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_prev_start_date
      AND sd.sales_date <= v_prev_end_date
    GROUP BY COALESCE(t.name, sd.territory, 'Unknown'), sd.territory_id
  )
  SELECT 
    cs.terr_name,
    cs.terr_id,
    cs.reg_name,
    cs.reg_id,
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
  LEFT JOIN previous_sales ps ON (
    (cs.terr_id IS NOT NULL AND ps.terr_id = cs.terr_id) OR
    (cs.terr_id IS NULL AND ps.terr_id IS NULL AND cs.terr_name = ps.terr_name)
  )
  ORDER BY cs.rev DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sales_by_territory IS 'Returns revenue grouped by normalized territory with region info and YoY growth';

-- ================================================
-- 2. GET SALES BY REGION (New)
-- ================================================
-- Aggregates sales at the region level

CREATE OR REPLACE FUNCTION get_sales_by_region(
  p_table_suffix TEXT DEFAULT '',
  p_user_id TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_user_role TEXT DEFAULT '',
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  region TEXT,
  region_id UUID,
  region_code TEXT,
  revenue NUMERIC,
  revenue_display TEXT,
  previous_revenue NUMERIC,
  revenue_growth_percentage NUMERIC,
  revenue_growth_display TEXT,
  territory_count BIGINT,
  country_count BIGINT
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
      COALESCE(r.name, 'Unknown')::TEXT AS reg_name,
      r.id AS reg_id,
      r.code::TEXT AS reg_code,
      COALESCE(SUM(sd.total_sales), 0) AS rev,
      COUNT(DISTINCT sd.territory_id) AS terr_count,
      COUNT(DISTINCT sd.territory_country) AS cnt_count
    FROM sales_data sd
    LEFT JOIN regions r ON sd.region_id = r.id
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_start_date
      AND sd.sales_date <= v_end_date
    GROUP BY COALESCE(r.name, 'Unknown'), r.id, r.code
  ),
  previous_sales AS (
    SELECT 
      COALESCE(r.name, 'Unknown')::TEXT AS reg_name,
      r.id AS reg_id,
      COALESCE(SUM(sd.total_sales), 0) AS rev
    FROM sales_data sd
    LEFT JOIN regions r ON sd.region_id = r.id
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
      AND sd.sales_date >= v_prev_start_date
      AND sd.sales_date <= v_prev_end_date
    GROUP BY COALESCE(r.name, 'Unknown'), r.id
  )
  SELECT 
    cs.reg_name,
    cs.reg_id,
    cs.reg_code,
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
    cs.terr_count,
    cs.cnt_count
  FROM current_sales cs
  LEFT JOIN previous_sales ps ON (
    (cs.reg_id IS NOT NULL AND ps.reg_id = cs.reg_id) OR
    (cs.reg_id IS NULL AND ps.reg_id IS NULL AND cs.reg_name = ps.reg_name)
  )
  ORDER BY cs.rev DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sales_by_region IS 'Returns revenue aggregated by region with YoY growth';

-- ================================================
-- 3. GET TERRITORY DETAILS (New)
-- ================================================
-- Returns detailed info about territories for admin management

CREATE OR REPLACE FUNCTION get_territory_details(
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  region_id UUID,
  region_name TEXT,
  region_code TEXT,
  countries TEXT[],
  is_active BOOLEAN,
  brand_id UUID,
  display_order INTEGER,
  total_revenue NUMERIC,
  distributor_count BIGINT,
  order_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.code::TEXT,
    t.name::TEXT,
    t.region_id,
    r.name::TEXT AS region_name,
    r.code::TEXT AS region_code,
    t.countries,
    t.is_active,
    t.brand_id,
    t.display_order,
    COALESCE(sales_agg.total_rev, 0) AS total_revenue,
    COALESCE(dist_agg.dist_count, 0) AS distributor_count,
    COALESCE(order_agg.order_count, 0) AS order_count
  FROM territories t
  LEFT JOIN regions r ON t.region_id = r.id
  LEFT JOIN (
    SELECT sd.territory_id, SUM(sd.total_sales) AS total_rev
    FROM sales_data sd
    WHERE (p_brand_id IS NULL OR sd.brand_id = p_brand_id)
    GROUP BY sd.territory_id
  ) sales_agg ON t.id = sales_agg.territory_id
  LEFT JOIN (
    SELECT d.territory_id, COUNT(*) AS dist_count
    FROM distributors d
    WHERE (p_brand_id IS NULL OR d.brand_id = p_brand_id)
    GROUP BY d.territory_id
  ) dist_agg ON t.id = dist_agg.territory_id
  LEFT JOIN (
    SELECT o.territory_id, COUNT(*) AS order_count
    FROM orders o
    WHERE (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    GROUP BY o.territory_id
  ) order_agg ON t.id = order_agg.territory_id
  WHERE t.brand_id IS NULL OR t.brand_id = p_brand_id
  ORDER BY t.display_order, t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_territory_details IS 'Returns territories with associated metrics for admin management';

-- ================================================
-- 4. GRANT PERMISSIONS
-- ================================================

GRANT EXECUTE ON FUNCTION get_sales_by_territory TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_region TO authenticated;
GRANT EXECUTE ON FUNCTION get_territory_details TO authenticated;

COMMIT;

