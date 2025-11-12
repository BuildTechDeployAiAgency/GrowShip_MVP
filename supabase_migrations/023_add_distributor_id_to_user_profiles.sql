-- =====================================================
-- Migration 023: Add distributor_id to user_profiles
-- =====================================================
-- Description: Add distributor_id column to user_profiles table to link distributor admin users to their distributor account
-- Date: 2025-11-10
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- ================================================
-- USER_PROFILES TABLE
-- ================================================

-- Add distributor_id column (nullable, as not all users are distributor admins)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS distributor_id uuid REFERENCES distributors(id) ON DELETE SET NULL;

-- Note: We cannot use a CHECK constraint with subqueries in PostgreSQL
-- The brand_id validation will be handled at the application level
-- The foreign key constraint ensures the distributor exists

-- Create index for performance on distributor_id lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_distributor_id ON user_profiles(distributor_id);

-- Create composite index for common queries (distributor users filtered by brand and distributor)
CREATE INDEX IF NOT EXISTS idx_user_profiles_brand_distributor ON user_profiles(brand_id, distributor_id);

-- Add comment
COMMENT ON COLUMN user_profiles.distributor_id IS 'Foreign key to distributors table. Links distributor admin users to their distributor account. Only populated for distributor role users.';

COMMIT;

-- Verification queries (run separately)
-- SELECT COUNT(*) FROM user_profiles WHERE distributor_id IS NOT NULL;
-- SELECT up.email, up.role_name, d.name as distributor_name 
-- FROM user_profiles up 
-- LEFT JOIN distributors d ON up.distributor_id = d.id 
-- WHERE up.role_name LIKE 'distributor_%';

