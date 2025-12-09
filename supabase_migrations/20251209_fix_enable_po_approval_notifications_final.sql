-- Fix: Re-enable PO Approval Required notifications
-- Issue: po_approval_required notifications were disabled for all roles
-- Solution: Re-enable them for super_admin and brand_admin roles

-- Update notification_type to re-enable po_approval_required
UPDATE notification_types 
SET is_active = true 
WHERE key = 'po_approval_required';

-- Update notification_role_settings to enable for super_admin and brand_admin
-- Use UPDATE with WHERE clause to avoid duplicates
UPDATE notification_role_settings 
SET is_enabled = true, 
    updated_at = NOW()
WHERE notification_type_id = (SELECT id FROM notification_types WHERE key = 'po_approval_required')
  AND role IN ('super_admin', 'brand_admin');

-- Clear notification dispatcher cache to ensure changes take effect immediately
-- This will force reload of notification settings on next dispatch
-- Removed the problematic NOTIFY call that was causing syntax error