-- =====================================================
-- Verification: Brand Schema Refactoring
-- =====================================================
-- Description: Comprehensive verification queries for the brand refactoring migration
-- Date: 2025-11-04
-- Author: GrowShip Team
-- Usage: Run these queries individually to verify migration success
-- =====================================================

-- ================================================
-- 1. TABLE EXISTENCE VERIFICATION
-- ================================================

-- Verify brands table exists
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'brands'
  ) as brands_table_exists;

-- Verify organizations table does NOT exist (should be renamed)
SELECT 
  NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) as organizations_table_renamed;

-- ================================================
-- 2. COLUMN VERIFICATION
-- ================================================

-- Verify all tables have brand_id instead of organization_id
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name = 'brand_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Verify no tables still have organization_id (except archived tables)
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE column_name = 'organization_id'
  AND table_schema = 'public'
  AND table_name NOT LIKE '%_archived%'
ORDER BY table_name;
-- Should return 0 rows

-- Verify distributor_id columns exist
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name = 'distributor_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- ================================================
-- 3. FOREIGN KEY CONSTRAINT VERIFICATION
-- ================================================

-- Verify all brand_id foreign keys
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'brand_id'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Verify all distributor_id foreign keys
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'distributor_id'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ================================================
-- 4. INDEX VERIFICATION
-- ================================================

-- Verify brand_id indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%brand_id%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify distributor_id indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%distributor_id%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify composite indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE (indexname LIKE '%brand_distributor%' OR indexdef LIKE '%brand_id%distributor_id%')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ================================================
-- 5. DATA INTEGRITY VERIFICATION
-- ================================================

-- Count records in brands table
SELECT COUNT(*) as brand_count FROM brands;

-- Verify no non-brand records in brands table
SELECT COUNT(*) as non_brand_count 
FROM brands 
WHERE organization_type != 'brand';
-- Should return 0

-- Count archived organizations
SELECT COUNT(*) as archived_count FROM organizations_archived;

-- Verify distributors all have brand_id
SELECT 
  COUNT(*) as total_distributors,
  COUNT(brand_id) as distributors_with_brand,
  COUNT(*) - COUNT(brand_id) as distributors_without_brand
FROM distributors;
-- distributors_without_brand should be 0

-- Verify manufacturers all have brand_id
SELECT 
  COUNT(*) as total_manufacturers,
  COUNT(brand_id) as manufacturers_with_brand,
  COUNT(*) - COUNT(brand_id) as manufacturers_without_brand
FROM manufacturers;
-- manufacturers_without_brand should be 0

-- Verify no orphaned distributors (brand_id references valid brand)
SELECT COUNT(*) as orphaned_distributors
FROM distributors d
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = d.brand_id);
-- Should return 0

-- Verify no orphaned sales_data
SELECT COUNT(*) as orphaned_sales_data
FROM sales_data sd
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = sd.brand_id);
-- Should return 0

-- Verify sales_data with distributor_id reference valid distributors
SELECT COUNT(*) as invalid_distributor_references
FROM sales_data sd
WHERE sd.distributor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM distributors d WHERE d.id = sd.distributor_id);
-- Should return 0

-- ================================================
-- 6. RLS POLICY VERIFICATION
-- ================================================

-- Verify RLS is enabled on key tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('brands', 'distributors', 'manufacturers', 'sales_data', 'orders', 'purchase_orders', 'invoices', 'shipments')
ORDER BY tablename;
-- All should have rls_enabled = true

-- List all policies on brands table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'brands'
ORDER BY policyname;

-- List all policies on distributors table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'distributors'
ORDER BY policyname;

-- List all policies on sales_data table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'sales_data'
ORDER BY policyname;

-- ================================================
-- 7. FUNCTION VERIFICATION
-- ================================================

-- Verify analytics functions exist
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_brand_sales_data',
    'get_category_performance',
    'get_monthly_sales_trend',
    'get_sales_by_country',
    'get_top_products_by_sales',
    'create_brand_view',
    'get_brand_distributors',
    'get_sales_by_distributor'
  )
