-- ================================================
-- Migration: Geographic Reporting Framework
-- ================================================
-- Description: Create a scalable Country–Region–Territory reporting framework
--   - Creates normalized regions and territories lookup tables
--   - Adds territory_id/region_id to distributors, orders, and sales_data
--   - Updates sync functions to include geographic data
--   - Provides backfill for existing data
-- Date: 2025-12-08
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE REGIONS TABLE
-- ================================================
-- Regions are high-level geographic groupings (e.g., GCC, MENA, Europe)

CREATE TABLE IF NOT EXISTS regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,           -- e.g., 'GCC', 'MENA', 'EUR', 'NAM'
  name VARCHAR(100) NOT NULL,                 -- e.g., 'Gulf Cooperation Council'
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(is_active);

COMMENT ON TABLE regions IS 'High-level geographic regions for sales reporting (e.g., GCC, Europe, APAC)';

-- ================================================
-- 2. CREATE TERRITORIES TABLE
-- ================================================
-- Territories are subdivisions within regions, mapped to specific countries

CREATE TABLE IF NOT EXISTS territories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,           -- e.g., 'GULF', 'LEVANT', 'WESTERN_EU'
  name VARCHAR(100) NOT NULL,                 -- e.g., 'Gulf States', 'Levant Region'
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  countries TEXT[] NOT NULL DEFAULT '{}',     -- ISO 3166-1 alpha-2 codes: ['AE', 'SA', 'KW', ...]
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,  -- NULL = global/shared territory
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_territories_code ON territories(code);
CREATE INDEX IF NOT EXISTS idx_territories_region_id ON territories(region_id);
CREATE INDEX IF NOT EXISTS idx_territories_brand_id ON territories(brand_id);
CREATE INDEX IF NOT EXISTS idx_territories_active ON territories(is_active);
CREATE INDEX IF NOT EXISTS idx_territories_countries ON territories USING GIN(countries);

COMMENT ON TABLE territories IS 'Sales territories within regions, mapped to specific countries for reporting';

-- ================================================
-- 3. UPDATE DISTRIBUTORS TABLE
-- ================================================
-- Add territory_id foreign key to distributors

ALTER TABLE distributors ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_distributors_territory_id ON distributors(territory_id);
CREATE INDEX IF NOT EXISTS idx_distributors_region_id ON distributors(region_id);

COMMENT ON COLUMN distributors.territory_id IS 'Assigned territory for this distributor (for reporting/segmentation)';
COMMENT ON COLUMN distributors.region_id IS 'Denormalized region from territory (for performance)';

-- ================================================
-- 4. UPDATE ORDERS TABLE
-- ================================================
-- Add territory_id and region_id to orders (inherited from distributor or derived from shipping_country)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_territory_id ON orders(territory_id);
CREATE INDEX IF NOT EXISTS idx_orders_region_id ON orders(region_id);
CREATE INDEX IF NOT EXISTS idx_orders_brand_territory ON orders(brand_id, territory_id);

COMMENT ON COLUMN orders.territory_id IS 'Territory for this order (inherited from distributor or derived from shipping country)';
COMMENT ON COLUMN orders.region_id IS 'Denormalized region (for performance)';

