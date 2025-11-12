# Super Admin Invite & Password Reset Fix

**Date:** November 9, 2025  
**Status:** Completed  
**Related Issues:** Super Admin invite permissions, Password reset authentication errors

## Overview

Fixed two critical authentication issues:
1. Super Admin users were unable to send invitations despite having sufficient privileges
2. Existing users could not reset their passwords due to missing Supabase session establishment

## Changes Implemented

### 1. Super Admin Invite Permissions (`app/api/users/invite/route.ts`)

**Problem:**
- API endpoint only allowed `brand_admin` to send invitations
- Super Admin users received "Forbidden" error when attempting to invite users
- Error messaging was generic and didn't explain the issue

**Solution:**
- Updated authorization check to allow both `brand_admin` and `super_admin` roles
- Added explicit `brand_id` validation with clear error messages
- Enhanced error responses to guide users on what's required

**Code Changes:**
```typescript
// Before: Only brand_admin could invite
if (profileError || profile?.role_name !== "brand_admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// After: Both brand_admin and super_admin can invite
const canInvite = profile?.role_name === "brand_admin" || profile?.role_name === "super_admin";

if (!canInvite) {
  return NextResponse.json({ 
    error: "You don't have permission to invite users. Only brand administrators and super administrators can send invitations." 
  }, { status: 403 });
}

// Added brand_id validation
if (!brand_id) {
  return NextResponse.json(
    { error: "Missing required field: brand_id is required. Super admins must specify which brand this user belongs to." },
    { status: 400 }
  );
}
```

### 2. Invite Dialog Error Messages (`components/users/invite-user-dialog.tsx`)

**Problem:**
- UI error messages didn't reflect that Super Admins could also send invitations

**Solution:**
- Updated "Forbidden" error message to include Super Administrators

**Code Changes:**
```typescript
// Before
"You don't have permission to invite users. Only brand administrators can send invitations."

// After
"You don't have permission to invite users. Only brand administrators and super administrators can send invitations."
```

### 3. Password Reset Session Establishment (`app/auth/reset-password/page.tsx`)

**Problem:**
- Password reset page received recovery code from email but didn't exchange it for a valid Supabase session
- When users tried to update their password, Supabase returned "Auth session missing" error
- Users were stuck in a loop unable to reset their passwords

**Solution:**
- Added Supabase client import
- Implemented `exchangeCodeForSession` in useEffect to establish session before password update
- Added proper error handling and user feedback
- Enhanced UI to show specific error messages when session establishment fails

**Code Changes:**
```typescript
// Added session exchange logic
useEffect(() => {
  const exchangeCodeForSession = async () => {
    const code = searchParams.get("code");

    if (!code) {
      toast.error("Invalid or expired reset link");
      // ... redirect logic
      return;
    }

    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Error exchanging code for session:", error);
        setSessionError(error.message);
        toast.error("Invalid or expired reset link. Please request a new one.");
        // ... redirect logic
        return;
      }

      if (data.session) {
        setIsValidSession(true);
        console.log("Password reset session established successfully");
      } else {
        setSessionError("Failed to establish session");
        toast.error("Failed to establish reset session. Please try again.");
      }
    } catch (err) {
      console.error("Unexpected error exchanging code:", err);
      setSessionError("An unexpected error occurred");
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  exchangeCodeForSession();
}, [searchParams, router, supabase.auth]);
```

## Technical Details

### Session Exchange Process

The password reset flow now follows Supabase's recommended pattern:

1. **Email Link Click:** User receives email with recovery link containing a `code` parameter
2. **Code Exchange:** Reset page extracts code and calls `exchangeCodeForSession(code)`
3. **Session Established:** Supabase validates the code and creates an authenticated session
4. **Password Update:** With valid session, `updatePassword()` succeeds
5. **Redirect:** User is redirected to dashboard with new password

### Security Considerations

- Super Admins must specify `brand_id` when inviting users (can't be omitted)
- Recovery codes are single-use and time-limited by Supabase
- Session establishment includes automatic validation and expiration handling
- All errors are logged to console for debugging while showing user-friendly messages

## Testing Recommendations

### Super Admin Invite Flow
1. Log in as Super Admin
2. Navigate to Users page
3. Click "Invite User"
4. Fill in email, role, and verify brand is selected
5. Send invitation
6. Verify invitation email is received
7. Verify user profile is created with correct brand association

### Password Reset Flow
1. Navigate to login page
2. Click "Forgot Password"
3. Enter email and request reset
4. Check inbox for reset email
5. Click reset link in email
6. Verify reset page loads without errors
7. Enter new password and confirm
8. Submit form
9. Verify success message and redirect to dashboard
10. Log out and log back in with new password

## Files Modified

1. `app/api/users/invite/route.ts` - API endpoint authorization and validation
2. `components/users/invite-user-dialog.tsx` - Error message updates
3. `app/auth/reset-password/page.tsx` - Session exchange implementation

## Dependencies

- `@supabase/supabase-js` - Already installed, using `exchangeCodeForSession` method
- No new dependencies required

## Potential Future Enhancements

1. **Multi-brand User Invites:** Allow Super Admins to invite users to multiple brands at once
2. **Invite Templates:** Create role-based invite message templates
3. **Password Reset Analytics:** Track reset request patterns for security monitoring
4. **Session Timeout Handling:** Add explicit timeout messaging for expired reset links

## Notes

- All changes maintain backward compatibility with existing code
- No database migrations required
- No environment variable changes needed
- Linter validation passed for all modified files

