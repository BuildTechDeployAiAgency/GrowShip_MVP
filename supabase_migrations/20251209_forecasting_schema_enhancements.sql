-- ================================================
-- Migration: Forecasting Schema Enhancements
-- ================================================
-- Description: Comprehensive updates to support accurate demand forecasting:
--   1. Refactors forecast_inputs view to use sales_data (includes distributor uploads)
--   2. Adds logistics fields to products table (lead_time_days, safety_stock_days)
--   3. Creates supply_plans table for production planning
--   4. Creates inventory_optimization_metrics view for real-time insights
-- Date: 2025-12-09
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. ADD LOGISTICS FIELDS TO PRODUCTS TABLE (MUST BE FIRST)
-- ================================================
-- These fields are essential for inventory optimization:
--   - lead_time_days: Average days from PO creation to stock receipt
--   - safety_stock_days: Buffer stock expressed as days of supply
-- ================================================

-- Add lead_time_days column
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 14 CHECK (lead_time_days >= 0);

-- Add safety_stock_days column
ALTER TABLE products ADD COLUMN IF NOT EXISTS safety_stock_days INTEGER DEFAULT 7 CHECK (safety_stock_days >= 0);

-- Add comments
COMMENT ON COLUMN products.lead_time_days IS 'Average days from PO creation to stock receipt (supplier lead time)';
COMMENT ON COLUMN products.safety_stock_days IS 'Safety stock buffer expressed as days of demand coverage';


-- ================================================
-- 2. REFACTOR FORECAST_INPUTS VIEW
-- ================================================
-- Critical: The old view only aggregated from orders.items JSONB
-- New view sources from sales_data which includes:
--   - System orders (auto-synced via trigger)
--   - Distributor uploads (manual CSV imports)
-- ================================================

DROP VIEW IF EXISTS forecast_inputs;

CREATE OR REPLACE VIEW forecast_inputs AS
SELECT 
  sd.brand_id,
  sd.sku,
  sd.reporting_month AS sales_month,
  
  -- Sales metrics
  COALESCE(SUM(sd.quantity_sold), 0)::INTEGER AS quantity_sold,
  COALESCE(SUM(sd.total_sales), 0)::NUMERIC(14,2) AS revenue,
  COUNT(DISTINCT sd.id) AS transaction_count,
  
  -- Average unit price (for revenue forecasting)
  CASE 
    WHEN SUM(sd.quantity_sold) > 0 
    THEN (SUM(sd.total_sales) / SUM(sd.quantity_sold))::NUMERIC(10,2)
    ELSE 0
  END AS avg_unit_price,
  
  -- Product inventory snapshot (current state, not historical)
  p.quantity_in_stock,
  p.reorder_level,
  p.reorder_quantity,
  p.lead_time_days,
  p.safety_stock_days,
  
  -- Incoming supply (POs in transit)
  COALESCE(
    (SELECT SUM(pol.quantity)
     FROM purchase_order_lines pol
     JOIN purchase_orders po ON pol.purchase_order_id = po.id
     WHERE po.brand_id = sd.brand_id
       AND pol.sku = sd.sku
       AND po.po_status IN ('approved', 'ordered')
       AND po.expected_delivery_date >= CURRENT_DATE
    ), 0
  )::NUMERIC(10,2) AS pending_inbound_quantity,
  
  -- Sales channel breakdown (for segmented forecasting)
  sd.sales_channel,
  sd.territory_country,
  
  -- Data source tracking
  COUNT(DISTINCT sd.order_id) FILTER (WHERE sd.order_id IS NOT NULL) AS system_order_count,
  COUNT(DISTINCT sd.id) FILTER (WHERE sd.order_id IS NULL) AS external_upload_count

