# Super Admin User Visibility Fix - Implementation

## Date: 2025-01-XX

## Problem
Super admin user (`diogo@diogoppedro.com`) could only see their own user in the User Management section instead of all users across all brands, distributors, and manufacturers.

## Root Cause Identified

The RLS (Row Level Security) policy on the `user_profiles` table was checking `role_type = 'super_admin'`, but the component was checking `role_name === "super_admin"`. While super admins should have both fields set correctly, the RLS policy needed to check both to ensure compatibility.

## Solution Implemented

### 1. Fixed RLS Policies (Migration 014)

**File**: `supabase_migrations/014_fix_super_admin_rls_policies.sql`

Updated all super admin RLS policies to check both `role_name` AND `role_type`:

```sql
-- Before: Only checked role_type
AND role_type = 'super_admin'

-- After: Checks both role_name OR role_type
AND (role_name = 'super_admin' OR role_type = 'super_admin')
```

**Tables Updated**:
- `user_profiles` - SELECT and ALL policies
- `user_memberships` - SELECT and ALL policies  
- `brands` - SELECT and ALL policies

This ensures that super admin detection works regardless of which field is set, providing better compatibility and reliability.

### 2. Added Debug Logging

**File**: `hooks/use-users.ts`
- Added console logging to track query parameters
- Logs when super admin is detected
- Logs query results (user count, total count)
- Logs any query errors

**File**: `components/users/users-management.tsx`
- Added useEffect to log profile information when loaded
- Logs role_name, role_type, brand_id, and isSuperAdmin flag
- Helps diagnose if profile is loading correctly

## Files Modified

1. ✅ `supabase_migrations/014_fix_super_admin_rls_policies.sql` - New migration file
2. ✅ `hooks/use-users.ts` - Added debug logging
3. ✅ `components/users/users-management.tsx` - Added debug logging and useEffect import

## Testing Steps

1. **Apply Migration**:
   ```sql
   -- Run the migration in Supabase SQL editor or via migration tool
   -- File: supabase_migrations/014_fix_super_admin_rls_policies.sql
   ```

2. **Verify User Profile**:
   - Ensure super admin user has both `role_name = 'super_admin'` AND `role_type = 'super_admin'`
   - Check in Supabase dashboard or run verification query

3. **Test User Visibility**:
   - Login as super admin (`diogo@diogoppedro.com`)
   - Navigate to `/users` page
   - Verify all users are visible (not just own user)
   - Check browser console for debug logs

4. **Verify Debug Logs**:
   - Check browser console for `[UsersManagement]` logs showing profile info
   - Check for `[useUsers]` logs showing query parameters and results
   - Verify `isSuperAdmin: true` in logs
   - Verify `brandId: undefined` for super admin

5. **Test Filters**:
   - Test organization filter (should show all organizations)
   - Test role filter (should show all roles)
   - Test status filter (should show all statuses)

## Expected Behavior After Fix

- ✅ Super admin sees ALL users in user_profiles table
- ✅ No brand_id filtering applied for super admin queries
- ✅ RLS policies allow super admin to bypass brand restrictions
- ✅ Query returns all users regardless of brand_id value
- ✅ Debug logs confirm super admin detection and query execution

## Rollback Plan

If issues occur, the migration can be rolled back by:

```sql
-- Revert to original policies (checking only role_type)
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all memberships" ON user_memberships;
DROP POLICY IF EXISTS "Super admins can manage all memberships" ON user_memberships;
DROP POLICY IF EXISTS "Super admins can view all brands" ON brands;
DROP POLICY IF EXISTS "Super admins can manage brands" ON brands;

-- Then recreate with original role_type check
-- (See migration 006 for original policy definitions)
```

## Notes

- Debug logging can be removed after verification
- The RLS policy fix ensures compatibility with both role_name and role_type checks
- This fix applies to all super admin RLS policies across the application
- The migration is idempotent (can be run multiple times safely)

