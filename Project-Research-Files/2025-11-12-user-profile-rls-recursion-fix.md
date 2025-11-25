# User Profile RLS Recursion Fix

**Date:** November 12, 2025  
**Status:** ✅ FIXED  
**Issue:** Distributor Admin users unable to verify their account during sign-in

---

## Problem Description

Distributor Admin users (e.g., `isabellarxpedro@gmail.com`) were seeing the error:
```
Unable to verify user account. Please contact support.
```

This error occurred during the sign-in process when the application tried to verify the user's profile.

---

## Root Cause Analysis

### What Was Happening

1. **During Sign-In Flow:**
   - User authenticates with Supabase Auth successfully
   - Application tries to fetch user profile: `SELECT * FROM user_profiles WHERE user_id = auth.uid()`
   - RLS (Row Level Security) policy evaluates the query
   - **Problem:** The RLS policy itself queries `user_profiles` table to check conditions
   - This creates a **circular dependency/recursion** issue

2. **The Problematic Policy (Migration 027):**
   ```sql
   CREATE POLICY "Users can view profiles by brand/distributor"
   ON user_profiles FOR SELECT
   USING (
     auth.uid() = user_id
     OR
     EXISTS (
       SELECT 1 FROM user_profiles  -- ⚠️ Recursive query!
       WHERE user_id = auth.uid()
       ...
     )
     OR
     brand_id IN (
       SELECT brand_id FROM user_profiles  -- ⚠️ Another recursive query!
       WHERE user_id = auth.uid()
       ...
     )
   );
   ```

3. **Why It Worked Before:**
   - Migration 006 had a simple policy: `auth.uid() = user_id` (no recursion)
   - Migration 027 replaced/overlapped with a more complex policy that introduced recursion
   - The recursion caused PostgreSQL to have issues evaluating the policy during sign-in

### Technical Details

- **RLS Policy Evaluation:** When a user queries `user_profiles`, PostgreSQL evaluates all SELECT policies
- **Recursive Queries:** If a policy queries the same table it's protecting, it creates a circular dependency
- **SECURITY DEFINER Functions:** These functions run with elevated privileges and bypass RLS, breaking the recursion

---

## Solution Implemented

### Migration 029: Fix User Profiles RLS Recursion

**File:** `supabase_migrations/029_fix_user_profiles_rls_recursion.sql`

#### 1. Created Helper Functions (SECURITY DEFINER)

These functions bypass RLS to avoid recursion:

- `get_user_brand_id_safe()` - Gets user's brand_id without triggering RLS
- `get_user_distributor_id_safe()` - Gets user's distributor_id without triggering RLS  
- `is_brand_admin_safe()` - Checks if user is brand admin without triggering RLS
- `is_distributor_admin_safe()` - Checks if user is distributor admin without triggering RLS

#### 2. Fixed RLS Policies

**Separated into two policies:**

1. **"Users can view own profile"** - Simple, non-recursive policy
   ```sql
   USING (auth.uid() = user_id)
   ```
   - Ensures users can always read their own profile
   - Critical for sign-in to work

2. **"Users can view profiles by brand/distributor"** - Uses helper functions
   ```sql
   USING (
     is_super_admin()
     OR
     (is_brand_admin_safe() AND brand_id = get_user_brand_id_safe())
     OR
     (is_distributor_admin_safe() AND distributor_id = get_user_distributor_id_safe() AND brand_id = get_user_brand_id_safe())
   )
   ```
   - No recursive queries - uses SECURITY DEFINER functions
   - Maintains proper data visibility rules

---

## Why This Approach Works

1. **SECURITY DEFINER Functions:**
   - Run with elevated privileges (bypass RLS)
   - Can query `user_profiles` without triggering policy evaluation
   - Break the circular dependency

2. **Policy Separation:**
   - Own profile policy is simple and evaluated first
   - Brand/distributor policy handles visibility rules
   - PostgreSQL evaluates policies with OR logic

3. **Follows Existing Pattern:**
   - Migration 014 already used this pattern with `is_super_admin()`
   - Consistent approach across the codebase

---

## Testing

After applying migration 029, verify:

1. **Users can sign in:**
   ```sql
   -- Should return user's own profile
   SELECT * FROM user_profiles WHERE user_id = auth.uid();
   ```

2. **Brand admins can see their brand's profiles:**
   ```sql
   SELECT COUNT(*) FROM user_profiles 
   WHERE brand_id = get_user_brand_id_safe()
   AND distributor_id IS NULL;
   ```

3. **Distributor admins can see linked profiles:**
   ```sql
   SELECT COUNT(*) FROM user_profiles 
   WHERE distributor_id = get_user_distributor_id_safe()
   AND brand_id = get_user_brand_id_safe();
   ```

---

## Files Changed

1. **Created:**
   - `supabase_migrations/029_fix_user_profiles_rls_recursion.sql` - Fix migration

2. **Related Files (for reference):**
   - `supabase_migrations/027_ensure_brand_distributor_visibility.sql` - Original problematic migration
   - `supabase_migrations/014_fix_super_admin_rls_policies.sql` - Example of correct pattern
   - `contexts/enhanced-auth-context.tsx` - Sign-in logic (line 383-395)
   - `contexts/auth-context.tsx` - Sign-in logic (line 297-309)

---

## Next Steps

1. ✅ **Apply Migration 029** to fix the RLS recursion issue
2. ✅ **Test sign-in** with distributor admin user (`isabellarxpedro@gmail.com`)
3. ✅ **Verify** that users can read their own profiles during sign-in
4. ✅ **Monitor** for any other RLS-related issues

---

## Lessons Learned

1. **Avoid Recursive RLS Policies:** Never query the same table within its own RLS policy
2. **Use SECURITY DEFINER Functions:** For helper functions that need to bypass RLS
3. **Keep Policies Simple:** Separate simple policies (own profile) from complex ones (visibility rules)
4. **Test Sign-In Flow:** Always test authentication flows after RLS policy changes

---

## Related Issues

- This issue was introduced in Migration 027 (2025-11-12)
- Similar pattern was already fixed in Migration 014 for super admin policies
- The fix follows the same pattern established in Migration 014