FROM sales_data sd
LEFT JOIN products p ON p.brand_id = sd.brand_id AND p.sku = sd.sku
WHERE sd.reporting_month >= (CURRENT_DATE - INTERVAL '24 months')
GROUP BY 
  sd.brand_id, 
  sd.sku, 
  sd.reporting_month,
  sd.sales_channel,
  sd.territory_country,
  p.quantity_in_stock,
  p.reorder_level,
  p.reorder_quantity,
  p.lead_time_days,
  p.safety_stock_days;

-- Grant access
GRANT SELECT ON forecast_inputs TO authenticated;

COMMENT ON VIEW forecast_inputs IS 'Aggregated sales data for forecasting - sources from sales_data table (includes both system orders and distributor uploads)';


-- ================================================
-- 3. CREATE SUPPLY_PLANS TABLE
-- ================================================
-- Stores actionable reorder recommendations based on forecasts
-- Lifecycle: draft -> approved -> converted_to_po
-- ================================================

CREATE TABLE IF NOT EXISTS supply_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  forecast_id UUID REFERENCES demand_forecasts(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255),
  
  -- Planning period (aligned with forecast period)
  planning_period_start DATE NOT NULL,
  planning_period_end DATE NOT NULL,
  
  -- Recommendations
  suggested_reorder_date DATE NOT NULL,
  suggested_reorder_quantity NUMERIC(10,2) NOT NULL CHECK (suggested_reorder_quantity > 0),
  estimated_cost NUMERIC(14,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Context for decision-making
  current_stock_level NUMERIC(10,2),
  forecasted_demand NUMERIC(10,2),
  incoming_supply NUMERIC(10,2),
  days_of_stock_remaining NUMERIC(10,2),
  reasoning TEXT,
  
  -- Workflow status
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'reviewed', 'approved', 'converted_to_po', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'normal' 
    CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  
  -- Converted PO reference
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_supply_plans_brand_id ON supply_plans(brand_id);
CREATE INDEX IF NOT EXISTS idx_supply_plans_forecast_id ON supply_plans(forecast_id);
CREATE INDEX IF NOT EXISTS idx_supply_plans_sku ON supply_plans(sku);
CREATE INDEX IF NOT EXISTS idx_supply_plans_status ON supply_plans(status);
CREATE INDEX IF NOT EXISTS idx_supply_plans_reorder_date ON supply_plans(suggested_reorder_date);
CREATE INDEX IF NOT EXISTS idx_supply_plans_priority ON supply_plans(priority);

-- Enable RLS
ALTER TABLE supply_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view supply plans for their brand"
ON supply_plans FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role_name = 'super_admin'
  )
);

CREATE POLICY "Users can manage supply plans for their brand"
ON supply_plans FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role_name IN ('brand_admin', 'brand_manager')
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role_name = 'super_admin'
  )
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_supply_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_supply_plans_updated_at ON supply_plans;
CREATE TRIGGER trigger_supply_plans_updated_at
  BEFORE UPDATE ON supply_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_supply_plans_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON supply_plans TO authenticated;

COMMENT ON TABLE supply_plans IS 'Actionable reorder recommendations generated from demand forecasts for production planning';


-- ================================================
-- 4. CREATE INVENTORY_OPTIMIZATION_METRICS VIEW
-- ================================================
-- Real-time view combining:
--   - Current stock levels
--   - Forecasted demand (during lead time)
--   - Incoming supply (approved/ordered POs)
-- Calculates reorder triggers based on safety stock rules
-- ================================================

CREATE OR REPLACE VIEW inventory_optimization_metrics AS
WITH 
-- Get forecasted demand for each SKU (sum of upcoming forecasts)
forecast_demand AS (
  SELECT 
    brand_id,
    sku,
    SUM(forecasted_quantity) AS total_forecasted_demand,
    AVG(confidence_level) AS avg_confidence,
    MIN(forecast_period_start) AS earliest_forecast_date,
    MAX(forecast_period_end) AS latest_forecast_date
  FROM demand_forecasts
  WHERE forecast_period_start <= CURRENT_DATE + INTERVAL '90 days'
    AND forecast_period_end >= CURRENT_DATE
  GROUP BY brand_id, sku
),

