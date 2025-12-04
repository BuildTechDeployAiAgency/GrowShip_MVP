-- ================================================
-- Migration: Upgrade Sales Targets Table
-- ================================================
-- Description: Upgrade sales_targets to support broader sales scenarios:
--   - Brand-level targets (global)
--   - Distributor-level targets
--   - Region/Country-based targets
--   - Campaign targets
--   - Currency support
-- Date: 2025-12-04
-- Author: GrowShip MVP Team
--
-- This migration:
-- 1. Makes 'sku' nullable (allows non-SKU targets)
-- 2. Adds dimension columns: distributor_id, country, territory, campaign_id
-- 3. Adds currency and notes fields
-- 4. Updates constraints and indexes
-- 5. Recreates target_vs_actual_view with enhanced logic
-- ================================================

BEGIN;

-- ================================================
-- 1. ALTER SALES_TARGETS TABLE
-- ================================================

-- Make SKU nullable to allow brand-level or aggregate targets
ALTER TABLE sales_targets ALTER COLUMN sku DROP NOT NULL;

-- Add distributor_id column (nullable FK to distributors)
ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS distributor_id UUID REFERENCES distributors(id) ON DELETE SET NULL;

-- Add country column for country-level targets
ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS country TEXT;

-- Add territory/region column for regional targets
ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS territory TEXT;

-- Add campaign_id column for marketing campaign targets (text for flexibility)
ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS campaign_id TEXT;

-- Add currency column (defaults to USD)
ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add notes column for metadata/comments
ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add target_name column for display purposes (optional descriptive name)
ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS target_name VARCHAR(255);

-- Add target_type to differentiate between target categories
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'target_scope_type') THEN
    CREATE TYPE target_scope_type AS ENUM ('brand', 'distributor', 'sku', 'region', 'campaign');
  END IF;
END $$;

ALTER TABLE sales_targets ADD COLUMN IF NOT EXISTS target_scope target_scope_type DEFAULT 'sku';


-- ================================================
-- 2. UPDATE CONSTRAINTS
-- ================================================

-- Drop the old unique constraint that required SKU
ALTER TABLE sales_targets DROP CONSTRAINT IF EXISTS sales_targets_brand_id_sku_target_period_period_type_key;

