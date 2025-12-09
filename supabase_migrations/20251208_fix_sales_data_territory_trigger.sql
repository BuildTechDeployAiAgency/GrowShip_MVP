-- ================================================
-- Migration: Fix Sales Data Territory Trigger
-- ================================================
-- Description: Add trigger to auto-populate territory_id and region_id 
--   for sales_data records when they are inserted or updated
-- Date: 2025-12-08
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. TRIGGER FUNCTION: Auto-assign territory to sales_data
-- ================================================
-- This function populates territory_id and region_id for sales_data records
-- following the same logic as the backfill script:
-- 1. Try matching by territory text field (name or code)
-- 2. Try matching by country code
-- 3. Try from linked order
-- 4. Try from distributor

CREATE OR REPLACE FUNCTION auto_assign_sales_data_territory()
RETURNS TRIGGER AS $$
DECLARE
  v_territory_id UUID;
  v_region_id UUID;
  v_country_code TEXT;
BEGIN
  -- Only process if territory_id is NULL (don't overwrite existing values)
  IF NEW.territory_id IS NOT NULL THEN
    -- If territory_id is set but region_id is not, populate region_id
    IF NEW.region_id IS NULL THEN
      NEW.region_id := get_region_for_territory(NEW.territory_id);
    END IF;
    RETURN NEW;
  END IF;

  -- 1. Try matching by existing territory text field (name or code)
  IF NEW.territory IS NOT NULL THEN
    SELECT t.id, t.region_id INTO v_territory_id, v_region_id
    FROM territories t
    WHERE (
      UPPER(TRIM(NEW.territory)) = UPPER(t.name) OR
      UPPER(TRIM(NEW.territory)) = UPPER(t.code)
    )
    AND t.is_active = TRUE
    ORDER BY t.display_order ASC
    LIMIT 1;
    
    IF v_territory_id IS NOT NULL THEN
      NEW.territory_id := v_territory_id;
      NEW.region_id := v_region_id;
      RETURN NEW;
    END IF;
  END IF;

  -- 2. Try matching by country code
  IF NEW.territory_country IS NOT NULL THEN
    v_country_code := UPPER(TRIM(NEW.territory_country));
    IF v_country_code != '' THEN
      v_territory_id := find_territory_by_country(v_country_code, NEW.brand_id);
      IF v_territory_id IS NOT NULL THEN
        NEW.territory_id := v_territory_id;
        NEW.region_id := get_region_for_territory(v_territory_id);
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  -- 3. Try from linked order
  IF NEW.order_id IS NOT NULL THEN
    SELECT o.territory_id, o.region_id INTO v_territory_id, v_region_id
    FROM orders o
    WHERE o.id = NEW.order_id
      AND o.territory_id IS NOT NULL
    LIMIT 1;
    
    IF v_territory_id IS NOT NULL THEN
      NEW.territory_id := v_territory_id;
      NEW.region_id := v_region_id;
      RETURN NEW;
    END IF;
  END IF;

  -- 4. Try from distributor
  IF NEW.distributor_id IS NOT NULL THEN
    SELECT d.territory_id, d.region_id INTO v_territory_id, v_region_id
    FROM distributors d
    WHERE d.id = NEW.distributor_id
      AND d.territory_id IS NOT NULL
    LIMIT 1;
    
    IF v_territory_id IS NOT NULL THEN
      NEW.territory_id := v_territory_id;
      NEW.region_id := v_region_id;
      RETURN NEW;
    END IF;
  END IF;

  -- If we couldn't find a territory, leave it NULL
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_assign_sales_data_territory IS 'Auto-populates territory_id and region_id for sales_data records based on territory text, country, order, or distributor';

-- ================================================
-- 2. CREATE TRIGGER
-- ================================================

DROP TRIGGER IF EXISTS trigger_auto_assign_sales_data_territory ON sales_data;
CREATE TRIGGER trigger_auto_assign_sales_data_territory
  BEFORE INSERT OR UPDATE ON sales_data
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_sales_data_territory();

COMMENT ON TRIGGER trigger_auto_assign_sales_data_territory ON sales_data IS 'Automatically populates territory_id and region_id when sales_data records are inserted or updated';

-- ================================================
-- 3. BACKFILL: Update existing sales_data records
-- ================================================
-- Update any existing sales_data records that are missing territory_id/region_id
-- This uses the same logic as the trigger function

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
  )
  AND t.is_active = TRUE;

-- Then try matching by country
UPDATE sales_data sd
SET 
  territory_id = find_territory_by_country(sd.territory_country, sd.brand_id),
  region_id = get_region_for_territory(find_territory_by_country(sd.territory_country, sd.brand_id)),
  updated_at = NOW()
WHERE sd.territory_id IS NULL
  AND sd.territory_country IS NOT NULL
  AND TRIM(UPPER(sd.territory_country)) != '';

-- Then try from linked order
UPDATE sales_data sd
SET 
  territory_id = o.territory_id,
  region_id = o.region_id,
  updated_at = NOW()
FROM orders o
WHERE sd.order_id = o.id
  AND sd.territory_id IS NULL
  AND o.territory_id IS NOT NULL;

-- Finally, try from distributor
UPDATE sales_data sd
SET 
  territory_id = d.territory_id,
  region_id = d.region_id,
  updated_at = NOW()
FROM distributors d
WHERE sd.distributor_id = d.id
  AND sd.territory_id IS NULL
  AND d.territory_id IS NOT NULL;

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately)
-- ================================================
-- SELECT COUNT(*) as total, COUNT(territory_id) as with_territory, COUNT(*) - COUNT(territory_id) as missing_territory FROM sales_data;
-- SELECT COUNT(*) as total, COUNT(region_id) as with_region, COUNT(*) - COUNT(region_id) as missing_region FROM sales_data;
