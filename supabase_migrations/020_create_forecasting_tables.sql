-- ================================================
-- MIGRATION 020: CREATE FORECASTING TABLES
-- ================================================
-- Description: Create demand_forecasts table and forecast_inputs view
-- Date: November 12, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE DEMAND_FORECASTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  sku varchar(100) NOT NULL,
  forecast_period_start date NOT NULL,
  forecast_period_end date NOT NULL,
  forecasted_quantity numeric(10,2) CHECK (forecasted_quantity >= 0),
  forecasted_revenue numeric(10,2) CHECK (forecasted_revenue >= 0),
  confidence_level numeric(5,2) CHECK (confidence_level >= 0 AND confidence_level <= 100),
  algorithm_version varchar(50),
  input_data_snapshot jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- ================================================
-- 2. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_brand_id ON demand_forecasts(brand_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_sku ON demand_forecasts(sku);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_period ON demand_forecasts(forecast_period_start, forecast_period_end);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_brand_sku_period ON demand_forecasts(brand_id, sku, forecast_period_start);

-- ================================================
-- 3. CREATE RLS POLICIES
-- ================================================

ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;

-- Users can view forecasts for their brand
CREATE POLICY "Users can view forecasts for their brand"
  ON demand_forecasts
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

-- Users can insert forecasts for their brand
CREATE POLICY "Users can insert forecasts for their brand"
  ON demand_forecasts
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

-- Users can update forecasts for their brand
CREATE POLICY "Users can update forecasts for their brand"
  ON demand_forecasts
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

-- Users can delete forecasts for their brand
CREATE POLICY "Users can delete forecasts for their brand"
  ON demand_forecasts
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
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_demand_forecasts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_demand_forecasts_updated_at ON demand_forecasts;
CREATE TRIGGER update_demand_forecasts_updated_at
  BEFORE UPDATE ON demand_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION update_demand_forecasts_updated_at();

-- ================================================
-- 5. CREATE FORECAST_INPUTS VIEW
-- ================================================

CREATE OR REPLACE VIEW forecast_inputs AS
SELECT 
  p.brand_id,
  p.sku,
  DATE_TRUNC('month', o.order_date)::date as sales_month,
  SUM((item->>'quantity')::integer) as quantity_sold,
  SUM((item->>'total')::numeric) as revenue,
  COUNT(DISTINCT o.id) as order_count,
  p.quantity_in_stock,
  p.reorder_level,
  COALESCE(
    (SELECT SUM(po.total_amount)
     FROM purchase_orders po
     WHERE po.brand_id = p.brand_id
       AND po.po_status IN ('ordered', 'received')
       AND po.expected_delivery_date >= CURRENT_DATE
    ), 0
  ) as pending_po_value
FROM products p
LEFT JOIN orders o ON o.brand_id = p.brand_id
LEFT JOIN LATERAL jsonb_array_elements(o.items) AS item ON (item->>'sku') = p.sku
WHERE o.order_date >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY p.brand_id, p.sku, DATE_TRUNC('month', o.order_date), p.quantity_in_stock, p.reorder_level;

COMMIT;

-- Verification queries (run separately)
-- SELECT * FROM demand_forecasts LIMIT 5;
-- SELECT * FROM forecast_inputs LIMIT 5;


