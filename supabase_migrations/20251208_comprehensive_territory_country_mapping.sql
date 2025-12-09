-- ================================================
-- Migration: Comprehensive Territory & Country Mapping
-- ================================================
-- Description: 
--   1. Add territories for all major countries/regions
--   2. Create comprehensive ISO country code to territory mapping
--   3. Backfill all distributors, orders, and sales_data
-- Date: 2025-12-08
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. ADD MISSING TERRITORIES
-- ================================================

-- Get region IDs for reference
DO $$
DECLARE
  v_gcc_region_id UUID;
  v_levant_region_id UUID;
  v_mena_region_id UUID;
  v_europe_region_id UUID;
  v_nam_region_id UUID;
  v_latam_region_id UUID;
  v_apac_region_id UUID;
  v_africa_region_id UUID;
  v_other_region_id UUID;
BEGIN
  -- Get existing region IDs
  SELECT id INTO v_gcc_region_id FROM regions WHERE code = 'GCC';
  SELECT id INTO v_levant_region_id FROM regions WHERE code = 'LEVANT';
  SELECT id INTO v_mena_region_id FROM regions WHERE code = 'MENA';
  SELECT id INTO v_europe_region_id FROM regions WHERE code = 'EUR';
  SELECT id INTO v_nam_region_id FROM regions WHERE code = 'NAM';
  SELECT id INTO v_latam_region_id FROM regions WHERE code = 'LATAM';
  SELECT id INTO v_apac_region_id FROM regions WHERE code = 'APAC';
  SELECT id INTO v_africa_region_id FROM regions WHERE code = 'AFR';
  SELECT id INTO v_other_region_id FROM regions WHERE code = 'OTHER';

  -- ================================================
  -- AFRICA TERRITORIES
  -- ================================================
  INSERT INTO territories (name, code, region_id, is_active, display_order, countries)
  VALUES 
    ('South Africa', 'ZA', v_africa_region_id, TRUE, 50, ARRAY['ZA', 'SOUTH AFRICA']),
    ('Nigeria', 'NG', v_africa_region_id, TRUE, 51, ARRAY['NG', 'NIGERIA']),
    ('Kenya', 'KE', v_africa_region_id, TRUE, 52, ARRAY['KE', 'KENYA']),
    ('Ghana', 'GH', v_africa_region_id, TRUE, 53, ARRAY['GH', 'GHANA']),
    ('Ethiopia', 'ET', v_africa_region_id, TRUE, 54, ARRAY['ET', 'ETHIOPIA']),
    ('Tanzania', 'TZ', v_africa_region_id, TRUE, 55, ARRAY['TZ', 'TANZANIA']),
    ('Uganda', 'UG', v_africa_region_id, TRUE, 56, ARRAY['UG', 'UGANDA']),
    ('Senegal', 'SN', v_africa_region_id, TRUE, 57, ARRAY['SN', 'SENEGAL']),
    ('Ivory Coast', 'CI', v_africa_region_id, TRUE, 58, ARRAY['CI', 'IVORY COAST', 'COTE D''IVOIRE']),
    ('Cameroon', 'CM', v_africa_region_id, TRUE, 59, ARRAY['CM', 'CAMEROON']),
    ('Other Africa', 'AFR_OTHER', v_africa_region_id, TRUE, 69, ARRAY[]::TEXT[])
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- ASIA PACIFIC TERRITORIES
  -- ================================================
  INSERT INTO territories (name, code, region_id, is_active, display_order, countries)
  VALUES 
    ('China', 'CN', v_apac_region_id, TRUE, 70, ARRAY['CN', 'CHINA']),
    ('Japan', 'JP', v_apac_region_id, TRUE, 71, ARRAY['JP', 'JAPAN']),
    ('South Korea', 'KR', v_apac_region_id, TRUE, 72, ARRAY['KR', 'SOUTH KOREA', 'KOREA']),
    ('India', 'IN', v_apac_region_id, TRUE, 73, ARRAY['IN', 'INDIA']),
    ('Australia', 'AU', v_apac_region_id, TRUE, 74, ARRAY['AU', 'AUSTRALIA']),
    ('New Zealand', 'NZ', v_apac_region_id, TRUE, 75, ARRAY['NZ', 'NEW ZEALAND']),
    ('Singapore', 'SG', v_apac_region_id, TRUE, 76, ARRAY['SG', 'SINGAPORE']),
    ('Malaysia', 'MY', v_apac_region_id, TRUE, 77, ARRAY['MY', 'MALAYSIA']),
    ('Indonesia', 'ID', v_apac_region_id, TRUE, 78, ARRAY['ID', 'INDONESIA']),
    ('Thailand', 'TH', v_apac_region_id, TRUE, 79, ARRAY['TH', 'THAILAND']),
    ('Vietnam', 'VN', v_apac_region_id, TRUE, 80, ARRAY['VN', 'VIETNAM']),
    ('Philippines', 'PH', v_apac_region_id, TRUE, 81, ARRAY['PH', 'PHILIPPINES']),
    ('Hong Kong', 'HK', v_apac_region_id, TRUE, 82, ARRAY['HK', 'HONG KONG']),
    ('Taiwan', 'TW', v_apac_region_id, TRUE, 83, ARRAY['TW', 'TAIWAN']),
    ('Pakistan', 'PK', v_apac_region_id, TRUE, 84, ARRAY['PK', 'PAKISTAN']),
    ('Bangladesh', 'BD', v_apac_region_id, TRUE, 85, ARRAY['BD', 'BANGLADESH']),
    ('Sri Lanka', 'LK', v_apac_region_id, TRUE, 86, ARRAY['LK', 'SRI LANKA']),
    ('Other Asia Pacific', 'APAC_OTHER', v_apac_region_id, TRUE, 89, ARRAY[]::TEXT[])
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- LATIN AMERICA TERRITORIES
  -- ================================================
  INSERT INTO territories (name, code, region_id, is_active, display_order, countries)
  VALUES 
    ('Brazil', 'BR', v_latam_region_id, TRUE, 90, ARRAY['BR', 'BRAZIL']),
    ('Mexico', 'MX', v_latam_region_id, TRUE, 91, ARRAY['MX', 'MEXICO']),
    ('Argentina', 'AR', v_latam_region_id, TRUE, 92, ARRAY['AR', 'ARGENTINA']),
    ('Colombia', 'CO', v_latam_region_id, TRUE, 93, ARRAY['CO', 'COLOMBIA']),
    ('Chile', 'CL', v_latam_region_id, TRUE, 94, ARRAY['CL', 'CHILE']),
    ('Peru', 'PE', v_latam_region_id, TRUE, 95, ARRAY['PE', 'PERU']),
    ('Venezuela', 'VE', v_latam_region_id, TRUE, 96, ARRAY['VE', 'VENEZUELA']),
    ('Ecuador', 'EC', v_latam_region_id, TRUE, 97, ARRAY['EC', 'ECUADOR']),
    ('Guatemala', 'GT', v_latam_region_id, TRUE, 98, ARRAY['GT', 'GUATEMALA']),
    ('Cuba', 'CU', v_latam_region_id, TRUE, 99, ARRAY['CU', 'CUBA']),
    ('Dominican Republic', 'DO', v_latam_region_id, TRUE, 100, ARRAY['DO', 'DOMINICAN REPUBLIC']),
    ('Costa Rica', 'CR', v_latam_region_id, TRUE, 101, ARRAY['CR', 'COSTA RICA']),
    ('Panama', 'PA', v_latam_region_id, TRUE, 102, ARRAY['PA', 'PANAMA']),
    ('Uruguay', 'UY', v_latam_region_id, TRUE, 103, ARRAY['UY', 'URUGUAY']),
    ('Puerto Rico', 'PR', v_latam_region_id, TRUE, 104, ARRAY['PR', 'PUERTO RICO']),
    ('Other Latin America', 'LATAM_OTHER', v_latam_region_id, TRUE, 109, ARRAY[]::TEXT[])
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- NORTH AMERICA TERRITORIES (additional)
  -- ================================================
  INSERT INTO territories (name, code, region_id, is_active, display_order, countries)
  VALUES 
    ('Canada', 'CA', v_nam_region_id, TRUE, 41, ARRAY['CA', 'CANADA'])
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- EUROPE TERRITORIES (additional)
  -- ================================================
  INSERT INTO territories (name, code, region_id, is_active, display_order, countries)
  VALUES 
    ('Spain', 'ES', v_europe_region_id, TRUE, 36, ARRAY['ES', 'SPAIN']),
    ('Italy', 'IT', v_europe_region_id, TRUE, 37, ARRAY['IT', 'ITALY']),
    ('Portugal', 'PT', v_europe_region_id, TRUE, 38, ARRAY['PT', 'PORTUGAL']),
    ('Poland', 'PL', v_europe_region_id, TRUE, 39, ARRAY['PL', 'POLAND']),
    ('Switzerland', 'CH', v_europe_region_id, TRUE, 42, ARRAY['CH', 'SWITZERLAND']),
    ('Austria', 'AT', v_europe_region_id, TRUE, 43, ARRAY['AT', 'AUSTRIA']),
    ('Ireland', 'IE', v_europe_region_id, TRUE, 44, ARRAY['IE', 'IRELAND']),
    ('Greece', 'GR', v_europe_region_id, TRUE, 45, ARRAY['GR', 'GREECE']),
    ('Czech Republic', 'CZ', v_europe_region_id, TRUE, 46, ARRAY['CZ', 'CZECH REPUBLIC', 'CZECHIA']),
    ('Romania', 'RO', v_europe_region_id, TRUE, 47, ARRAY['RO', 'ROMANIA']),
    ('Hungary', 'HU', v_europe_region_id, TRUE, 48, ARRAY['HU', 'HUNGARY']),
    ('Russia', 'RU', v_europe_region_id, TRUE, 49, ARRAY['RU', 'RUSSIA']),
    ('Turkey', 'TR', v_europe_region_id, TRUE, 50, ARRAY['TR', 'TURKEY']),
    ('Other Europe', 'EUR_OTHER', v_europe_region_id, TRUE, 59, ARRAY[]::TEXT[])
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- OTHER TERRITORIES
  -- ================================================
  INSERT INTO territories (name, code, region_id, is_active, display_order, countries)
  VALUES 
    ('Other', 'OTHER', v_other_region_id, TRUE, 999, ARRAY[]::TEXT[])
  ON CONFLICT DO NOTHING;