-- Get incoming supply from approved/ordered POs
incoming_supply AS (
  SELECT 
    po.brand_id,
    pol.sku,
    SUM(pol.quantity) AS total_incoming_quantity,
    MIN(po.expected_delivery_date) AS earliest_delivery,
    MAX(po.expected_delivery_date) AS latest_delivery
  FROM purchase_order_lines pol
  JOIN purchase_orders po ON pol.purchase_order_id = po.id
  WHERE po.po_status IN ('approved', 'ordered')
    AND po.expected_delivery_date >= CURRENT_DATE
  GROUP BY po.brand_id, pol.sku
),

-- Calculate average daily demand from last 90 days of sales
historical_demand AS (
  SELECT 
    brand_id,
    sku,
    COALESCE(SUM(quantity_sold) / NULLIF(COUNT(DISTINCT reporting_month) * 30, 0), 0) AS avg_daily_demand
  FROM sales_data
  WHERE sales_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY brand_id, sku
)

SELECT 
  p.id AS product_id,
  p.brand_id,
  p.sku,
  p.product_name,
  p.status AS product_status,
  
  -- Current inventory state
  COALESCE(p.quantity_in_stock, 0)::NUMERIC(10,2) AS current_stock,
  COALESCE(p.allocated_stock, 0)::NUMERIC(10,2) AS allocated_stock,
  (COALESCE(p.quantity_in_stock, 0) - COALESCE(p.allocated_stock, 0))::NUMERIC(10,2) AS available_stock,
  
  -- Product logistics parameters
  COALESCE(p.reorder_level, 0)::INTEGER AS reorder_level,
  COALESCE(p.reorder_quantity, 0)::INTEGER AS reorder_quantity,
  COALESCE(p.lead_time_days, 14)::INTEGER AS lead_time_days,
  COALESCE(p.safety_stock_days, 7)::INTEGER AS safety_stock_days,
  
  -- Incoming supply
  COALESCE(ins.total_incoming_quantity, 0)::NUMERIC(10,2) AS incoming_stock,
  ins.earliest_delivery AS next_delivery_date,
  
  -- Projected stock (current + incoming)
  (COALESCE(p.quantity_in_stock, 0) + COALESCE(ins.total_incoming_quantity, 0))::NUMERIC(10,2) AS projected_stock,
  
  -- Demand metrics
  COALESCE(hd.avg_daily_demand, 0)::NUMERIC(10,2) AS avg_daily_demand,
  COALESCE(fd.total_forecasted_demand, 0)::NUMERIC(10,2) AS forecasted_demand_90d,
  COALESCE(fd.avg_confidence, 0)::NUMERIC(5,2) AS forecast_confidence,
  
  -- Calculated safety stock (avg_daily_demand * safety_stock_days)
  (COALESCE(hd.avg_daily_demand, 0) * COALESCE(p.safety_stock_days, 7))::NUMERIC(10,2) AS calculated_safety_stock,
  
  -- Demand during lead time (critical for reorder point calculation)
  (COALESCE(hd.avg_daily_demand, 0) * COALESCE(p.lead_time_days, 14))::NUMERIC(10,2) AS demand_during_lead_time,
  
  -- Reorder point = Demand During Lead Time + Safety Stock
  (COALESCE(hd.avg_daily_demand, 0) * (COALESCE(p.lead_time_days, 14) + COALESCE(p.safety_stock_days, 7)))::NUMERIC(10,2) AS calculated_reorder_point,
  
  -- Days of stock remaining (available / daily demand)
  CASE 
    WHEN COALESCE(hd.avg_daily_demand, 0) > 0 
    THEN ((COALESCE(p.quantity_in_stock, 0) - COALESCE(p.allocated_stock, 0)) / hd.avg_daily_demand)::NUMERIC(10,1)
    ELSE NULL
  END AS days_of_stock,
  
  -- Stockout risk date (current date + days of stock)
  CASE 
    WHEN COALESCE(hd.avg_daily_demand, 0) > 0 
    THEN (CURRENT_DATE + ((COALESCE(p.quantity_in_stock, 0) - COALESCE(p.allocated_stock, 0)) / hd.avg_daily_demand)::INTEGER)::DATE
    ELSE NULL
  END AS estimated_stockout_date,
  
  -- Reorder trigger evaluation
  CASE 
    -- Critical: Already out of stock
    WHEN COALESCE(p.quantity_in_stock, 0) = 0 THEN 'CRITICAL_OUT_OF_STOCK'
    
    -- Urgent: Below safety stock level
    WHEN COALESCE(p.quantity_in_stock, 0) < (COALESCE(hd.avg_daily_demand, 0) * COALESCE(p.safety_stock_days, 7)) THEN 'URGENT_BELOW_SAFETY'
    
    -- Action: At or below reorder point
    WHEN COALESCE(p.quantity_in_stock, 0) <= (COALESCE(hd.avg_daily_demand, 0) * (COALESCE(p.lead_time_days, 14) + COALESCE(p.safety_stock_days, 7))) THEN 'REORDER_NOW'
    
    -- Warning: Will reach reorder point within lead time
    WHEN (COALESCE(p.quantity_in_stock, 0) - (COALESCE(hd.avg_daily_demand, 0) * COALESCE(p.lead_time_days, 14))) <= (COALESCE(hd.avg_daily_demand, 0) * COALESCE(p.safety_stock_days, 7)) THEN 'PLAN_REORDER'
    
    -- OK: Stock is healthy
    ELSE 'OK'
  END AS reorder_status,
  
  -- Suggested reorder quantity (Economic Order Quantity simplified)
  CASE 
    WHEN COALESCE(hd.avg_daily_demand, 0) > 0 
    THEN GREATEST(
      p.reorder_quantity, 
      -- Cover lead time + safety period + 30 days buffer
      (COALESCE(hd.avg_daily_demand, 0) * (COALESCE(p.lead_time_days, 14) + COALESCE(p.safety_stock_days, 7) + 30))::NUMERIC(10,2)
    )
    ELSE COALESCE(p.reorder_quantity, 0)
  END::NUMERIC(10,2) AS suggested_order_quantity,
  
  -- Timestamps for data freshness
  CURRENT_TIMESTAMP AS calculated_at