ORDER BY routine_name;

-- Verify old function does not exist
SELECT COUNT(*) as old_function_exists
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_organization_view';
-- Should return 0

-- ================================================
-- 8. TRIGGER VERIFICATION
-- ================================================

-- Verify triggers exist
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%brand%' 
    OR trigger_name LIKE '%distributor%'
  )
ORDER BY table_name, trigger_name;

-- ================================================
-- 9. MATERIALIZED VIEW VERIFICATION
-- ================================================

-- Verify orders_analytics_view exists and has brand_id
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname = 'orders_analytics_view';

-- Verify materialized view has data
SELECT COUNT(*) as analytics_view_count FROM orders_analytics_view;

-- ================================================
-- 10. RELATIONSHIP VERIFICATION
-- ================================================

-- Verify brand → distributor relationship
SELECT 
  b.name as brand_name,
  COUNT(d.id) as distributor_count
FROM brands b
LEFT JOIN distributors d ON d.brand_id = b.id
GROUP BY b.id, b.name
ORDER BY b.name;

-- Verify brand → manufacturer relationship
SELECT 
  b.name as brand_name,
  COUNT(m.id) as manufacturer_count
FROM brands b
LEFT JOIN manufacturers m ON m.brand_id = b.id
GROUP BY b.id, b.name
ORDER BY b.name;

-- Verify distributor → sales_data relationship
SELECT 
  d.name as distributor_name,
  b.name as brand_name,
  COUNT(sd.id) as sales_records
FROM distributors d
JOIN brands b ON b.id = d.brand_id
LEFT JOIN sales_data sd ON sd.distributor_id = d.id
GROUP BY d.id, d.name, b.name
ORDER BY sales_records DESC
LIMIT 10;

-- Verify distributor → orders relationship
SELECT 
  d.name as distributor_name,
  b.name as brand_name,
  COUNT(o.id) as order_count
FROM distributors d
JOIN brands b ON b.id = d.brand_id
LEFT JOIN orders o ON o.distributor_id = d.id
GROUP BY d.id, d.name, b.name
ORDER BY order_count DESC
LIMIT 10;

-- ================================================
-- 11. SUMMARY REPORT
-- ================================================

SELECT 
  'MIGRATION VERIFICATION SUMMARY' as report_title,
  (SELECT COUNT(*) FROM brands) as total_brands,
  (SELECT COUNT(*) FROM distributors) as total_distributors,
  (SELECT COUNT(*) FROM manufacturers) as total_manufacturers,
  (SELECT COUNT(*) FROM sales_data) as total_sales_records,
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM distributors WHERE brand_id IS NULL) as distributors_without_brand,
  (SELECT COUNT(*) FROM sales_data WHERE brand_id IS NULL) as sales_without_brand,
  (SELECT COUNT(*) FROM sales_data WHERE distributor_id IS NOT NULL) as sales_with_distributor,
  (SELECT COUNT(*) FROM orders WHERE distributor_id IS NOT NULL) as orders_with_distributor;

-- ================================================
-- 12. POTENTIAL ISSUES CHECK
-- ================================================

-- Check for any NULL brand_ids where they should not be
SELECT 
  'orders' as table_name,
  COUNT(*) as null_brand_id_count
FROM orders 
WHERE brand_id IS NULL

UNION ALL

SELECT 
  'purchase_orders' as table_name,
  COUNT(*) as null_brand_id_count
FROM purchase_orders 
WHERE brand_id IS NULL

UNION ALL

SELECT 
  'distributors' as table_name,
  COUNT(*) as null_brand_id_count
FROM distributors 
WHERE brand_id IS NULL

UNION ALL

SELECT 
  'manufacturers' as table_name,
  COUNT(*) as null_brand_id_count
FROM manufacturers 
WHERE brand_id IS NULL;
-- All should return 0

-- ================================================
-- END OF VERIFICATION
-- ================================================

-- If all checks pass, the migration is successful!