END $$;

-- ================================================
-- 2. UPDATE EXISTING TERRITORIES WITH COUNTRIES ARRAY
-- ================================================
-- Add country codes to existing territories that might be missing them

UPDATE territories SET countries = ARRAY['AE', 'UAE', 'UNITED ARAB EMIRATES'] WHERE code = 'UAE' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['SA', 'KSA', 'SAUDI ARABIA'] WHERE code = 'KSA' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['KW', 'KUWAIT'] WHERE code = 'KUWAIT' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['QA', 'QATAR'] WHERE code = 'QATAR' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['BH', 'BAHRAIN'] WHERE code = 'BAHRAIN' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['OM', 'OMAN'] WHERE code = 'OMAN' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['JO', 'JORDAN'] WHERE code = 'JORDAN' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['LB', 'LEBANON'] WHERE code = 'LEBANON' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['IQ', 'IRAQ'] WHERE code = 'IRAQ' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['EG', 'EGYPT'] WHERE code = 'EGYPT' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['MA', 'MOROCCO'] WHERE code = 'MOROCCO' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['TN', 'TUNISIA'] WHERE code = 'TUNISIA' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['DZ', 'ALGERIA'] WHERE code = 'ALGERIA' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['GB', 'UK', 'UNITED KINGDOM', 'GREAT BRITAIN'] WHERE code = 'UK' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['DE', 'GERMANY'] WHERE code = 'GERMANY' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['FR', 'FRANCE'] WHERE code = 'FRANCE' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['NL', 'BE', 'LU', 'NETHERLANDS', 'BELGIUM', 'LUXEMBOURG', 'BENELUX'] WHERE code = 'BENELUX' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['SE', 'NO', 'DK', 'FI', 'IS', 'SWEDEN', 'NORWAY', 'DENMARK', 'FINLAND', 'ICELAND', 'NORDICS'] WHERE code = 'NORDICS' AND (countries IS NULL OR array_length(countries, 1) IS NULL);
UPDATE territories SET countries = ARRAY['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'] WHERE code = 'USA' AND (countries IS NULL OR array_length(countries, 1) IS NULL);

