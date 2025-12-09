-- ================================================
-- Migration: Comprehensive Territory Backfill Fix
-- ================================================
-- Description: Fix territory population by:
--   1. Enhancing find_territory_by_country to match by name
--   2. Backfilling distributors based on country name
--   3. Backfilling orders from distributors
--   4. Backfilling sales_data from orders/distributors
-- Date: 2025-12-08
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. ENHANCED: find_territory_by_country function
-- ================================================
-- Updated to also match by territory NAME (not just code/countries array)
-- This allows "Qatar" country to match "Qatar" territory

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
  
  -- 1. First try: Match by territory NAME (case-insensitive)
  -- This handles cases like "Qatar" -> "Qatar" territory
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
  -- This handles cases like "QATAR" -> "QATAR" territory code
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
    AND (
      v_normalized_country = ANY(t.countries) OR
      EXISTS (
        SELECT 1 FROM unnest(t.countries) c 
        WHERE UPPER(c) = v_normalized_country
      )
    )
    AND t.is_active = TRUE
  ORDER BY t.display_order ASC
  LIMIT 1;
  
  IF v_territory_id IS NOT NULL THEN
    RETURN v_territory_id;
  END IF;
  
  -- 4. Fourth try: Common country code mappings
  -- Map ISO 2-letter codes to territory names
  SELECT t.id INTO v_territory_id
  FROM territories t
  WHERE t.is_active = TRUE
    AND (
      -- GCC countries
      (v_normalized_country = 'AE' AND UPPER(t.code) = 'UAE') OR
      (v_normalized_country = 'SA' AND UPPER(t.code) = 'KSA') OR
      (v_normalized_country = 'KW' AND UPPER(t.code) = 'KUWAIT') OR
      (v_normalized_country = 'QA' AND UPPER(t.code) = 'QATAR') OR
      (v_normalized_country = 'BH' AND UPPER(t.code) = 'BAHRAIN') OR
      (v_normalized_country = 'OM' AND UPPER(t.code) = 'OMAN') OR
      -- Levant
      (v_normalized_country = 'JO' AND UPPER(t.code) = 'JORDAN') OR
      (v_normalized_country = 'LB' AND UPPER(t.code) = 'LEBANON') OR
      (v_normalized_country = 'IQ' AND UPPER(t.code) = 'IRAQ') OR
      -- North Africa
      (v_normalized_country = 'EG' AND UPPER(t.code) = 'EGYPT') OR
      (v_normalized_country = 'MA' AND UPPER(t.code) = 'MOROCCO') OR
      (v_normalized_country = 'TN' AND UPPER(t.code) = 'TUNISIA') OR
      (v_normalized_country = 'DZ' AND UPPER(t.code) = 'ALGERIA') OR
      -- Europe
      (v_normalized_country = 'GB' AND UPPER(t.code) = 'UK') OR
      (v_normalized_country = 'DE' AND UPPER(t.code) = 'GERMANY') OR
      (v_normalized_country = 'FR' AND UPPER(t.code) = 'FRANCE') OR
      -- Americas
      (v_normalized_country = 'US' AND UPPER(t.code) = 'USA') OR
      -- South Africa -> Africa region (needs special handling)
      (v_normalized_country = 'ZA' AND UPPER(t.name) = 'SOUTH AFRICA')
    )
  ORDER BY t.display_order ASC
  LIMIT 1;
  
  RETURN v_territory_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_territory_by_country IS 'Enhanced function to find territory by country name, code, or ISO code';

-- ================================================
-- 2. BACKFILL: Distributors territory_id
-- ================================================
-- Update distributors that have country but missing territory_id

-- First, try matching by territory name (e.g., "Qatar" -> Qatar territory)
UPDATE distributors d
SET 
  territory_id = t.id,
  region_id = t.region_id,
  updated_at = NOW()
FROM territories t
WHERE d.territory_id IS NULL
  AND d.country IS NOT NULL
  AND TRIM(d.country) != ''
  AND UPPER(TRIM(d.country)) = UPPER(t.name)
  AND t.is_active = TRUE;

-- Second, try matching by territory code
UPDATE distributors d
SET 
  territory_id = t.id,
  region_id = t.region_id,
  updated_at = NOW()
FROM territories t
WHERE d.territory_id IS NULL
  AND d.country IS NOT NULL
  AND TRIM(d.country) != ''
  AND UPPER(TRIM(d.country)) = UPPER(t.code)
  AND t.is_active = TRUE;

-- Third, use the enhanced find_territory_by_country function
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
-- 3. BACKFILL: Orders territory_id
-- ================================================
-- Update orders from their linked distributor

UPDATE orders o
SET 
  territory_id = d.territory_id,
  region_id = d.region_id,
  updated_at = NOW()
FROM distributors d
WHERE o.distributor_id = d.id
  AND o.territory_id IS NULL
  AND d.territory_id IS NOT NULL;

-- Also try from shipping_country if available
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
-- 4. BACKFILL: Sales Data territory_id
-- ================================================

-- 4a. From linked order
UPDATE sales_data sd
SET 
  territory_id = o.territory_id,
  region_id = o.region_id,
  updated_at = NOW()
FROM orders o
WHERE sd.order_id = o.id
  AND sd.territory_id IS NULL
  AND o.territory_id IS NOT NULL;

-- 4b. From linked distributor
UPDATE sales_data sd
SET 
  territory_id = d.territory_id,
  region_id = d.region_id,
  updated_at = NOW()
FROM distributors d
WHERE sd.distributor_id = d.id
  AND sd.territory_id IS NULL
  AND d.territory_id IS NOT NULL;

-- 4c. From territory text field (match by name or code)
UPDATE sales_data sd
SET
  territory_id = t.id,
  region_id = t.region_id,
  updated_at = NOW()
FROM territories t
WHERE sd.territory IS NOT NULL
  AND sd.territory_id IS NULL
  AND (
    UPPER(TRIM(sd.territory)) = UPPER(t.name) OR
    UPPER(TRIM(sd.territory)) = UPPER(t.code)
  )
  AND t.is_active = TRUE;

-- 4d. From territory_country field
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
-- VERIFICATION QUERIES (run separately after migration)
-- ================================================

-- Check distributors
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory FROM distributors;

-- Check orders
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory FROM orders;

-- Check sales_data
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory, COUNT(region_id) as with_region FROM sales_data;

-- Detailed breakdown
-- SELECT 
--   CASE WHEN territory_id IS NOT NULL THEN 'Has Territory' ELSE 'Missing Territory' END as status,
--   COUNT(*) as count
-- FROM sales_data
-- GROUP BY CASE WHEN territory_id IS NOT NULL THEN 'Has Territory' ELSE 'Missing Territory' END;
