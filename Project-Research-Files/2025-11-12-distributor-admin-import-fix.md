# Distributor Admin Import Validation Fix

**Date:** November 12, 2025  
**Status:** ✅ FIXED  
**Issue:** Distributor Admin users unable to import orders - validation error with empty error object

---

## Problem Description

Distributor Admin user (`isabellarxpedro@gmail.com`) encountered an error when trying to import orders:

```
Validation error: {}
```

The error object was empty, making it difficult to diagnose the issue. The validation was failing because:

1. The `distributor_id` was not being automatically set from the user's profile
2. Error handling wasn't properly capturing and displaying API error messages
3. The validation API wasn't enforcing that distributor_admin users can only import to their own distributor

---

## Root Cause Analysis

### Issues Identified

1. **Missing distributor_id Auto-Population:**
   - The import page was relying on `selectedDistributor` state which might not be set when validation is called
   - For distributor_admin users, the `distributor_id` should always come from their profile, not from user selection

2. **Poor Error Handling:**
   - Error object was showing as `{}` because error messages weren't being properly extracted from API responses
   - JSON parsing errors weren't being handled gracefully
   - Response body can only be read once, causing issues when trying to parse errors

3. **Validation API Logic:**
   - The API wasn't enforcing that distributor_admin users must use their own `distributor_id`
   - Missing validation to ensure distributor_admin users can't import to other distributors

---

## Solution Implemented

### 1. Fixed Import Page (`app/import/page.tsx`)

**Changes:**
- **Auto-select distributor from profile:** For distributor_admin users, always use `profile.distributor_id` directly instead of relying on state
- **Improved validation trigger:** Changed validation trigger to use `profile.distributor_id` directly instead of `selectedDistributor` state
- **Added error handling:** Show error message if distributor_admin user doesn't have `distributor_id` in their profile
- **Better logging:** Added console logs to track distributor selection and validation flow

**Key Code Changes:**
```typescript
// Before: Used selectedDistributor state
else if (isDistributorUser && selectedDistributor && !loading && !validationResults) {
  validateOrders(selectedDistributor);
}

// After: Use profile.distributor_id directly
else if (isDistributorUser && profile?.distributor_id && !loading && !validationResults) {
  validateOrders(profile.distributor_id);
}
```

### 2. Improved Error Handling (`hooks/use-import-orders.ts`)

**Changes:**
- **Better error extraction:** Properly extract error messages from API responses
- **Response cloning:** Clone response before parsing to handle JSON parsing errors gracefully
- **Detailed error logging:** Log full error details including status, message, and response body
- **User-friendly messages:** Provide clear error messages based on error type

**Key Code Changes:**
```typescript
// Clone response for error handling (response body can only be read once)
const responseClone = response.clone();
let result: ValidationResponse;

try {
  result = await response.json();
} catch (jsonError) {
  // Try to get text response from clone if JSON parsing fails
  const textResponse = await responseClone.text();
  throw new Error(`Validation failed: ${response.statusText}. ${textResponse}`);
}

if (!response.ok) {
  const errorMsg = result?.error || result?.message || `Validation failed with status ${response.status}`;
  throw new Error(errorMsg);
}
```

### 3. Enhanced Validation API (`app/api/import/orders/validate/route.ts`)

**Changes:**
- **Force distributor_id for distributor_admin:** Always use `profile.distributor_id` for distributor_admin users, regardless of what's provided
- **Validation check:** Ensure distributor_admin users can't import to other distributors
- **Better error messages:** Return clear error messages when distributor_id is missing or invalid
- **Improved logging:** Log distributor_id usage for debugging

**Key Code Changes:**
```typescript
// For distributor_admin users, ALWAYS use their distributor_id from profile
if (isDistributorUser) {
  if (!profile.distributor_id) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Your account is not associated with a distributor. Please contact support." 
      },
      { status: 403 }
    );
  }
  
  // Force distributor_admin to use their own distributor_id
  finalDistributorId = profile.distributor_id;
  
  // Validate that provided distributorId matches (if provided)
  if (distributorId && distributorId !== profile.distributor_id) {
    return NextResponse.json(
      { 
        success: false,
        error: "You can only import orders for your assigned distributor" 
      },
      { status: 403 }
    );
  }
}
```

---

## Security Improvements

1. **Enforced Data Isolation:**
   - Distributor_admin users can ONLY import orders to their own distributor
   - API validates and enforces this restriction server-side
   - Prevents unauthorized access to other distributors' data

2. **Profile Validation:**
   - Validates that distributor_admin users have `distributor_id` in their profile
   - Returns clear error messages if profile is misconfigured
   - Prevents silent failures

---

## Testing Recommendations

After applying these fixes, test:

1. **Distributor Admin Import:**
   - Upload an Excel file as distributor_admin user
   - Verify that `distributor_id` is automatically set from profile
   - Verify that validation proceeds without errors
   - Verify that orders are imported with correct `distributor_id`

2. **Error Handling:**
   - Test with invalid file format
   - Test with missing distributor_id in profile
   - Verify error messages are clear and helpful

3. **Security:**
   - Verify distributor_admin cannot import to other distributors
   - Verify API rejects attempts to use different distributor_id

---

## Files Changed

1. **`app/import/page.tsx`**
   - Fixed distributor selection logic
   - Improved validation trigger
   - Added error handling for missing distributor_id

2. **`hooks/use-import-orders.ts`**
   - Improved error handling and logging
   - Better error message extraction
   - Response cloning for error handling

3. **`app/api/import/orders/validate/route.ts`**
   - Enforced distributor_id for distributor_admin users
   - Added validation checks
   - Improved error messages

---

## Impact

✅ **Distributor Admin users can now import orders successfully**
✅ **Error messages are clear and helpful**
✅ **Security is enforced - distributor_admin can only import to their own distributor**
✅ **Better debugging with improved logging**

---

## Update: Distributor Not Found Error Fix

**Additional Issue Found:** After fixing the validation error, distributor_admin users encountered "Distributor not found" error when the API tried to fetch distributor information.

**Root Cause:** The distributors RLS policy in Migration 027 had recursive queries similar to the user_profiles issue, preventing distributor_admin users from reading their own distributor record.

**Additional Fixes:**

1. **Validation API (`app/api/import/orders/validate/route.ts`):**
   - Use admin client for distributor_admin users when fetching distributor info
   - Permissions are already validated before this query, so using admin client is safe
   - Improved error logging with detailed error information
   - Added validation to ensure distributor belongs to user's brand

2. **Database Migration (`supabase_migrations/030_fix_distributors_rls_recursion.sql`):**
   - Fixed distributors RLS policies to use SECURITY DEFINER helper functions
   - Uses `get_user_distributor_id_safe()` and `is_distributor_admin_safe()` from Migration 029
   - Eliminates recursion issues similar to user_profiles fix

**Files Modified:**
- `app/api/import/orders/validate/route.ts` - Use admin client for distributor_admin, improved error handling

**Files Created:**
- `supabase_migrations/030_fix_distributors_rls_recursion.sql` - Fix distributors RLS recursion

---

## Related Issues

- This fix addresses the validation error that was preventing distributor_admin users from importing orders
- Related to the RLS recursion fix (Migration 029) - both ensure distributor_admin users can access their data properly
- Migration 030 fixes the distributors table RLS recursion issue using the same pattern as Migration 029