-- Create a new flexible unique index using COALESCE to handle NULLs
-- This prevents duplicate targets for the same combination of dimensions
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_targets_unique_dimensions 
  ON sales_targets (
    brand_id, 
    COALESCE(sku, ''), 
    COALESCE(distributor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(country, ''),
    COALESCE(territory, ''),
    COALESCE(campaign_id, ''),
    target_period, 
    period_type
  );


-- ================================================
-- 3. ADD NEW INDEXES FOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_sales_targets_distributor_id ON sales_targets(distributor_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_country ON sales_targets(country);
CREATE INDEX IF NOT EXISTS idx_sales_targets_territory ON sales_targets(territory);
CREATE INDEX IF NOT EXISTS idx_sales_targets_campaign_id ON sales_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_target_scope ON sales_targets(target_scope);
CREATE INDEX IF NOT EXISTS idx_sales_targets_brand_distributor ON sales_targets(brand_id, distributor_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_brand_territory ON sales_targets(brand_id, territory);


-- ================================================
-- 4. UPDATE RLS POLICIES FOR NEW COLUMNS
-- ================================================
-- The existing RLS policies are based on brand_id which is still the core filter
-- Distributor users should also be able to see targets assigned to them

-- Drop and recreate SELECT policy to include distributor visibility
DROP POLICY IF EXISTS "Users can view targets for their brand" ON sales_targets;

CREATE POLICY "Users can view targets for their brand or distributor"
  ON sales_targets
  FOR SELECT
  USING (
    -- Brand users can see all targets for their brand
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    -- Distributor users can see targets assigned to their distributor
    OR distributor_id IN (
      SELECT distributor_id FROM user_profiles
      WHERE user_id = auth.uid()
      AND distributor_id IS NOT NULL
    )
    -- Super admins can see all
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );


-- ================================================
-- 5. RECREATE TARGET VS ACTUAL VIEW
-- ================================================
-- The view now supports multiple target dimensions:
-- - SKU-level targets (existing)
-- - Distributor-level targets
-- - Brand-level aggregate targets
-- - Territory/Country targets

DROP MATERIALIZED VIEW IF EXISTS target_vs_actual_view CASCADE;

CREATE MATERIALIZED VIEW target_vs_actual_view AS
WITH target_actuals AS (
  SELECT 
    st.id AS target_id,
    st.brand_id,
    st.sku,
    st.distributor_id,
    st.country,
    st.territory,
    st.campaign_id,
    st.target_scope,
    st.target_name,
    st.target_period,
    st.period_type::TEXT,
    st.target_quantity,
    st.target_revenue,
    st.currency,
    -- Calculate actual values based on target scope
    COALESCE(
      (
        SELECT SUM(sd.quantity_sold)
        FROM sales_data sd
        WHERE sd.brand_id = st.brand_id
          -- Match SKU if specified
          AND (st.sku IS NULL OR sd.sku = st.sku)
          -- Match distributor if specified
          AND (st.distributor_id IS NULL OR sd.distributor_id = st.distributor_id)
          -- Match country if specified
          AND (st.country IS NULL OR sd.territory_country = st.country OR sd.country = st.country)
          -- Match territory if specified
          AND (st.territory IS NULL OR sd.territory = st.territory)
          -- Match time period
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
          -- Match SKU if specified
          AND (st.sku IS NULL OR sd.sku = st.sku)
          -- Match distributor if specified
          AND (st.distributor_id IS NULL OR sd.distributor_id = st.distributor_id)
          -- Match country if specified
          AND (st.country IS NULL OR sd.territory_country = st.country OR sd.country = st.country)
          -- Match territory if specified
          AND (st.territory IS NULL OR sd.territory = st.territory)
          -- Match time period
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
    ) AS actual_revenue
  FROM sales_targets st
)
SELECT 
  target_id,
  brand_id,
  sku,
  distributor_id,
  country,
  territory,
  campaign_id,
  target_scope,
  target_name,
  target_period,
  period_type,
  target_quantity,
  target_revenue,
  currency,
  actual_quantity,
  actual_revenue,
  -- Quantity variance percentage
  CASE 
    WHEN target_quantity > 0 THEN
      ROUND(((actual_quantity - target_quantity) / target_quantity * 100), 2)
    ELSE NULL
  END AS quantity_variance_percent,
  -- Revenue variance percentage
  CASE 
    WHEN target_revenue > 0 THEN
      ROUND(((actual_revenue - target_revenue) / target_revenue * 100), 2)
    ELSE NULL
  END AS revenue_variance_percent,
  -- Achievement percentage (for display)
  CASE 
    WHEN target_revenue > 0 THEN
      ROUND((actual_revenue / target_revenue * 100), 1)
    ELSE NULL
  END AS revenue_achievement_percent,
  CASE 
    WHEN target_quantity > 0 THEN
      ROUND((actual_quantity / target_quantity * 100), 1)
    ELSE NULL
  END AS quantity_achievement_percent
FROM target_actuals;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_target_vs_actual_v2_brand_id ON target_vs_actual_view(brand_id);
CREATE INDEX IF NOT EXISTS idx_target_vs_actual_v2_sku ON target_vs_actual_view(sku);
CREATE INDEX IF NOT EXISTS idx_target_vs_actual_v2_distributor ON target_vs_actual_view(distributor_id);
CREATE INDEX IF NOT EXISTS idx_target_vs_actual_v2_period ON target_vs_actual_view(target_period);
CREATE INDEX IF NOT EXISTS idx_target_vs_actual_v2_scope ON target_vs_actual_view(target_scope);
CREATE INDEX IF NOT EXISTS idx_target_vs_actual_v2_territory ON target_vs_actual_view(territory);


-- ================================================
-- 6. UPDATE REFRESH FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION refresh_target_vs_actual_view()
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'target_vs_actual_view') THEN
    REFRESH MATERIALIZED VIEW target_vs_actual_view;
    RAISE NOTICE 'Refreshed target_vs_actual_view';
  ELSE
    RAISE NOTICE 'target_vs_actual_view does not exist, skipping refresh';
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ================================================
-- 7. CREATE HELPER FUNCTION FOR TARGET SUMMARY
-- ================================================
-- This function returns aggregated target performance by scope

CREATE OR REPLACE FUNCTION get_target_summary(
  p_brand_id UUID DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_target_scope TEXT DEFAULT NULL
)
RETURNS TABLE (
  target_scope TEXT,
  total_targets BIGINT,
  total_target_revenue NUMERIC,
  total_actual_revenue NUMERIC,
  overall_achievement_percent NUMERIC,
  on_track_count BIGINT,
  behind_count BIGINT,
  ahead_count BIGINT
) AS $$
DECLARE
  v_year INTEGER;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_start_date := make_date(v_year, 1, 1);
  v_end_date := make_date(v_year, 12, 31);

  RETURN QUERY
  SELECT 
    tv.target_scope::TEXT,
    COUNT(*)::BIGINT AS total_targets,
    COALESCE(SUM(tv.target_revenue), 0) AS total_target_revenue,
    COALESCE(SUM(tv.actual_revenue), 0) AS total_actual_revenue,
    CASE 
      WHEN SUM(tv.target_revenue) > 0 THEN
        ROUND((SUM(tv.actual_revenue) / SUM(tv.target_revenue) * 100), 1)
      ELSE 0
    END AS overall_achievement_percent,
    COUNT(*) FILTER (WHERE tv.revenue_achievement_percent BETWEEN 90 AND 110)::BIGINT AS on_track_count,
    COUNT(*) FILTER (WHERE tv.revenue_achievement_percent < 90)::BIGINT AS behind_count,
    COUNT(*) FILTER (WHERE tv.revenue_achievement_percent > 110)::BIGINT AS ahead_count
  FROM target_vs_actual_view tv
  WHERE (p_brand_id IS NULL OR tv.brand_id = p_brand_id)
    AND tv.target_period >= v_start_date
    AND tv.target_period <= v_end_date
    AND (p_target_scope IS NULL OR tv.target_scope::TEXT = p_target_scope)
  GROUP BY tv.target_scope;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_target_summary IS 'Returns aggregated target performance summary grouped by target scope';


-- ================================================
-- 8. BACKFILL TARGET_SCOPE FOR EXISTING RECORDS
-- ================================================
-- Set target_scope = 'sku' for all existing records that have a SKU

UPDATE sales_targets
SET target_scope = 'sku'
WHERE sku IS NOT NULL AND target_scope IS NULL;


-- ================================================
-- 9. GRANT PERMISSIONS
-- ================================================

GRANT EXECUTE ON FUNCTION get_target_summary TO authenticated;
GRANT SELECT ON target_vs_actual_view TO authenticated;


-- ================================================
-- 10. ADD COLUMN COMMENTS
-- ================================================

COMMENT ON COLUMN sales_targets.distributor_id IS 'Optional: FK to distributors table for distributor-specific targets';
COMMENT ON COLUMN sales_targets.country IS 'Optional: Country code or name for country-level targets';
COMMENT ON COLUMN sales_targets.territory IS 'Optional: Territory/region name for regional targets';
COMMENT ON COLUMN sales_targets.campaign_id IS 'Optional: Campaign identifier for marketing campaign targets';
COMMENT ON COLUMN sales_targets.currency IS 'Currency code for revenue targets (default USD)';
COMMENT ON COLUMN sales_targets.notes IS 'Optional notes or metadata about the target';
COMMENT ON COLUMN sales_targets.target_name IS 'Optional display name for the target';
COMMENT ON COLUMN sales_targets.target_scope IS 'Categorizes the target: brand, distributor, sku, region, or campaign';

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately)
-- ================================================

-- Check new columns were added:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'sales_targets'
-- ORDER BY ordinal_position;

-- Test the updated view:
-- SELECT * FROM target_vs_actual_view LIMIT 10;

-- Test the summary function:
-- SELECT * FROM get_target_summary(p_year := 2025);

