# Profile Setup Reload Loop Fix & Next.js 16 Migration

**Date:** 2025-11-10  
**Issue:** User stuck in reload loop on `/profile/setup` page  
**User ID:** `183fae76-a2e4-415c-bac3-ef932bbadc03`  
**Email:** Isabellarxpedro@gmail.com

## Problem Analysis

The user was experiencing an infinite redirect loop between `/profile/setup` and `/dashboard` pages. This was caused by:

1. **Race Condition**: The client-side check (`app/profile/setup/page.tsx`) and server-side check (`middleware.ts`) were checking `is_profile_complete` at different times, potentially seeing different values due to cache inconsistencies.

2. **Redirect Logic Issues**:

   - Using `router.push()` instead of `router.replace()` caused navigation history issues
   - No guards to prevent multiple redirect attempts
   - No error handling for database query failures in middleware

3. **Cache Invalidation**: After updating the profile, the cache wasn't being properly invalidated and refetched, causing stale data.

## Solutions Implemented

### 1. Profile Setup Page (`app/profile/setup/page.tsx`)

**Changes:**

- Added `redirectAttempted` ref to prevent multiple redirect attempts
- Added `checkTimeoutRef` to debounce redirect checks
- Changed `router.push()` to `router.replace()` to prevent back navigation issues
- Added strict equality check (`=== true`) instead of truthy check
- Added 100ms delay to ensure profile data is stable before checking
- Added console logging for debugging

**Key Code:**

```typescript
const redirectAttempted = useRef(false);
const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Only redirect if profile is definitely complete
if (profile?.is_profile_complete === true) {
  redirectAttempted.current = true;
  router.replace("/dashboard"); // Use replace instead of push
}
```

### 2. Profile Setup Component (`components/auth/profile-setup.tsx`)

**Changes:**

- Changed `router.push()` to `router.replace()` after successful profile update
- Added 300ms delay before redirect to ensure cache is updated

**Key Code:**

```typescript
if (error) {
  toast.error(error.message);
} else {
  toast.success("Profile setup completed successfully!");
  setTimeout(() => {
    router.replace("/dashboard");
  }, 300);
}
```

### 3. Middleware (`middleware.ts`)

**Changes:**

- Added proper error handling for profile queries
- Only redirect on "not found" errors (PGRST116), allow access on other errors to prevent loops
- Changed to select only `is_profile_complete` field instead of `*` for better performance
- Use strict equality check (`=== false`) instead of truthy check
- Added detailed error logging

**Key Code:**

```typescript
const { data: profile, error: profileError } = await supabase
  .from("user_profiles")
  .select("is_profile_complete") // Only select needed field
  .eq("user_id", user.id)
  .single();

if (profileError) {
  // Only redirect if profile not found, otherwise allow access
  if (profileError.code === "PGRST116") {
    url.pathname = "/profile/setup";
    return NextResponse.redirect(url);
  }
  return supabaseResponse; // Allow access to prevent loops
}

if (!profile || profile.is_profile_complete === false) {
  // Redirect to setup
}
```

### 4. Profile Hook (`hooks/use-profile.ts`)

**Changes:**

- Added `refetchQueries()` after cache invalidation to ensure latest data is loaded
- This ensures all components see the updated profile immediately

**Key Code:**

```typescript
// Invalidate and refetch related queries to ensure consistency
queryClient.invalidateQueries({
  queryKey: profileKeys.user(updatedProfile.user_id),
});

// Force a refetch to ensure the latest data is loaded
queryClient.refetchQueries({
  queryKey: profileKeys.user(updatedProfile.user_id),
});
```

### 5. Middleware Enhanced (`middleware-enhanced.ts`)

**Changes:**

- Applied the same error handling improvements as `middleware.ts`
- Prevents redirect loops in the enhanced middleware as well

## Next.js 16 Migration

### Created `proxy.ts`

Created a new `proxy.ts` file for Next.js 16+ migration. This file:

- Renames `middleware` function to `proxy` (Next.js 16 requirement)
- Contains the same logic as `middleware.ts` but with updated naming
- Includes migration notes in comments
- Will be used when upgrading to Next.js 16

**Migration Path:**

1. Currently on Next.js 15.5.4 - `middleware.ts` is still active
2. When upgrading to Next.js 16, rename `middleware.ts` to `proxy.ts` (or use the codemod)
3. The `proxy.ts` file is ready and can be used immediately

**To migrate:**

```bash
npx @next/codemod@canary middleware-to-proxy .
```

## Testing Recommendations

1. **Test the specific user:**

   - Log in as `Isabellarxpedro@gmail.com`
   - Navigate to `/profile/setup`
   - Verify no redirect loop occurs
   - Complete the profile setup form
   - Verify redirect to dashboard works correctly

2. **Test edge cases:**

   - User with incomplete profile accessing protected routes
   - User with complete profile accessing setup page
   - Database errors during profile check
   - Network issues during profile update

3. **Check browser console:**
   - Look for `[Profile Setup]` and `[Middleware]` log messages
   - Verify no infinite redirect loops
   - Check for any error messages

## Files Modified

1. `app/profile/setup/page.tsx` - Added redirect guards and improved logic
2. `components/auth/profile-setup.tsx` - Changed to router.replace with delay
3. `middleware.ts` - Improved error handling and strict checks
4. `middleware-enhanced.ts` - Applied same improvements
5. `hooks/use-profile.ts` - Added refetch after cache invalidation
6. `proxy.ts` - Created for Next.js 16 migration

## Next Steps

1. Test with the specific user mentioned
2. Monitor console logs for any issues
3. When ready to upgrade to Next.js 16, use the `proxy.ts` file
4. Consider moving authentication checks to route handlers/server components per Next.js 16 recommendations

## Notes

- The fixes maintain backward compatibility with Next.js 15
- Both `middleware.ts` and `proxy.ts` exist - only one will be active based on Next.js version
- Error handling is now more robust and prevents redirect loops
- Cache invalidation ensures data consistency across components
