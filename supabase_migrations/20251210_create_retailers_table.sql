-- ================================================
-- Migration: Create Retailers Table
-- ================================================
-- Description: Create retailers reference table for normalized retailer data
--              and add retailer_id foreign key to sales_data table
-- Date: 2025-12-10
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE RETAILERS TABLE
-- ================================================
-- Retailers are normalized customer/store records for sales reporting

CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  retailer_code VARCHAR(50),
  retailer_name VARCHAR(255) NOT NULL,
  territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Unique constraint on brand + retailer name (case-insensitive)
CREATE UNIQUE INDEX idx_retailers_brand_name_unique 
  ON retailers(brand_id, LOWER(retailer_name));

-- Indexes for lookups
CREATE INDEX idx_retailers_brand_id ON retailers(brand_id);
CREATE INDEX idx_retailers_territory_id ON retailers(territory_id);
CREATE INDEX idx_retailers_region_id ON retailers(region_id);
CREATE INDEX idx_retailers_status ON retailers(status);
CREATE INDEX idx_retailers_name_search ON retailers(LOWER(retailer_name));

COMMENT ON TABLE retailers IS 'Normalized retailer/customer reference table for sales data';
COMMENT ON COLUMN retailers.retailer_code IS 'Optional internal code for the retailer';
COMMENT ON COLUMN retailers.retailer_name IS 'Display name of the retailer';
COMMENT ON COLUMN retailers.territory_id IS 'Primary territory assignment for the retailer';

-- ================================================
-- 2. ADD RETAILER_ID TO SALES_DATA
-- ================================================

ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS retailer_id UUID REFERENCES retailers(id) ON DELETE SET NULL;

-- Index for joins and lookups
CREATE INDEX IF NOT EXISTS idx_sales_data_retailer_id ON sales_data(retailer_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_brand_retailer ON sales_data(brand_id, retailer_id);

COMMENT ON COLUMN sales_data.retailer_id IS 'Foreign key to retailers table (normalized retailer reference)';

-- ================================================
-- 3. ADD REPORTING_QUARTER AND REPORTING_YEAR
-- ================================================
-- Pre-computed columns for efficient quarterly/yearly analysis

-- Add reporting_quarter as a generated column
ALTER TABLE sales_data 
  ADD COLUMN IF NOT EXISTS reporting_quarter INTEGER 
  GENERATED ALWAYS AS (EXTRACT(QUARTER FROM sales_date)::INTEGER) STORED;

-- Add reporting_year as a generated column
ALTER TABLE sales_data 
  ADD COLUMN IF NOT EXISTS reporting_year INTEGER 
  GENERATED ALWAYS AS (EXTRACT(YEAR FROM sales_date)::INTEGER) STORED;

-- Indexes for quarter/year filtering
CREATE INDEX IF NOT EXISTS idx_sales_data_reporting_quarter 
  ON sales_data(reporting_year, reporting_quarter);
CREATE INDEX IF NOT EXISTS idx_sales_data_reporting_year 
  ON sales_data(reporting_year);
CREATE INDEX IF NOT EXISTS idx_sales_data_brand_quarter 
  ON sales_data(brand_id, reporting_year, reporting_quarter);

COMMENT ON COLUMN sales_data.reporting_quarter IS 'Pre-computed quarter (1-4) from sales_date for efficient filtering';
COMMENT ON COLUMN sales_data.reporting_year IS 'Pre-computed year from sales_date for efficient filtering';

-- ================================================
-- 4. RLS POLICIES FOR RETAILERS
-- ================================================

ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;

-- Policy: Brand admins can view retailers for their brand
CREATE POLICY "Brand admins can view own retailers"
  ON retailers FOR SELECT
  USING (
    brand_id IN (
      SELECT up.brand_id 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    )
  );

-- Policy: Brand admins can insert retailers for their brand
CREATE POLICY "Brand admins can insert own retailers"
  ON retailers FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT up.brand_id 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    )
  );

-- Policy: Brand admins can update retailers for their brand
CREATE POLICY "Brand admins can update own retailers"
  ON retailers FOR UPDATE
  USING (
    brand_id IN (
      SELECT up.brand_id 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid()
    )
  );

-- Policy: Super admins can do everything
CREATE POLICY "Super admins have full access to retailers"
  ON retailers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role_name = 'super_admin'
    )
  );

-- ================================================
-- 5. HELPER FUNCTION: Find or Create Retailer
-- ================================================
-- This function looks up a retailer by name (case-insensitive)
-- and creates one if it doesn't exist

CREATE OR REPLACE FUNCTION find_or_create_retailer(
  p_brand_id UUID,
  p_retailer_name TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_retailer_id UUID;
  v_clean_name TEXT;
BEGIN
  -- Clean the retailer name
  v_clean_name := TRIM(p_retailer_name);
  
  IF v_clean_name IS NULL OR v_clean_name = '' THEN
    RETURN NULL;
  END IF;
  
  -- Try to find existing retailer (case-insensitive)
  SELECT id INTO v_retailer_id
  FROM retailers
  WHERE brand_id = p_brand_id
    AND LOWER(retailer_name) = LOWER(v_clean_name)
  LIMIT 1;
  
  -- If not found, create new retailer
  IF v_retailer_id IS NULL THEN
    INSERT INTO retailers (brand_id, retailer_name, created_by)
    VALUES (p_brand_id, v_clean_name, p_created_by)
    RETURNING id INTO v_retailer_id;
  END IF;
  
  RETURN v_retailer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_or_create_retailer IS 'Finds an existing retailer by name or creates a new one. Used during sales data import.';

-- ================================================
-- 6. TRIGGER: Update updated_at on retailers
-- ================================================

CREATE OR REPLACE FUNCTION update_retailers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_retailers_updated_at ON retailers;
CREATE TRIGGER trigger_retailers_updated_at
  BEFORE UPDATE ON retailers
  FOR EACH ROW
  EXECUTE FUNCTION update_retailers_updated_at();

-- ================================================
-- 7. GRANT PERMISSIONS
-- ================================================

GRANT SELECT, INSERT, UPDATE ON retailers TO authenticated;
GRANT EXECUTE ON FUNCTION find_or_create_retailer TO authenticated;

COMMIT;

-- ================================================
-- USAGE EXAMPLES
-- ================================================
-- 
-- Find or create a retailer:
-- SELECT find_or_create_retailer('brand-uuid'::UUID, 'Walmart', 'user-uuid'::UUID);
--
-- Query sales by retailer:
-- SELECT r.retailer_name, SUM(sd.total_sales) as revenue
-- FROM sales_data sd
-- JOIN retailers r ON sd.retailer_id = r.id
-- WHERE sd.brand_id = 'brand-uuid'
-- GROUP BY r.retailer_name;
--
-- Query sales by quarter:
-- SELECT reporting_year, reporting_quarter, SUM(total_sales) as revenue
-- FROM sales_data
-- WHERE brand_id = 'brand-uuid'
-- GROUP BY reporting_year, reporting_quarter
-- ORDER BY reporting_year, reporting_quarter;
