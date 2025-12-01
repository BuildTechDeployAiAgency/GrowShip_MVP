-- =====================================================
-- Migration 030: Fix order_history Foreign Key
-- =====================================================
-- Description: Add foreign key from order_history.changed_by to user_profiles.user_id
--              This enables joining with user_profiles to fetch user details in audit logs
-- Date: 2025-11-29
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- Add FK from order_history.changed_by to user_profiles.user_id
-- This allows PostgREST to join and fetch user details (contact_name, company_name, email)
ALTER TABLE order_history
DROP CONSTRAINT IF EXISTS order_history_changed_by_user_profile_fkey;

ALTER TABLE order_history
ADD CONSTRAINT order_history_changed_by_user_profile_fkey
FOREIGN KEY (changed_by)
REFERENCES user_profiles(user_id)
ON DELETE SET NULL;

-- Add comment
COMMENT ON CONSTRAINT order_history_changed_by_user_profile_fkey ON order_history 
IS 'Allows joining with user_profiles to get user details (name, email) for audit trail';

COMMIT;

-- Verification query (run separately)
-- SELECT oh.*, up.contact_name, up.company_name, up.email
-- FROM order_history oh
-- LEFT JOIN user_profiles up ON oh.changed_by = up.user_id
-- LIMIT 5;
-- Applied successfully
