-- ================================================
-- MIGRATION 015: CREATE SALES TARGETS TABLE
-- ================================================
-- Description: Create sales_targets table for target vs actual tracking
-- Date: November 12, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE PERIOD TYPE ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'target_period_type') THEN
    CREATE TYPE target_period_type AS ENUM ('monthly', 'quarterly', 'yearly');
  END IF;
END $$;

-- ================================================
-- 2. CREATE SALES_TARGETS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  sku varchar(100) NOT NULL,
  target_period date NOT NULL,
  period_type target_period_type NOT NULL DEFAULT 'monthly',
  target_quantity numeric(10,2) CHECK (target_quantity >= 0),
  target_revenue numeric(10,2) CHECK (target_revenue >= 0),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, sku, target_period, period_type)
);

-- ================================================
-- 3. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_sales_targets_brand_id ON sales_targets(brand_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_sku ON sales_targets(sku);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period ON sales_targets(target_period);
CREATE INDEX IF NOT EXISTS idx_sales_targets_brand_sku_period ON sales_targets(brand_id, sku, target_period);

-- ================================================
-- 4. CREATE RLS POLICIES
-- ================================================

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

-- Users can view targets for their brand
CREATE POLICY "Users can view targets for their brand"
  ON sales_targets
  FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- Users can insert targets for their brand
CREATE POLICY "Users can insert targets for their brand"
  ON sales_targets
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- Users can update targets for their brand
CREATE POLICY "Users can update targets for their brand"
  ON sales_targets
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- Users can delete targets for their brand
CREATE POLICY "Users can delete targets for their brand"
  ON sales_targets
  FOR DELETE
  USING (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- ================================================
-- 5. CREATE TRIGGER FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_sales_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sales_targets_updated_at ON sales_targets;
CREATE TRIGGER update_sales_targets_updated_at
  BEFORE UPDATE ON sales_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_targets_updated_at();

-- ================================================
-- 6. CREATE MATERIALIZED VIEW FOR TARGET VS ACTUAL
-- ================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS target_vs_actual_view AS
SELECT 
  st.brand_id,
  st.sku,
  st.target_period,
  st.period_type,
  st.target_quantity,
  st.target_revenue,
  COALESCE(
    SUM(
      CASE 
        WHEN st.period_type = 'monthly' THEN
          (item->>'quantity')::numeric
        WHEN st.period_type = 'quarterly' THEN
          (item->>'quantity')::numeric
        WHEN st.period_type = 'yearly' THEN
          (item->>'quantity')::numeric
        ELSE 0
      END
    ), 0
  ) as actual_quantity,
  COALESCE(
    SUM(
      CASE 
        WHEN st.period_type = 'monthly' THEN
          (item->>'total')::numeric
        WHEN st.period_type = 'quarterly' THEN
          (item->>'total')::numeric
        WHEN st.period_type = 'yearly' THEN
          (item->>'total')::numeric
        ELSE 0
      END
    ), 0
  ) as actual_revenue,
  CASE 
    WHEN st.target_quantity > 0 THEN
      ((COALESCE(SUM((item->>'quantity')::numeric), 0) - st.target_quantity) / st.target_quantity * 100)
    ELSE NULL
  END as quantity_variance_percent,
  CASE 
    WHEN st.target_revenue > 0 THEN
      ((COALESCE(SUM((item->>'total')::numeric), 0) - st.target_revenue) / st.target_revenue * 100)
    ELSE NULL
  END as revenue_variance_percent
FROM sales_targets st
LEFT JOIN orders o ON o.brand_id = st.brand_id
  AND DATE_TRUNC(
    CASE st.period_type
      WHEN 'monthly' THEN 'month'
      WHEN 'quarterly' THEN 'quarter'
      WHEN 'yearly' THEN 'year'
    END,
    o.order_date
  ) = DATE_TRUNC(
    CASE st.period_type
      WHEN 'monthly' THEN 'month'
      WHEN 'quarterly' THEN 'quarter'
      WHEN 'yearly' THEN 'year'
    END,
    st.target_period
  )
LEFT JOIN LATERAL jsonb_array_elements(o.items) AS item ON (item->>'sku') = st.sku
GROUP BY st.id, st.brand_id, st.sku, st.target_period, st.period_type, st.target_quantity, st.target_revenue;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_target_vs_actual_brand_sku ON target_vs_actual_view(brand_id, sku);
CREATE INDEX IF NOT EXISTS idx_target_vs_actual_period ON target_vs_actual_view(target_period);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_target_vs_actual_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW target_vs_actual_view;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Verification queries (run separately)
-- SELECT * FROM sales_targets LIMIT 5;
-- SELECT * FROM target_vs_actual_view LIMIT 5;


