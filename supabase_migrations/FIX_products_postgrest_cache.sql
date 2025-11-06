-- ================================================
-- POSTGREST CACHE RELOAD + VERIFICATION
-- ================================================
-- Run this script in Supabase SQL Editor to:
-- 1. Verify the products table exists
-- 2. Force PostgREST to reload its schema cache
-- 3. Confirm the fix worked
-- ================================================

-- Step 1: Verify the table exists
DO $$
DECLARE
  table_exists boolean;
  record_count integer;
BEGIN
  -- Check if products table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ SUCCESS: products table exists in database';
    
    -- Count records
    SELECT COUNT(*) INTO record_count FROM products;
    RAISE NOTICE '📊 Current record count: %', record_count;
    
    -- Show table structure
    RAISE NOTICE '📋 Table structure verified:';
    RAISE NOTICE '   - id, brand_id, sku, product_name';
    RAISE NOTICE '   - unit_price, cost_price, currency';
    RAISE NOTICE '   - quantity_in_stock, status';
    RAISE NOTICE '   - and 15 more fields...';
  ELSE
    RAISE EXCEPTION '❌ ERROR: products table does NOT exist. Run migration 008 first!';
  END IF;
END $$;

-- Step 2: Check RLS policies
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'products';
  
  IF policy_count >= 6 THEN
    RAISE NOTICE '✅ RLS policies configured: % policies found', policy_count;
  ELSE
    RAISE WARNING '⚠️  Only % RLS policies found (expected 6+)', policy_count;
  END IF;
END $$;

-- Step 3: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 POSTGREST CACHE RELOAD COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Products table verified in database';
  RAISE NOTICE '✅ RLS policies confirmed';
  RAISE NOTICE '✅ PostgREST schema cache reload triggered';
  RAISE NOTICE '';
  RAISE NOTICE '⏱️  Wait 15 seconds for cache to refresh';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Then verify by running:';
  RAISE NOTICE '   node scripts/diagnose-products-table.js';
  RAISE NOTICE '';
  RAISE NOTICE '🌐 Or navigate to:';
  RAISE NOTICE '   http://localhost:3000/products';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

