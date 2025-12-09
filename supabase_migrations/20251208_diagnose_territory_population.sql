-- ================================================
-- Diagnostic SQL: Territory Population Analysis
-- ================================================
-- Description: Comprehensive diagnostic queries to identify why
--   territory_id and region_id are not populating in sales_data
-- Date: 2025-12-08
-- Author: GrowShip MVP Team
-- ================================================
-- 
-- INSTRUCTIONS:
-- Run each query section separately in Supabase SQL Editor
-- Review the results to identify where the data flow breaks
-- ================================================

-- ================================================
-- 1. OVERVIEW: Sales Data Territory Population Status
-- ================================================
-- Check overall status of territory_id and region_id in sales_data
SELECT 
  COUNT(*) as total_records,
  COUNT(territory_id) as records_with_territory_id,
  COUNT(region_id) as records_with_region_id,
  COUNT(*) - COUNT(territory_id) as missing_territory_id,
  COUNT(*) - COUNT(region_id) as missing_region_id,
  ROUND(100.0 * COUNT(territory_id) / COUNT(*), 2) as pct_with_territory,
  ROUND(100.0 * COUNT(region_id) / COUNT(*), 2) as pct_with_region
FROM sales_data;

-- ================================================
-- 2. DISTRIBUTORS: Check Territory Population
-- ================================================
-- Verify if distributors have territory_id populated
-- This is important because sales_data can inherit from distributors
SELECT 
  COUNT(*) as total_distributors,
  COUNT(territory_id) as distributors_with_territory_id,
  COUNT(region_id) as distributors_with_region_id,
  COUNT(*) - COUNT(territory_id) as missing_territory_id,
  COUNT(*) - COUNT(region_id) as missing_region_id
FROM distributors;

-- Sample distributors missing territory_id
SELECT 
  id,
  name,
  country,
  territory_id,
  region_id,
  created_at
FROM distributors
WHERE territory_id IS NULL
LIMIT 10;

-- ================================================
-- 3. ORDERS: Check Territory Population
-- ================================================
-- Verify if orders have territory_id populated
-- This is important because sales_data can inherit from orders
SELECT 
  COUNT(*) as total_orders,
  COUNT(territory_id) as orders_with_territory_id,
  COUNT(region_id) as orders_with_region_id,
  COUNT(*) - COUNT(territory_id) as missing_territory_id,
  COUNT(*) - COUNT(region_id) as missing_region_id
FROM orders;

-- Sample orders missing territory_id
SELECT 
  o.id,
  o.order_number,
  o.distributor_id,
  o.shipping_country,
  o.territory_id,
  o.region_id,
  o.created_at,
  d.name as distributor_name,
  d.country as distributor_country
FROM orders o
LEFT JOIN distributors d ON o.distributor_id = d.id
WHERE o.territory_id IS NULL
LIMIT 10;

-- ================================================
-- 4. SALES_DATA: Breakdown by Data Source
-- ================================================
-- Check sales_data records and their potential data sources
SELECT 
  CASE 
    WHEN order_id IS NOT NULL THEN 'Has Order ID'
    WHEN distributor_id IS NOT NULL THEN 'Has Distributor ID'
    WHEN territory IS NOT NULL THEN 'Has Territory Text'
    WHEN territory_country IS NOT NULL THEN 'Has Territory Country'
    ELSE 'No Source Data'
  END as data_source_type,
  COUNT(*) as record_count,
  COUNT(territory_id) as with_territory_id,
  COUNT(region_id) as with_region_id
FROM sales_data
GROUP BY 
  CASE 
    WHEN order_id IS NOT NULL THEN 'Has Order ID'
    WHEN distributor_id IS NOT NULL THEN 'Has Distributor ID'
    WHEN territory IS NOT NULL THEN 'Has Territory Text'
    WHEN territory_country IS NOT NULL THEN 'Has Territory Country'
    ELSE 'No Source Data'
  END
ORDER BY record_count DESC;

-- ================================================
-- 5. SALES_DATA WITH ORDER_ID: Check Linked Orders
-- ================================================
-- For sales_data records with order_id, check if the linked order has territory_id
SELECT 
  sd.id as sales_data_id,
  sd.order_id,
  sd.territory_id as sales_data_territory_id,
  sd.region_id as sales_data_region_id,
  sd.territory as sales_data_territory_text,
  sd.territory_country as sales_data_country,
  o.territory_id as order_territory_id,
  o.region_id as order_region_id,
  o.shipping_country as order_shipping_country,
  CASE 
    WHEN sd.territory_id IS NULL AND o.territory_id IS NOT NULL THEN 'CAN BE FIXED FROM ORDER'
    WHEN sd.territory_id IS NULL AND o.territory_id IS NULL THEN 'ORDER ALSO MISSING TERRITORY'
    ELSE 'OK'
  END as status
FROM sales_data sd
LEFT JOIN orders o ON sd.order_id = o.id
WHERE sd.order_id IS NOT NULL
  AND sd.territory_id IS NULL
LIMIT 20;

-- ================================================
-- 6. SALES_DATA WITH DISTRIBUTOR_ID: Check Linked Distributors
-- ================================================
-- For sales_data records with distributor_id, check if the linked distributor has territory_id
SELECT 
  sd.id as sales_data_id,
  sd.distributor_id,
  sd.territory_id as sales_data_territory_id,
  sd.region_id as sales_data_region_id,
  sd.territory as sales_data_territory_text,
  sd.territory_country as sales_data_country,
  d.territory_id as distributor_territory_id,
  d.region_id as distributor_region_id,
  d.country as distributor_country,
  CASE 
    WHEN sd.territory_id IS NULL AND d.territory_id IS NOT NULL THEN 'CAN BE FIXED FROM DISTRIBUTOR'
    WHEN sd.territory_id IS NULL AND d.territory_id IS NULL THEN 'DISTRIBUTOR ALSO MISSING TERRITORY'
    ELSE 'OK'
  END as status
