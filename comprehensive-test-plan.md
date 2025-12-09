# Comprehensive Test Plan for PO Approval Notifications

## Issue Summary

Super Admins and Brand Admins are not receiving "Purchase Order Approval Required" notifications when distributor users create POs requiring approval.

## Root Cause

Database configuration issue: `po_approval_required` notification type was disabled for all roles in the seed migration.

## Fix Applied

- Created migration: `20251209_fix_enable_po_approval_notifications_final.sql`
  - Re-enables `po_approval_required` notification type
  - Enables role settings for `super_admin` and `brand_admin` roles
  - Clears dispatcher cache

## Test Steps

### 1. Verify Database Configuration

```sql
-- Check if po_approval_required is enabled
SELECT is_active, supported_roles
FROM notification_types
WHERE key = 'po_approval_required';

-- Check role settings for super_admin and brand_admin
SELECT role, is_enabled
FROM notification_role_settings
WHERE notification_type_id = (SELECT id FROM notification_types WHERE key = 'po_approval_required')
AND role IN ('super_admin', 'brand_admin');
```

### 2. Test PO Creation as Distributor

1. Login as a distributor user
2. Create a new PO with status "submitted"
3. Expected: Should receive "PO Created" notification (distributor gets it)
4. Expected: Should trigger "PO Approval Required" notification for Super Admins/Brand Admins

### 3. Test PO Creation as Brand Admin

1. Login as a brand admin user
2. Create a new PO with status "submitted"
3. Expected: Should receive "PO Created" notification
4. Expected: Should trigger "PO Approval Required" notification for other Brand Admins (not self)

### 4. Verify Notification Delivery

1. Check top-right notification bell for unread count
2. Check `/notifications` page for new notifications
3. Verify notification content and action URLs

### 5. Debug Steps if Issues Persist

1. Check browser console for notification dispatch logs
2. Check Supabase logs for notification creation
3. Verify database records in notifications table
4. Check notification_role_settings table for correct configuration

## Success Criteria

- ✅ Super Admins receive approval notifications when POs are submitted by distributors
- ✅ Brand Admins receive approval notifications when POs are submitted by non-admin brand users
- ✅ Notifications appear in both UI locations (bell + notifications page)
- ✅ PO creators are excluded from their own approval requests
- ✅ No syntax errors in migration files
- ✅ Dispatcher cache is properly cleared

## Files to Deploy

1. `supabase_migrations/20251209_fix_enable_po_approval_notifications_final.sql`
2. Test script (optional): `test-po-creation.js`

## Notes

- The fix addresses the database configuration issue, not a code logic problem
- If issues persist after running the migration, the problem may be:
  - Migration not executed yet
  - Caching issues in the dispatcher
  - Different database state than expected
  - User role detection issues

## Rollback Plan

If the fix causes issues:

1. Disable the notification type again:

```sql
UPDATE notification_types
SET is_enabled = false
WHERE key = 'po_approval_required';
```

2. Restore previous role settings if needed
