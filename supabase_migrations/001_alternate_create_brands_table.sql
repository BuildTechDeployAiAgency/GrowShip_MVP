-- =====================================================
-- Migration 001 ALTERNATE: Create Brands Table from Scratch
-- =====================================================
-- Description: Use this if the organizations table doesn't exist
-- Date: 2025-11-04
-- =====================================================

BEGIN;

-- Step 1: Create brands table if it doesn't exist
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  organization_type text NOT NULL DEFAULT 'brand',
  parent_organization_id uuid REFERENCES brands(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_brands_updated_at();

-- Step 3: Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Step 4: Create basic RLS policies (will be updated in migration 006)
CREATE POLICY "Enable read access for authenticated users" ON brands
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON brands
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brands_organization_type ON brands(organization_type);

-- Step 6: Add comment to table
COMMENT ON TABLE brands IS 'Brands table. Contains brand organizations.';

-- Step 7: Create organizations_archived table for historical reference
CREATE TABLE IF NOT EXISTS organizations_archived (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  organization_type text NOT NULL,
  parent_organization_id uuid,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz DEFAULT now(),
  archived_reason text DEFAULT 'Pre-existing data'
);

COMMIT;

-- Verification queries (run separately)
-- SELECT COUNT(*) FROM brands;
-- SELECT * FROM brands LIMIT 5;

