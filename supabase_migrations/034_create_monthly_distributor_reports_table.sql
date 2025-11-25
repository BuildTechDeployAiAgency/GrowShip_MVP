-- ================================================
-- MIGRATION 034: CREATE MONTHLY DISTRIBUTOR REPORTS TABLE
-- ================================================
-- Description: Create table for monthly performance reporting by distributor
-- Date: November 18, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE REPORT STATUS ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status_type') THEN
    CREATE TYPE report_status_type AS ENUM ('draft', 'submitted', 'confirmed', 'archived');
  END IF;
END $$;

-- ================================================
-- 2. CREATE MONTHLY_DISTRIBUTOR_REPORTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS monthly_distributor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  report_month DATE NOT NULL,  -- First day of the month, e.g. '2025-11-01'
  
  -- Aggregated Metrics
  total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
  total_units NUMERIC(12,2) DEFAULT 0 CHECK (total_units >= 0),
  total_sales NUMERIC(14,2) DEFAULT 0 CHECK (total_sales >= 0),
  fill_rate NUMERIC(5,2) CHECK (fill_rate >= 0 AND fill_rate <= 100),  -- % of PO quantity fulfilled
  avg_order_value NUMERIC(12,2) DEFAULT 0,
  
  -- Status & Workflow
  status report_status_type DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  notes TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique reports per month/brand/distributor/PO combination
  UNIQUE(brand_id, distributor_id, report_month, purchase_order_id)
);

-- ================================================
-- 3. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_monthly_reports_brand_id ON monthly_distributor_reports(brand_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_distributor_id ON monthly_distributor_reports(distributor_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_purchase_order_id ON monthly_distributor_reports(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_report_month ON monthly_distributor_reports(report_month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_status ON monthly_distributor_reports(status);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_brand_distributor_month ON monthly_distributor_reports(brand_id, distributor_id, report_month);

-- ================================================
-- 4. CREATE RLS POLICIES
-- ================================================

ALTER TABLE monthly_distributor_reports ENABLE ROW LEVEL SECURITY;

-- Brand admins can view reports for their brand's distributors
CREATE POLICY "Brand admins can view reports for their distributors"
ON monthly_distributor_reports FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles 
    WHERE user_id = auth.uid()
    AND distributor_id IS NULL  -- Brand admin, not distributor admin
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
);

-- Distributor admins can view only their own reports
CREATE POLICY "Distributor admins can view their own reports"
ON monthly_distributor_reports FOR SELECT
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
  AND brand_id IN (
    SELECT brand_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Brand admins can manage reports for their brand
CREATE POLICY "Brand admins can manage reports for their brand"
ON monthly_distributor_reports FOR ALL
USING (
  brand_id IN (
    SELECT brand_id FROM user_profiles 
    WHERE user_id = auth.uid()
    AND distributor_id IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
);

-- Distributor admins can update (submit/comment) their own reports
CREATE POLICY "Distributor admins can update their own reports"
ON monthly_distributor_reports FOR UPDATE
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
  AND brand_id IN (
    SELECT brand_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND distributor_id IS NOT NULL
  )
);

-- ================================================
-- 5. CREATE TRIGGER FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_monthly_distributor_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_monthly_distributor_reports_updated_at ON monthly_distributor_reports;
CREATE TRIGGER update_monthly_distributor_reports_updated_at
  BEFORE UPDATE ON monthly_distributor_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_distributor_reports_updated_at();

-- ================================================
-- 6. ADD COMMENTS
-- ================================================

COMMENT ON TABLE monthly_distributor_reports IS 'Monthly performance reports aggregated by brand, distributor, and optionally by purchase order';
COMMENT ON COLUMN monthly_distributor_reports.brand_id IS 'Foreign key to brands table';
COMMENT ON COLUMN monthly_distributor_reports.distributor_id IS 'Foreign key to distributors table';
COMMENT ON COLUMN monthly_distributor_reports.purchase_order_id IS 'Optional: FK to purchase_orders for PO-specific reporting';
COMMENT ON COLUMN monthly_distributor_reports.report_month IS 'First day of the reporting month (YYYY-MM-01)';
COMMENT ON COLUMN monthly_distributor_reports.total_orders IS 'Count of orders in this period';
COMMENT ON COLUMN monthly_distributor_reports.total_units IS 'Sum of all units sold';
COMMENT ON COLUMN monthly_distributor_reports.total_sales IS 'Sum of all order totals';
COMMENT ON COLUMN monthly_distributor_reports.fill_rate IS 'Percentage of PO quantity fulfilled (null if no PO)';
COMMENT ON COLUMN monthly_distributor_reports.status IS 'Workflow status: draft, submitted, confirmed, archived';

COMMIT;

-- Verification queries (run separately)
-- SELECT * FROM monthly_distributor_reports LIMIT 5;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'monthly_distributor_reports' ORDER BY ordinal_position;

