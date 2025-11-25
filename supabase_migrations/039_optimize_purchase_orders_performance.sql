-- ================================================
-- MIGRATION 039: OPTIMIZE PURCHASE ORDERS PERFORMANCE
-- ================================================
-- Description: Add indexes to improve Purchase Orders list query performance
--              and enable text search optimization
-- Date: November 23, 2025
-- Author: GrowShip MVP Team
-- Issue: Slow query warnings (>500ms) on Purchase Orders page
-- ================================================

BEGIN;

-- ================================================
-- 1. ENABLE PG_TRGM EXTENSION FOR TEXT SEARCH
-- ================================================

-- Enable trigram extension for efficient ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ================================================
-- 2. ADD INDEXES FOR STATUS FILTERING
-- ================================================

-- Index for po_status filtering (used in status dropdown filter)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_status 
  ON purchase_orders(po_status);

-- Index for payment_status filtering (used in payment status dropdown filter)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_status 
  ON purchase_orders(payment_status);

-- Composite index for common filter combination (brand + status + payment + date)
-- This covers the most common query pattern: filtering by brand, status, payment, ordered by date
CREATE INDEX IF NOT EXISTS idx_purchase_orders_brand_status_payment_date 
  ON purchase_orders(brand_id, po_status, payment_status, po_date DESC);

-- Composite index for distributor queries (distributor + status + payment + date)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_dist_status_payment_date 
  ON purchase_orders(distributor_id, po_status, payment_status, po_date DESC) 
  WHERE distributor_id IS NOT NULL;

-- ================================================
-- 3. ADD TRIGRAM INDEXES FOR TEXT SEARCH
-- ================================================

-- Trigram index for po_number text search (ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number_trgm 
  ON purchase_orders USING gin(po_number gin_trgm_ops);

-- Trigram index for supplier_name text search (ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_name_trgm 
  ON purchase_orders USING gin(supplier_name gin_trgm_ops);

-- Trigram index for supplier_email text search (ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_email_trgm 
  ON purchase_orders USING gin(supplier_email gin_trgm_ops);

-- ================================================
-- 4. OPTIMIZE EXISTING INDEXES
-- ================================================

-- Add partial index for active POs (excluding cancelled/rejected)
-- This helps queries that filter out cancelled/rejected POs
CREATE INDEX IF NOT EXISTS idx_purchase_orders_active_pos 
  ON purchase_orders(brand_id, po_date DESC) 
  WHERE po_status NOT IN ('cancelled', 'rejected');

-- Add index for pending payment status queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_pending_payment 
  ON purchase_orders(brand_id, po_date DESC) 
  WHERE payment_status = 'pending';

-- ================================================
-- 5. ANALYZE TABLE FOR QUERY PLANNER
-- ================================================

-- Update statistics for query planner optimization
ANALYZE purchase_orders;

-- ================================================
-- 6. RELOAD POSTGREST SCHEMA CACHE
-- ================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ================================================
-- PERFORMANCE NOTES
-- ================================================
-- 
-- These indexes optimize the following query patterns:
--
-- 1. Status filtering: WHERE po_status = 'X'
-- 2. Payment filtering: WHERE payment_status = 'X'
-- 3. Combined filters: WHERE brand_id = X AND po_status = Y AND payment_status = Z
-- 4. Text search: WHERE po_number ILIKE '%search%' OR supplier_name ILIKE '%search%'
-- 5. Date ordering: ORDER BY po_date DESC
--
-- Expected performance improvements:
-- - List queries: from 500ms+ to < 200ms
-- - Text search: from 800ms+ to < 300ms
-- - Filtered queries: from 600ms+ to < 250ms
--
-- Monitoring:
-- - Use instrumented-fetch.ts to track query times
-- - Check console for [SupabaseFetch] slow query warnings
-- - Verify queries stay under 500ms threshold
-- ================================================