-- ================================================
-- 3. ENHANCED: find_territory_by_country function
-- ================================================
-- Complete rewrite with comprehensive country code mapping

CREATE OR REPLACE FUNCTION find_territory_by_country(
  p_country_code TEXT,
  p_brand_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_territory_id UUID;
  v_normalized_country TEXT;
BEGIN
  -- Handle NULL or empty input
  IF p_country_code IS NULL OR TRIM(p_country_code) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Normalize the country input (uppercase, trimmed)
  v_normalized_country := UPPER(TRIM(p_country_code));
  
  -- 1. First try: Match by territory NAME (case-insensitive exact match)
  SELECT t.id INTO v_territory_id
  FROM territories t
  WHERE UPPER(t.name) = v_normalized_country
    AND t.is_active = TRUE
  ORDER BY t.display_order ASC
  LIMIT 1;
  
  IF v_territory_id IS NOT NULL THEN
    RETURN v_territory_id;
  END IF;
  
  -- 2. Second try: Match by territory CODE
  SELECT t.id INTO v_territory_id
  FROM territories t
  WHERE UPPER(t.code) = v_normalized_country
    AND t.is_active = TRUE
  ORDER BY t.display_order ASC
  LIMIT 1;
  
  IF v_territory_id IS NOT NULL THEN
    RETURN v_territory_id;
  END IF;
  
  -- 3. Third try: Check if country is in the territory's countries array
  SELECT t.id INTO v_territory_id
  FROM territories t
  WHERE t.countries IS NOT NULL
    AND array_length(t.countries, 1) > 0
    AND (
      v_normalized_country = ANY(
        SELECT UPPER(unnest) FROM unnest(t.countries)
      )
    )
    AND t.is_active = TRUE
  ORDER BY t.display_order ASC
  LIMIT 1;
  
  IF v_territory_id IS NOT NULL THEN
    RETURN v_territory_id;
  END IF;
  
  -- 4. Fourth try: Partial name match (contains)
  SELECT t.id INTO v_territory_id
  FROM territories t
  WHERE t.is_active = TRUE
    AND (
      UPPER(t.name) LIKE '%' || v_normalized_country || '%' OR
      v_normalized_country LIKE '%' || UPPER(t.name) || '%'
    )
  ORDER BY t.display_order ASC
  LIMIT 1;
  
  IF v_territory_id IS NOT NULL THEN
    RETURN v_territory_id;
  END IF;

  -- If still no match, return NULL (unknown territory)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_territory_by_country IS 'Comprehensive function to find territory by country name, code, or from countries array';

-- ================================================
-- 4. BACKFILL: Distributors territory_id
-- ================================================

-- Update distributors using the enhanced function
UPDATE distributors d
SET 
  territory_id = find_territory_by_country(d.country, d.brand_id),
  region_id = get_region_for_territory(find_territory_by_country(d.country, d.brand_id)),
  updated_at = NOW()
WHERE d.territory_id IS NULL
  AND d.country IS NOT NULL
  AND TRIM(d.country) != ''
  AND find_territory_by_country(d.country, d.brand_id) IS NOT NULL;

-- ================================================
-- 5. BACKFILL: Orders territory_id
-- ================================================

-- From distributor
UPDATE orders o
SET 
  territory_id = d.territory_id,
  region_id = d.region_id,
  updated_at = NOW()
FROM distributors d
WHERE o.distributor_id = d.id
  AND o.territory_id IS NULL
  AND d.territory_id IS NOT NULL;

-- From shipping_country
UPDATE orders o
SET 
  territory_id = find_territory_by_country(o.shipping_country, o.brand_id),
  region_id = get_region_for_territory(find_territory_by_country(o.shipping_country, o.brand_id)),
  updated_at = NOW()
WHERE o.territory_id IS NULL
  AND o.shipping_country IS NOT NULL
  AND TRIM(o.shipping_country) != ''
  AND find_territory_by_country(o.shipping_country, o.brand_id) IS NOT NULL;

-- ================================================
-- 6. BACKFILL: Sales Data territory_id
-- ================================================

-- From linked order
UPDATE sales_data sd
SET 
  territory_id = o.territory_id,
  region_id = o.region_id,
  updated_at = NOW()
FROM orders o
WHERE sd.order_id = o.id
  AND sd.territory_id IS NULL
  AND o.territory_id IS NOT NULL;

-- From linked distributor
UPDATE sales_data sd
SET 
  territory_id = d.territory_id,
  region_id = d.region_id,
  updated_at = NOW()
FROM distributors d
WHERE sd.distributor_id = d.id
  AND sd.territory_id IS NULL
  AND d.territory_id IS NOT NULL;

-- From territory text field
UPDATE sales_data sd
SET
  territory_id = find_territory_by_country(sd.territory, sd.brand_id),
  region_id = get_region_for_territory(find_territory_by_country(sd.territory, sd.brand_id)),
  updated_at = NOW()
WHERE sd.territory IS NOT NULL
  AND sd.territory_id IS NULL
  AND find_territory_by_country(sd.territory, sd.brand_id) IS NOT NULL;

-- From territory_country field
UPDATE sales_data sd
SET
  territory_id = find_territory_by_country(sd.territory_country, sd.brand_id),
  region_id = get_region_for_territory(find_territory_by_country(sd.territory_country, sd.brand_id)),
  updated_at = NOW()
WHERE sd.territory_id IS NULL
  AND sd.territory_country IS NOT NULL
  AND TRIM(UPPER(sd.territory_country)) != ''
  AND find_territory_by_country(sd.territory_country, sd.brand_id) IS NOT NULL;

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately)
-- ================================================

-- Check new territories
-- SELECT name, code, r.name as region_name, countries 
-- FROM territories t 
-- JOIN regions r ON t.region_id = r.id 
-- ORDER BY t.display_order;

-- Check distributors backfill
-- SELECT d.name, d.country, t.name as territory_name, r.name as region_name
-- FROM distributors d
-- LEFT JOIN territories t ON d.territory_id = t.id
-- LEFT JOIN regions r ON d.region_id = r.id;

-- Check orders backfill
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory FROM orders;

-- Check sales_data backfill
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory, COUNT(region_id) as with_region FROM sales_data;

-- Summary by region
-- SELECT r.name as region, COUNT(*) as sales_count
-- FROM sales_data sd
-- LEFT JOIN regions r ON sd.region_id = r.id
-- GROUP BY r.name
-- ORDER BY sales_count DESC;
