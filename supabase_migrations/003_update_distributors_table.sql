-- =====================================================
-- Migration 003: Update Distributors Table
-- =====================================================
-- Description: Rename org_id to brand_id in distributors table
-- Date: 2025-11-04
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- Drop existing foreign key constraint
ALTER TABLE distributors DROP CONSTRAINT IF EXISTS distributors_org_id_fkey;

-- Rename column
ALTER TABLE distributors RENAME COLUMN org_id TO brand_id;

-- Add NOT NULL constraint (every distributor must belong to a brand)
ALTER TABLE distributors ALTER COLUMN brand_id SET NOT NULL;

-- Add new foreign key constraint with CASCADE delete
ALTER TABLE distributors 
  ADD CONSTRAINT distributors_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_distributors_brand_id ON distributors(brand_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_distributors_brand_status ON distributors(brand_id, status);

-- Add comment
COMMENT ON COLUMN distributors.brand_id IS 'Foreign key to brands table. Each distributor belongs to one brand.';

COMMIT;

-- Verification queries (run separately)
-- SELECT COUNT(*) FROM distributors WHERE brand_id IS NOT NULL;
-- SELECT d.name, b.name as brand_name FROM distributors d JOIN brands b ON d.brand_id = b.id LIMIT 10;