-- ================================================
-- 5. UPDATE SALES_DATA TABLE
-- ================================================
-- Add territory_id and region_id to sales_data (keep existing text fields for backward compatibility)

ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_data_territory_id ON sales_data(territory_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_region_id ON sales_data(region_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_brand_territory ON sales_data(brand_id, territory_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_brand_region ON sales_data(brand_id, region_id);

COMMENT ON COLUMN sales_data.territory_id IS 'Foreign key to territories table (normalized territory)';
COMMENT ON COLUMN sales_data.region_id IS 'Foreign key to regions table (denormalized for performance)';

-- ================================================
-- 6. HELPER FUNCTION: Find Territory by Country
-- ================================================
-- This function finds the best matching territory for a given country code

CREATE OR REPLACE FUNCTION find_territory_by_country(
  p_country_code TEXT,
  p_brand_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_territory_id UUID;
BEGIN
  -- Normalize country code to uppercase
  p_country_code := UPPER(TRIM(COALESCE(p_country_code, '')));
  
  IF p_country_code = '' THEN
    RETURN NULL;
  END IF;
  
  -- First try to find a brand-specific territory
  IF p_brand_id IS NOT NULL THEN
    SELECT id INTO v_territory_id
    FROM territories
    WHERE p_country_code = ANY(countries)
      AND brand_id = p_brand_id
      AND is_active = TRUE
    ORDER BY display_order ASC
    LIMIT 1;
    
    IF v_territory_id IS NOT NULL THEN
      RETURN v_territory_id;
    END IF;
  END IF;
  
  -- Fall back to global territory (brand_id IS NULL)
  SELECT id INTO v_territory_id
  FROM territories
  WHERE p_country_code = ANY(countries)
    AND brand_id IS NULL
    AND is_active = TRUE
  ORDER BY display_order ASC
  LIMIT 1;
  
  RETURN v_territory_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_territory_by_country IS 'Finds the territory ID for a given country code (ISO 3166-1 alpha-2)';

-- ================================================
-- 7. HELPER FUNCTION: Get Region for Territory
-- ================================================

CREATE OR REPLACE FUNCTION get_region_for_territory(p_territory_id UUID)
RETURNS UUID AS $$
BEGIN
  IF p_territory_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (SELECT region_id FROM territories WHERE id = p_territory_id);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_region_for_territory IS 'Returns the region_id for a given territory_id';

-- ================================================
-- 8. UPDATE SYNC_ORDER_TO_SALES_DATA FUNCTION
-- ================================================
-- Modify the existing function to include territory_id and region_id

-- Drop existing function first (required if return type differs)
DROP FUNCTION IF EXISTS sync_order_to_sales_data(UUID);

CREATE OR REPLACE FUNCTION sync_order_to_sales_data(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_order_line RECORD;
  v_product RECORD;
  v_territory_id UUID;
  v_region_id UUID;
  v_country_code TEXT;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN;
  END IF;
  
  -- Delete existing sales_data entries for this order
  DELETE FROM sales_data WHERE order_id = p_order_id;
  
  -- Determine territory: First from order, then from distributor, then derive from country
  v_territory_id := v_order.territory_id;
  
  IF v_territory_id IS NULL AND v_order.distributor_id IS NOT NULL THEN
    SELECT territory_id INTO v_territory_id
    FROM distributors
    WHERE id = v_order.distributor_id;
  END IF;
  
  IF v_territory_id IS NULL THEN
    -- Try to derive from shipping country
    v_country_code := UPPER(TRIM(COALESCE(v_order.shipping_country, '')));
    IF v_country_code != '' THEN
      v_territory_id := find_territory_by_country(v_country_code, v_order.brand_id);
    END IF;
  END IF;
  
  -- Get region from territory
  v_region_id := get_region_for_territory(v_territory_id);
  
  -- Loop through order lines and insert into sales_data
  FOR v_order_line IN 
    SELECT 
      ol.id AS line_id,
      ol.sku,
      ol.product_name,
      ol.quantity,
      ol.total,
      ol.currency AS line_currency
    FROM order_lines ol
    WHERE ol.order_id = p_order_id
  LOOP
    -- Get product details (for category)
    SELECT product_category INTO v_product
    FROM products
    WHERE sku = v_order_line.sku AND brand_id = v_order.brand_id
    LIMIT 1;
    
    -- Insert into sales_data
    INSERT INTO sales_data (
      brand_id,
      distributor_id,
      user_id,
      order_id,
      order_line_id,
      sku,
      product_name,
      product_category,
      retailer_name,
      territory,
      territory_country,
      territory_id,
      region_id,
      sales_date,
      reporting_month,
      sales_channel,
      total_sales,
      quantity_sold,
      currency,
      campaign_id,
      notes,
      import_timestamp
    ) VALUES (
      v_order.brand_id,
      v_order.distributor_id,
      v_order.user_id,
      v_order.id,
      v_order_line.line_id,
      v_order_line.sku,
      v_order_line.product_name,
      v_product.product_category,
      v_order.customer_name,
      (SELECT name FROM territories WHERE id = v_territory_id),  -- Text for backward compat
      v_order.shipping_country,
      v_territory_id,
      v_region_id,
      v_order.order_date,
      DATE_TRUNC('month', v_order.order_date)::DATE,
      v_order.sales_channel,
      v_order_line.total,
      v_order_line.quantity,
      COALESCE(v_order_line.line_currency, v_order.currency, 'USD'),
      v_order.campaign_id,
      v_order.notes,
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_order_to_sales_data IS 'Syncs order and order_lines to sales_data for reporting, including geographic data';

-- ================================================
-- 9. TRIGGER: Auto-assign territory to distributors
-- ================================================

CREATE OR REPLACE FUNCTION auto_assign_distributor_territory()
RETURNS TRIGGER AS $$
DECLARE
  v_country_code TEXT;
BEGIN
  -- Only auto-assign if territory_id is null and country is set
  IF NEW.territory_id IS NULL AND NEW.country IS NOT NULL THEN
    v_country_code := UPPER(TRIM(NEW.country));
    NEW.territory_id := find_territory_by_country(v_country_code, NEW.brand_id);
    NEW.region_id := get_region_for_territory(NEW.territory_id);
  END IF;
  
  -- Update region_id if territory_id is set but region_id is not
  IF NEW.territory_id IS NOT NULL AND NEW.region_id IS NULL THEN
    NEW.region_id := get_region_for_territory(NEW.territory_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_assign_distributor_territory ON distributors;
CREATE TRIGGER trigger_auto_assign_distributor_territory
  BEFORE INSERT OR UPDATE ON distributors
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_distributor_territory();

-- ================================================
-- 10. TRIGGER: Auto-assign territory to orders
-- ================================================

CREATE OR REPLACE FUNCTION auto_assign_order_territory()
RETURNS TRIGGER AS $$
DECLARE
  v_distributor_territory_id UUID;
  v_country_code TEXT;
BEGIN
  -- Try to inherit from distributor first
  IF NEW.territory_id IS NULL AND NEW.distributor_id IS NOT NULL THEN
    SELECT territory_id, region_id INTO NEW.territory_id, NEW.region_id
    FROM distributors
    WHERE id = NEW.distributor_id;
  END IF;
  
  -- If still null, derive from shipping country
  IF NEW.territory_id IS NULL AND NEW.shipping_country IS NOT NULL THEN
    v_country_code := UPPER(TRIM(NEW.shipping_country));
    NEW.territory_id := find_territory_by_country(v_country_code, NEW.brand_id);
    NEW.region_id := get_region_for_territory(NEW.territory_id);
  END IF;
  
  -- Update region_id if territory_id is set but region_id is not
  IF NEW.territory_id IS NOT NULL AND NEW.region_id IS NULL THEN
    NEW.region_id := get_region_for_territory(NEW.territory_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_assign_order_territory ON orders;
CREATE TRIGGER trigger_auto_assign_order_territory
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_order_territory();

-- ================================================
-- 11. SEED: Initial Regions Data
-- ================================================

INSERT INTO regions (code, name, description, display_order) VALUES
  ('GCC', 'Gulf Cooperation Council', 'Gulf Arab states: UAE, Saudi Arabia, Kuwait, Bahrain, Oman, Qatar', 1),
  ('LEVANT', 'Levant', 'Levant region: Jordan, Lebanon, Syria, Palestine, Iraq', 2),
  ('MENA', 'Middle East & North Africa', 'Broader MENA region including North Africa', 3),
  ('EUR', 'Europe', 'European markets', 4),
  ('NAM', 'North America', 'USA and Canada', 5),
  ('APAC', 'Asia Pacific', 'Asia Pacific markets', 6),
  ('LATAM', 'Latin America', 'Central and South America', 7),
  ('AFR', 'Africa', 'Sub-Saharan Africa', 8),
  ('OTHER', 'Other', 'Other regions not classified elsewhere', 99)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ================================================
-- 12. SEED: Initial Territories Data
-- ================================================

-- GCC Territories
INSERT INTO territories (code, name, region_id, countries, description, display_order) VALUES
  ('UAE', 'United Arab Emirates', (SELECT id FROM regions WHERE code = 'GCC'), ARRAY['AE'], 'UAE market', 1),
  ('KSA', 'Saudi Arabia', (SELECT id FROM regions WHERE code = 'GCC'), ARRAY['SA'], 'Saudi Arabia market', 2),
  ('KUWAIT', 'Kuwait', (SELECT id FROM regions WHERE code = 'GCC'), ARRAY['KW'], 'Kuwait market', 3),
  ('QATAR', 'Qatar', (SELECT id FROM regions WHERE code = 'GCC'), ARRAY['QA'], 'Qatar market', 4),
  ('BAHRAIN', 'Bahrain', (SELECT id FROM regions WHERE code = 'GCC'), ARRAY['BH'], 'Bahrain market', 5),
  ('OMAN', 'Oman', (SELECT id FROM regions WHERE code = 'GCC'), ARRAY['OM'], 'Oman market', 6)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  region_id = EXCLUDED.region_id,
  countries = EXCLUDED.countries,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Levant Territories
INSERT INTO territories (code, name, region_id, countries, description, display_order) VALUES
  ('JORDAN', 'Jordan', (SELECT id FROM regions WHERE code = 'LEVANT'), ARRAY['JO'], 'Jordan market', 10),
  ('LEBANON', 'Lebanon', (SELECT id FROM regions WHERE code = 'LEVANT'), ARRAY['LB'], 'Lebanon market', 11),
  ('IRAQ', 'Iraq', (SELECT id FROM regions WHERE code = 'LEVANT'), ARRAY['IQ'], 'Iraq market', 12)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  region_id = EXCLUDED.region_id,
  countries = EXCLUDED.countries,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- MENA Territories (additional)
INSERT INTO territories (code, name, region_id, countries, description, display_order) VALUES
  ('EGYPT', 'Egypt', (SELECT id FROM regions WHERE code = 'MENA'), ARRAY['EG'], 'Egypt market', 20),
  ('MOROCCO', 'Morocco', (SELECT id FROM regions WHERE code = 'MENA'), ARRAY['MA'], 'Morocco market', 21),
  ('TUNISIA', 'Tunisia', (SELECT id FROM regions WHERE code = 'MENA'), ARRAY['TN'], 'Tunisia market', 22),
  ('ALGERIA', 'Algeria', (SELECT id FROM regions WHERE code = 'MENA'), ARRAY['DZ'], 'Algeria market', 23)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  region_id = EXCLUDED.region_id,
  countries = EXCLUDED.countries,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Europe Territories
INSERT INTO territories (code, name, region_id, countries, description, display_order) VALUES
  ('UK', 'United Kingdom', (SELECT id FROM regions WHERE code = 'EUR'), ARRAY['GB', 'UK'], 'UK market', 30),
  ('GERMANY', 'Germany', (SELECT id FROM regions WHERE code = 'EUR'), ARRAY['DE'], 'Germany market', 31),
  ('FRANCE', 'France', (SELECT id FROM regions WHERE code = 'EUR'), ARRAY['FR'], 'France market', 32),
  ('BENELUX', 'Benelux', (SELECT id FROM regions WHERE code = 'EUR'), ARRAY['NL', 'BE', 'LU'], 'Belgium, Netherlands, Luxembourg', 33),
  ('NORDICS', 'Nordics', (SELECT id FROM regions WHERE code = 'EUR'), ARRAY['SE', 'NO', 'DK', 'FI', 'IS'], 'Nordic countries', 34),
  ('SOUTHERN_EU', 'Southern Europe', (SELECT id FROM regions WHERE code = 'EUR'), ARRAY['ES', 'IT', 'PT', 'GR'], 'Spain, Italy, Portugal, Greece', 35)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  region_id = EXCLUDED.region_id,
  countries = EXCLUDED.countries,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- North America Territories
INSERT INTO territories (code, name, region_id, countries, description, display_order) VALUES
  ('USA', 'United States', (SELECT id FROM regions WHERE code = 'NAM'), ARRAY['US'], 'US market', 40),
  ('CANADA', 'Canada', (SELECT id FROM regions WHERE code = 'NAM'), ARRAY['CA'], 'Canada market', 41)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  region_id = EXCLUDED.region_id,
  countries = EXCLUDED.countries,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Asia Pacific Territories
INSERT INTO territories (code, name, region_id, countries, description, display_order) VALUES
  ('ANZ', 'Australia & New Zealand', (SELECT id FROM regions WHERE code = 'APAC'), ARRAY['AU', 'NZ'], 'ANZ market', 50),
  ('CHINA', 'China', (SELECT id FROM regions WHERE code = 'APAC'), ARRAY['CN'], 'China market', 51),
  ('JAPAN', 'Japan', (SELECT id FROM regions WHERE code = 'APAC'), ARRAY['JP'], 'Japan market', 52),
  ('SOUTHEAST_ASIA', 'Southeast Asia', (SELECT id FROM regions WHERE code = 'APAC'), ARRAY['SG', 'MY', 'TH', 'ID', 'PH', 'VN'], 'Southeast Asia markets', 53),
  ('INDIA', 'India', (SELECT id FROM regions WHERE code = 'APAC'), ARRAY['IN'], 'India market', 54)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  region_id = EXCLUDED.region_id,
  countries = EXCLUDED.countries,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ================================================
-- 13. BACKFILL: Update Distributors
-- ================================================
-- Assign territory_id and region_id to existing distributors based on country

UPDATE distributors d
SET 
  territory_id = find_territory_by_country(d.country, d.brand_id),
  region_id = get_region_for_territory(find_territory_by_country(d.country, d.brand_id)),
  updated_at = NOW()
WHERE d.country IS NOT NULL
  AND d.territory_id IS NULL;

-- ================================================
-- 14. BACKFILL: Update Orders
-- ================================================
-- First try from distributor, then from shipping_country

-- Orders with distributor
UPDATE orders o
SET 
  territory_id = d.territory_id,
  region_id = d.region_id,
  updated_at = NOW()
FROM distributors d
WHERE o.distributor_id = d.id
  AND o.territory_id IS NULL
  AND d.territory_id IS NOT NULL;

-- Orders without distributor but with shipping_country
UPDATE orders o
SET 
  territory_id = find_territory_by_country(o.shipping_country, o.brand_id),
  region_id = get_region_for_territory(find_territory_by_country(o.shipping_country, o.brand_id)),
  updated_at = NOW()
WHERE o.territory_id IS NULL
  AND o.shipping_country IS NOT NULL;

-- ================================================
-- 15. BACKFILL: Update Sales Data
-- ================================================
-- Update sales_data based on territory text field or country

-- First, try matching by existing territory text field
UPDATE sales_data sd
SET 
  territory_id = t.id,
  region_id = t.region_id,
  updated_at = NOW()
FROM territories t
WHERE sd.territory IS NOT NULL
  AND sd.territory_id IS NULL
  AND (
    UPPER(sd.territory) = UPPER(t.name) OR
    UPPER(sd.territory) = UPPER(t.code)
  );

-- Then try matching by country
UPDATE sales_data sd
SET 
  territory_id = find_territory_by_country(sd.territory_country, sd.brand_id),
  region_id = get_region_for_territory(find_territory_by_country(sd.territory_country, sd.brand_id)),
  updated_at = NOW()
WHERE sd.territory_id IS NULL
  AND sd.territory_country IS NOT NULL;

-- Finally, try from linked order
UPDATE sales_data sd
SET 
  territory_id = o.territory_id,
  region_id = o.region_id,
  updated_at = NOW()
FROM orders o
WHERE sd.order_id = o.id
  AND sd.territory_id IS NULL
  AND o.territory_id IS NOT NULL;

-- ================================================
-- 16. RLS POLICIES
-- ================================================

-- Enable RLS on regions and territories
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

-- Regions are readable by all authenticated users (reference data)
DROP POLICY IF EXISTS "Regions are viewable by authenticated users" ON regions;
CREATE POLICY "Regions are viewable by authenticated users" ON regions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Territories are viewable based on brand_id or if global (brand_id IS NULL)
DROP POLICY IF EXISTS "Territories are viewable by authenticated users" ON territories;
CREATE POLICY "Territories are viewable by authenticated users" ON territories
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      brand_id IS NULL  -- Global territories visible to all
      OR brand_id IN (
        SELECT brand_id FROM user_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Grant permissions
GRANT SELECT ON regions TO authenticated;
GRANT SELECT ON territories TO authenticated;
GRANT EXECUTE ON FUNCTION find_territory_by_country TO authenticated;
GRANT EXECUTE ON FUNCTION get_region_for_territory TO authenticated;

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately)
-- ================================================
-- SELECT * FROM regions ORDER BY display_order;
-- SELECT t.*, r.name as region_name FROM territories t LEFT JOIN regions r ON t.region_id = r.id ORDER BY t.display_order;
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory FROM distributors;
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory FROM orders;
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory FROM sales_data;

