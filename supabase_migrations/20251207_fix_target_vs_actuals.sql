-- ================================================
-- Migration: Fix Target Vs Actuals Dashboard
-- ================================================
-- Description: Refresh materialized view and diagnose data issues
-- Date: 2025-12-07
-- Author: GrowShip MVP Team
-- ================================================

-- ================================================
-- 1. REFRESH THE MATERIALIZED VIEW
-- ================================================
-- This is required after adding new data to sales_data

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'target_vs_actual_view') THEN
    REFRESH MATERIALIZED VIEW target_vs_actual_view;
    RAISE NOTICE '✅ Refreshed target_vs_actual_view materialized view';
  ELSE
    RAISE NOTICE '⚠️ target_vs_actual_view does not exist. Creating it now...';
  END IF;
END $$;


-- ================================================
-- 2. DIAGNOSTIC QUERIES (Check your data)
-- ================================================

-- Check sales_targets count
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM sales_targets;
  RAISE NOTICE 'sales_targets table has % records', v_count;
END $$;

-- Check sales_data count  
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM sales_data;
  RAISE NOTICE 'sales_data table has % records', v_count;
END $$;

-- Check target_vs_actual_view count
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'target_vs_actual_view') THEN
    SELECT COUNT(*) INTO v_count FROM target_vs_actual_view;
    RAISE NOTICE 'target_vs_actual_view has % records', v_count;
  ELSE
    RAISE NOTICE 'target_vs_actual_view does not exist';
  END IF;
END $$;


-- ================================================
-- 3. CREATE SAMPLE TARGETS IF NONE EXIST
-- ================================================
-- This creates monthly targets for testing if sales_targets is empty

DO $$
DECLARE
  v_brand_id UUID;
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Check if sales_targets is empty
  SELECT COUNT(*) INTO v_count FROM sales_targets;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'sales_targets already has % records. Skipping sample data creation.', v_count;
    RETURN;
  END IF;
  
  -- Get a brand_id from sales_data (use the brand that has data)
  SELECT DISTINCT brand_id INTO v_brand_id 
  FROM sales_data 
  WHERE brand_id IS NOT NULL 
  LIMIT 1;
  
  IF v_brand_id IS NULL THEN
    -- Fallback: get any brand
    SELECT id INTO v_brand_id FROM brands LIMIT 1;
  END IF;
  
  IF v_brand_id IS NULL THEN
    RAISE NOTICE '⚠️ No brand_id found. Cannot create sample targets.';
    RETURN;
  END IF;
  
  -- Get a user_id for created_by
  SELECT user_id INTO v_user_id FROM user_profiles WHERE brand_id = v_brand_id LIMIT 1;
  
  RAISE NOTICE 'Creating sample targets for brand_id: %', v_brand_id;
  
  -- Create monthly targets for 2025
  INSERT INTO sales_targets (brand_id, target_period, period_type, target_revenue, target_scope, target_name, created_by)
  VALUES 
    (v_brand_id, '2025-01-01', 'monthly', 50000, 'brand', 'January 2025 Target', v_user_id),
    (v_brand_id, '2025-02-01', 'monthly', 55000, 'brand', 'February 2025 Target', v_user_id),
    (v_brand_id, '2025-03-01', 'monthly', 60000, 'brand', 'March 2025 Target', v_user_id),
    (v_brand_id, '2025-04-01', 'monthly', 65000, 'brand', 'April 2025 Target', v_user_id),
    (v_brand_id, '2025-05-01', 'monthly', 70000, 'brand', 'May 2025 Target', v_user_id),
    (v_brand_id, '2025-06-01', 'monthly', 75000, 'brand', 'June 2025 Target', v_user_id),
    (v_brand_id, '2025-07-01', 'monthly', 80000, 'brand', 'July 2025 Target', v_user_id),
    (v_brand_id, '2025-08-01', 'monthly', 85000, 'brand', 'August 2025 Target', v_user_id),
    (v_brand_id, '2025-09-01', 'monthly', 90000, 'brand', 'September 2025 Target', v_user_id),
    (v_brand_id, '2025-10-01', 'monthly', 95000, 'brand', 'October 2025 Target', v_user_id),
    (v_brand_id, '2025-11-01', 'monthly', 100000, 'brand', 'November 2025 Target', v_user_id),
    (v_brand_id, '2025-12-01', 'monthly', 105000, 'brand', 'December 2025 Target', v_user_id)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Created 12 monthly sample targets for 2025';
END $$;


-- ================================================
-- 4. REFRESH VIEW AGAIN (after adding targets)
-- ================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'target_vs_actual_view') THEN
    REFRESH MATERIALIZED VIEW target_vs_actual_view;
    RAISE NOTICE '✅ Refreshed target_vs_actual_view again after adding targets';
  END IF;
END $$;


-- ================================================
-- 5. VERIFY VIEW DATA
-- ================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'target_vs_actual_view') THEN
    SELECT COUNT(*) INTO v_count FROM target_vs_actual_view;
    RAISE NOTICE '✅ target_vs_actual_view now has % records', v_count;
  END IF;
END $$;

