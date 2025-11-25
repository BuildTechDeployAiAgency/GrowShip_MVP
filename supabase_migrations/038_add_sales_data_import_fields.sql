-- =====================================================
-- Migration 038: Add Sales Data Import Fields
-- =====================================================
-- Description: Add new fields to sales_data table to support distributor sales report imports
-- Date: 2025-11-22
-- Author: GrowShip Team
-- 
-- This migration adds fields needed for the distributor sales report import feature:
-- - reporting_month: Normalized date for monthly reporting
-- - import_timestamp: When the data was imported
-- - sales_channel: Channel classification (retail, ecom, wholesale, etc.)
-- - gross_revenue_local: Gross revenue in local currency
-- - marketing_spend: Marketing/promotional spend
-- - territory_country: Country-level territory classification
-- =====================================================

BEGIN;

-- ================================================
-- ADD NEW COLUMNS TO SALES_DATA TABLE
-- ================================================

-- Add reporting_month column (normalized to first day of month for consistent monthly reporting)
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS reporting_month DATE;

-- Add import_timestamp column (tracks when the data was imported)
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS import_timestamp TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add sales_channel column (e.g., retail, ecom, wholesale, direct)
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS sales_channel TEXT;

-- Add gross_revenue_local column (gross revenue before discounts/returns in local currency)
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS gross_revenue_local NUMERIC(14,2);

-- Add marketing_spend column (marketing/promotional spend associated with sales)
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS marketing_spend NUMERIC(14,2);

-- Add territory_country column (country-level territory for simpler classification)
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS territory_country TEXT;

-- ================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================

-- Index on reporting_month for monthly reporting queries
CREATE INDEX IF NOT EXISTS idx_sales_data_reporting_month 
  ON sales_data(reporting_month);

-- Composite index for brand + distributor + reporting_month (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_sales_data_brand_dist_month 
  ON sales_data(brand_id, distributor_id, reporting_month);

-- Index on sales_channel for channel-based filtering
CREATE INDEX IF NOT EXISTS idx_sales_data_sales_channel 
  ON sales_data(sales_channel);

-- Index on territory_country for country-based filtering
CREATE INDEX IF NOT EXISTS idx_sales_data_territory_country 
  ON sales_data(territory_country);

-- Composite index for import tracking and auditing
CREATE INDEX IF NOT EXISTS idx_sales_data_import_timestamp 
  ON sales_data(import_timestamp DESC);

-- ================================================
-- ADD COLUMN COMMENTS
-- ================================================

COMMENT ON COLUMN sales_data.reporting_month IS 'Normalized month (first day) for consistent monthly reporting and aggregations';
COMMENT ON COLUMN sales_data.import_timestamp IS 'Timestamp when the sales data was imported into the system';
COMMENT ON COLUMN sales_data.sales_channel IS 'Sales channel classification: retail, ecom, wholesale, direct, etc.';
COMMENT ON COLUMN sales_data.gross_revenue_local IS 'Gross revenue in local currency before discounts and returns';
COMMENT ON COLUMN sales_data.marketing_spend IS 'Marketing and promotional spend associated with the sales';
COMMENT ON COLUMN sales_data.territory_country IS 'Country-level territory classification for simpler geographic grouping';

-- ================================================
-- CREATE FUNCTION TO AUTO-POPULATE REPORTING_MONTH
-- ================================================

-- Function to normalize sales_date to reporting_month (first day of month)
CREATE OR REPLACE FUNCTION populate_reporting_month()
RETURNS TRIGGER AS $$
BEGIN
  -- If reporting_month is not explicitly set, derive it from sales_date
  IF NEW.reporting_month IS NULL AND NEW.sales_date IS NOT NULL THEN
    NEW.reporting_month := date_trunc('month', NEW.sales_date)::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate reporting_month
DROP TRIGGER IF EXISTS trigger_populate_reporting_month ON sales_data;
CREATE TRIGGER trigger_populate_reporting_month
  BEFORE INSERT OR UPDATE ON sales_data
  FOR EACH ROW
  EXECUTE FUNCTION populate_reporting_month();

COMMIT;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Verify new columns were added
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'sales_data'
-- AND column_name IN ('reporting_month', 'import_timestamp', 'sales_channel', 'gross_revenue_local', 'marketing_spend', 'territory_country')
-- ORDER BY ordinal_position;

-- Verify indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'sales_data'
-- AND indexname LIKE '%reporting_month%' OR indexname LIKE '%sales_channel%' OR indexname LIKE '%territory_country%'
-- ORDER BY indexname;

-- Check if trigger is created
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'trigger_populate_reporting_month';

