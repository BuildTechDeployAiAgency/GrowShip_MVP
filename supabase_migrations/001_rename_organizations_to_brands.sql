-- =====================================================
-- Migration 001: Rename Organizations to Brands
-- =====================================================
-- Description: Archive/delete non-brand organizations and rename the organizations table to brands
-- Date: 2025-11-04
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- Step 1: Archive non-brand organizations
-- Create a backup table for non-brand organizations before deletion
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
  archived_reason text DEFAULT 'Schema refactoring: non-brand organizations'
);

-- Copy non-brand organizations to archive
INSERT INTO organizations_archived (id, name, slug, organization_type, parent_organization_id, is_active, created_at, updated_at)
SELECT id, name, slug, organization_type::text, parent_organization_id, is_active, created_at, updated_at
FROM organizations
WHERE organization_type != 'brand';

-- Step 2: Delete references to non-brand organizations in dependent tables
-- Update user_profiles to remove references to non-brand organizations
UPDATE user_profiles 
SET organization_id = NULL, parent_organization_id = NULL
WHERE organization_id IN (SELECT id FROM organizations WHERE organization_type != 'brand')
   OR parent_organization_id IN (SELECT id FROM organizations WHERE organization_type != 'brand');

-- Update user_memberships to remove references to non-brand organizations
DELETE FROM user_memberships
WHERE organization_id IN (SELECT id FROM organizations WHERE organization_type != 'brand');

-- Step 3: Delete non-brand organizations
DELETE FROM organizations WHERE organization_type != 'brand';

-- Step 4: Rename the organizations table to brands
ALTER TABLE organizations RENAME TO brands;

-- Step 5: Rename the sequence
ALTER SEQUENCE IF EXISTS organizations_id_seq RENAME TO brands_id_seq;

-- Step 6: Update the RLS policy names (will recreate policies in migration 006)
-- For now, just note that policies will need updating

-- Step 7: Create or replace trigger for updated_at
CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_brands_updated_at();

-- Step 8: Add comment to table
COMMENT ON TABLE brands IS 'Brands table (formerly organizations). Contains brand organizations only.';

COMMIT;

-- Verification queries (run separately)
-- SELECT COUNT(*) FROM brands;
-- SELECT COUNT(*) FROM organizations_archived;
-- SELECT * FROM brands WHERE organization_type != 'brand'; -- Should return 0 rows