FROM products p
LEFT JOIN incoming_supply ins ON p.brand_id = ins.brand_id AND p.sku = ins.sku
LEFT JOIN historical_demand hd ON p.brand_id = hd.brand_id AND p.sku = hd.sku
LEFT JOIN forecast_demand fd ON p.brand_id = fd.brand_id AND p.sku = fd.sku
WHERE p.status = 'active';

-- Grant access
GRANT SELECT ON inventory_optimization_metrics TO authenticated;

COMMENT ON VIEW inventory_optimization_metrics IS 'Real-time inventory optimization metrics combining stock levels, forecasted demand, and incoming supply to calculate reorder triggers';


-- ================================================
-- 5. CREATE HELPER FUNCTION: GENERATE SUPPLY PLAN
-- ================================================
-- Function to auto-generate supply plans from inventory optimization metrics
-- ================================================

CREATE OR REPLACE FUNCTION generate_supply_plan_recommendations(
  p_brand_id UUID,
  p_sku VARCHAR DEFAULT NULL,
  p_include_ok_status BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  sku VARCHAR,
  product_name VARCHAR,
  current_stock NUMERIC,
  reorder_status TEXT,
  days_of_stock NUMERIC,
  suggested_order_quantity NUMERIC,
  suggested_reorder_date DATE,
  reasoning TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    iom.sku::VARCHAR,
    iom.product_name::VARCHAR,
    iom.current_stock,
    iom.reorder_status::TEXT,
    iom.days_of_stock,
    iom.suggested_order_quantity,
    -- Suggested reorder date: Today for critical/urgent, or estimated stockout - lead time
    CASE 
      WHEN iom.reorder_status IN ('CRITICAL_OUT_OF_STOCK', 'URGENT_BELOW_SAFETY', 'REORDER_NOW') THEN CURRENT_DATE
      WHEN iom.estimated_stockout_date IS NOT NULL THEN (iom.estimated_stockout_date - iom.lead_time_days)::DATE
      ELSE (CURRENT_DATE + 30)::DATE
    END AS suggested_reorder_date,
    -- Reasoning text
    CASE iom.reorder_status
      WHEN 'CRITICAL_OUT_OF_STOCK' THEN 'CRITICAL: Product is out of stock. Immediate reorder required.'
      WHEN 'URGENT_BELOW_SAFETY' THEN 'URGENT: Stock (' || ROUND(iom.current_stock, 0) || ') is below safety stock level (' || ROUND(iom.calculated_safety_stock, 0) || '). Order immediately.'
      WHEN 'REORDER_NOW' THEN 'ACTION: Stock at reorder point. ' || COALESCE(ROUND(iom.days_of_stock, 0)::TEXT, 'N/A') || ' days remaining. Place order now to avoid stockout.'
      WHEN 'PLAN_REORDER' THEN 'PLANNING: Stock healthy but will reach reorder point within lead time. Estimated stockout: ' || COALESCE(iom.estimated_stockout_date::TEXT, 'Unknown')
      ELSE 'OK: Stock levels are healthy (' || COALESCE(ROUND(iom.days_of_stock, 0)::TEXT, 'N/A') || ' days remaining).'
    END AS reasoning
  FROM inventory_optimization_metrics iom
  WHERE iom.brand_id = p_brand_id
    AND (p_sku IS NULL OR iom.sku = p_sku)
    AND (p_include_ok_status OR iom.reorder_status != 'OK')
  ORDER BY 
    CASE iom.reorder_status
      WHEN 'CRITICAL_OUT_OF_STOCK' THEN 1
      WHEN 'URGENT_BELOW_SAFETY' THEN 2
      WHEN 'REORDER_NOW' THEN 3
      WHEN 'PLAN_REORDER' THEN 4
      ELSE 5
    END,
    iom.days_of_stock ASC NULLS FIRST;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_supply_plan_recommendations TO authenticated;

COMMENT ON FUNCTION generate_supply_plan_recommendations IS 'Generates actionable supply plan recommendations based on inventory optimization metrics';


-- ================================================
-- 6. ADD UNIQUE CONSTRAINT FOR DEMAND_FORECASTS UPSERT
-- ================================================
-- Ensure the upsert operation works correctly

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'demand_forecasts_brand_sku_period_unique'
  ) THEN
    ALTER TABLE demand_forecasts 
    ADD CONSTRAINT demand_forecasts_brand_sku_period_unique 
    UNIQUE (brand_id, sku, forecast_period_start, forecast_period_end);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint already exists, skipping...';
END $$;


COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately)
-- ================================================

-- Verify forecast_inputs view
-- SELECT * FROM forecast_inputs WHERE brand_id = 'your-brand-id' LIMIT 10;

-- Verify products table has new columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' 
-- AND column_name IN ('lead_time_days', 'safety_stock_days');

-- Verify supply_plans table
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'supply_plans' 
-- ORDER BY ordinal_position;

-- Verify inventory_optimization_metrics view
-- SELECT * FROM inventory_optimization_metrics WHERE brand_id = 'your-brand-id' LIMIT 10;

-- Test supply plan generation function
-- SELECT * FROM generate_supply_plan_recommendations('your-brand-id'::UUID);
