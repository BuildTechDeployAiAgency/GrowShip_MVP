-- Fix: Re-enable PO Approval Required notifications
-- Issue: po_approval_required notifications were disabled for all roles
-- Solution: Re-enable them for super_admin and brand_admin roles

-- Update notification_type to re-enable po_approval_required
UPDATE notification_types 
SET is_active = true 
WHERE key = 'po_approval_required';

-- Update notification_role_settings to enable for super_admin and brand_admin
-- Only update roles that should have this notification enabled
INSERT INTO notification_role_settings (notification_type_id, role, is_enabled, frequency, channels, created_at, updated_by)
SELECT 
    nt.id,
    'super_admin',
    true,
    'instant',
    '["in_app"]',
    NOW(),
    '00000000-0000-0000-0000-000000000001'
FROM notification_types nt
WHERE nt.key = 'po_approval_required'
AND NOT EXISTS (
    SELECT 1 FROM notification_role_settings nrs 
    WHERE nrs.notification_type_id = nt.id 
    AND nrs.role = 'super_admin'
);

INSERT INTO notification_role_settings (notification_type_id, role, is_enabled, frequency, channels, created_at, updated_by)
SELECT 
    nt.id,
    'brand_admin',
    true,
    'instant',
    '["in_app"]',
    NOW(),
    '00000000-0000-0000-0000-000000000001'
FROM notification_types nt
WHERE nt.key = 'po_approval_required'
AND NOT EXISTS (
    SELECT 1 FROM notification_role_settings nrs 
    WHERE nrs.notification_type_id = nt.id 
    AND nrs.role = 'brand_admin'
);

-- Clear notification dispatcher cache to ensure changes take effect immediately
-- Note: Cache clearing happens automatically when notification settings are updated