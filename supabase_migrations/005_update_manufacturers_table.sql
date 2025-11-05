-- =====================================================
-- Migration 005: Update Manufacturers Table
-- =====================================================
-- Description: Rename org_id to brand_id in manufacturers table
-- Date: 2025-11-04
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- Drop existing foreign key constraint
ALTER TABLE manufacturers DROP CONSTRAINT IF EXISTS manufacturers_org_id_fkey;

-- Rename column
ALTER TABLE manufacturers RENAME COLUMN org_id TO brand_id;

-- Add NOT NULL constraint (every manufacturer must be associated with a brand)
ALTER TABLE manufacturers ALTER COLUMN brand_id SET NOT NULL;

-- Add new foreign key constraint with CASCADE delete
ALTER TABLE manufacturers 
  ADD CONSTRAINT manufacturers_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_manufacturers_brand_id ON manufacturers(brand_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_manufacturers_brand_status ON manufacturers(brand_id, status);

-- Add comment
COMMENT ON COLUMN manufacturers.brand_id IS 'Foreign key to brands table. Each manufacturer is associated with one brand.';

COMMIT;

-- Verification queries (run separately)
-- SELECT COUNT(*) FROM manufacturers WHERE brand_id IS NOT NULL;
-- SELECT m.name, b.name as brand_name FROM manufacturers m JOIN brands b ON m.brand_id = b.id LIMIT 10;