FROM sales_data sd
LEFT JOIN distributors d ON sd.distributor_id = d.id
WHERE sd.distributor_id IS NOT NULL
  AND sd.territory_id IS NULL
LIMIT 20;

-- ================================================
-- 7. SALES_DATA WITH TERRITORY TEXT: Check Territory Matching
-- ================================================
-- For sales_data records with territory text, check if territories table has matching records
SELECT 
  sd.id,
  sd.territory,
  sd.territory_id,
  sd.region_id,
  t.id as matching_territory_id,
  t.name as matching_territory_name,
  t.code as matching_territory_code,
  t.region_id as matching_region_id,
  CASE 
    WHEN sd.territory_id IS NULL AND t.id IS NOT NULL THEN 'CAN BE MATCHED BY TEXT'
    WHEN sd.territory_id IS NULL AND t.id IS NULL THEN 'NO MATCHING TERRITORY FOUND'
    ELSE 'OK'
  END as status
FROM sales_data sd
LEFT JOIN territories t ON (
  UPPER(TRIM(sd.territory)) = UPPER(t.name) OR
  UPPER(TRIM(sd.territory)) = UPPER(t.code)
)
WHERE sd.territory IS NOT NULL
  AND sd.territory_id IS NULL
LIMIT 20;

-- ================================================
-- 8. SALES_DATA WITH TERRITORY_COUNTRY: Check Country Matching
-- ================================================
-- For sales_data records with territory_country, check if find_territory_by_country can match
SELECT 
  sd.id,
  sd.territory_country,
  sd.brand_id,
  sd.territory_id,
  sd.region_id,
  find_territory_by_country(UPPER(TRIM(sd.territory_country)), sd.brand_id) as potential_territory_id,
  CASE 
    WHEN sd.territory_id IS NULL AND find_territory_by_country(UPPER(TRIM(sd.territory_country)), sd.brand_id) IS NOT NULL THEN 'CAN BE MATCHED BY COUNTRY'
    WHEN sd.territory_id IS NULL AND find_territory_by_country(UPPER(TRIM(sd.territory_country)), sd.brand_id) IS NULL THEN 'NO MATCHING TERRITORY BY COUNTRY'
    ELSE 'OK'
  END as status
FROM sales_data sd
WHERE sd.territory_country IS NOT NULL
  AND TRIM(UPPER(sd.territory_country)) != ''
  AND sd.territory_id IS NULL
LIMIT 20;

-- ================================================
-- 9. TRIGGER VERIFICATION: Check if Trigger Exists
-- ================================================
-- Verify that the trigger function and trigger exist
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'auto_assign_sales_data_territory';

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_auto_assign_sales_data_territory';

-- ================================================
-- 10. TERRITORIES TABLE: Verify Territories Exist
-- ================================================
-- Check if territories table has data
SELECT 
  COUNT(*) as total_territories,
  COUNT(DISTINCT region_id) as unique_regions,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_territories
FROM territories;

-- Sample territories
SELECT 
  id,
  name,
  code,
  region_id,
  is_active,
  display_order
FROM territories
WHERE is_active = TRUE
ORDER BY display_order
LIMIT 20;

-- ================================================
-- 11. REGIONS TABLE: Verify Regions Exist
-- ================================================
-- Check if regions table has data
SELECT 
  COUNT(*) as total_regions
FROM regions;

-- Sample regions
SELECT 
  id,
  name,
  code
FROM regions
ORDER BY name
LIMIT 20;

-- ================================================
-- 12. DATA FLOW TRACE: Sample Complete Path
-- ================================================
-- Trace a sample sales_data record through the entire data flow
-- Replace the sales_data.id with an actual ID from your database
SELECT 
  'Sales Data' as source,
  sd.id,
  sd.order_id,
  sd.distributor_id,
  sd.territory,
  sd.territory_country,
  sd.territory_id,
  sd.region_id
FROM sales_data sd
WHERE sd.territory_id IS NULL
LIMIT 1;

-- If order_id exists, check the order
SELECT 
  'Order' as source,
  o.id,
  o.distributor_id,
  o.shipping_country,
  o.territory_id,
  o.region_id
FROM orders o
WHERE o.id IN (
  SELECT order_id FROM sales_data WHERE territory_id IS NULL AND order_id IS NOT NULL LIMIT 1
);

-- If distributor_id exists, check the distributor
SELECT 
  'Distributor' as source,
  d.id,
  d.name,
  d.country,
  d.territory_id,
  d.region_id
FROM distributors d
WHERE d.id IN (
  SELECT distributor_id FROM sales_data WHERE territory_id IS NULL AND distributor_id IS NOT NULL LIMIT 1
);

-- ================================================
-- END OF DIAGNOSTIC QUERIES
-- ================================================
-- 
-- NEXT STEPS:
-- 1. Review the results from each query section
-- 2. Identify which data source is missing territory information
-- 3. Check if triggers are properly installed
-- 4. Verify that territories and regions tables have the necessary data
-- 5. Based on findings, determine if we need to:
--    - Backfill missing territory_id in distributors/orders
--    - Fix trigger logic
--    - Add missing territories to territories table
--    - Update the backfill script
-- ================================================
