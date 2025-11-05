-- =====================================================
-- Schema Check: Verify Current Database State
-- =====================================================
-- Description: Run this BEFORE migration 001 to understand current schema
-- Date: 2025-11-04
-- =====================================================

-- Check if organizations table exists
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'organizations'
) as organizations_exists;

-- Check if brands table already exists
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'brands'
) as brands_exists;

-- List all tables in public schema
SELECT 
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for organization-related columns in existing tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name LIKE '%organization%' OR column_name LIKE '%org_%')
ORDER BY table_name, column_name;

-- Check user_profiles structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check distributors table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'distributors'
ORDER BY ordinal_position;

