# Super Admin Access Testing Guide

## Prerequisites

- ✅ Code changes implemented
- ✅ Server running on http://localhost:3000
- ✅ Super admin account: diogo@diogoppedro.com

## Test Scenarios

### Test 1: Login via Brand Portal

**Steps:**
1. Open browser: http://localhost:3000
2. Click: "Enter Brand Portal" button (teal/green button)
3. Enter credentials:
   - Email: `diogo@diogoppedro.com`
   - Password: [your password]
4. Click: "Access Brand Portal"

**Expected Result:**
- ✅ Login succeeds (no error about wrong portal)
- ✅ Redirects to /dashboard
- ✅ Dashboard loads with all data visible

**Previous Behavior (Before Fix):**
- ❌ Error: "Access denied. This account is registered as a super_admin. Please sign in through the correct portal."
- ❌ User logged out immediately

---

### Test 2: Login via Distributor Portal

**Steps:**
1. **Important:** Log out first if logged in
2. Go to: http://localhost:3000
3. Click: "Enter Distributor Portal" button (green/teal button)
4. Enter credentials:
   - Email: `diogo@diogoppedro.com`
   - Password: [your password]
5. Click: "Access Distributor Portal"

**Expected Result:**
- ✅ Login succeeds
- ✅ Redirects to /dashboard
- ✅ All features accessible

---

### Test 3: Login via Manufacturer Portal

**Steps:**
1. **Important:** Log out first if logged in
2. Go to: http://localhost:3000
3. Click: "Enter Manufacturer Portal" button (blue button)
4. Enter credentials:
   - Email: `diogo@diogoppedro.com`
   - Password: [your password]
5. Click: "Access Manufacturer Portal"

**Expected Result:**
- ✅ Login succeeds
- ✅ Redirects to /dashboard
- ✅ All features accessible

---

### Test 4: Verify Super Admin Permissions

**After successful login, test access to:**

#### Navigation Menu
- ✅ Dashboard
- ✅ Users
- ✅ Sales
- ✅ Orders
- ✅ Purchase Orders
- ✅ Shipments
- ✅ Invoices
- ✅ Reports
- ✅ Financials
- ✅ Marketing
- ✅ Calendar
- ✅ Notifications
- ✅ Distributors
- ✅ Manufacturers

#### Users Page (/users)
**Navigate to:** Dashboard → Users

**Expected:**
- ✅ Can see all users across all organizations
- ✅ Can create new users
- ✅ Can edit any user
- ✅ Can approve/suspend users
- ✅ Can invite users to any organization
- ✅ Organization filter shows all organizations

**Check:**
```
1. Click "Users" in sidebar
2. Verify user list loads
3. Check if you can see users from different organizations
4. Try creating a test user (optional)
5. Verify no "Access Denied" errors
```

#### Sales Page (/sales)
**Navigate to:** Dashboard → Sales

**Expected:**
- ✅ Can see all sales data
- ✅ Can upload sales documents
- ✅ Can view analytics
- ✅ No organization restrictions

#### Organization Management
**Look for organization selector in:**
- Top navigation bar
- Settings page
- User management

**Expected:**
- ✅ Can see all organizations
- ✅ Can switch between organizations
- ✅ Can create new organizations (if feature exists)

---

### Test 5: Verify Other Roles Still Restricted

**Purpose:** Ensure the fix didn't break portal restrictions for non-super-admin users

#### Test with Brand Admin (if you have one)
```
Account type: brand_admin
Expected behavior:
- ✅ Can login via Brand Portal
- ❌ Cannot login via Distributor Portal (error)
- ❌ Cannot login via Manufacturer Portal (error)
```

#### Test with Distributor Admin (if you have one)
```
Account type: distributor_admin
Expected behavior:
- ❌ Cannot login via Brand Portal (error)
- ✅ Can login via Distributor Portal
- ❌ Cannot login via Manufacturer Portal (error)
```

**Note:** If you don't have other admin accounts, you can create test accounts via the Users page while logged in as super_admin.

---

## Quick Test Checklist

Use this for fast verification:

### Super Admin Access
- [ ] Login via Brand Portal succeeds
- [ ] Login via Distributor Portal succeeds
- [ ] Login via Manufacturer Portal succeeds
- [ ] Can access /dashboard
- [ ] Can access /users
- [ ] Can access /sales
- [ ] Can see all organizations
- [ ] No "Access Denied" errors

### Other Roles (Optional)
- [ ] brand_admin blocked from wrong portals
- [ ] distributor_admin blocked from wrong portals
- [ ] manufacturer_admin blocked from wrong portals

---

## Troubleshooting

### Issue: Still getting "Access denied" error

**Solutions:**
1. **Clear browser cache and cookies:**
   - Chrome: Cmd+Shift+Delete → Clear browsing data
   - Firefox: Cmd+Shift+Delete → Clear cookies and cache
   - Safari: Cmd+Option+E → Empty caches

2. **Try incognito/private browsing:**
   - Cmd+Shift+N (Chrome)
   - Cmd+Shift+P (Firefox)
   - Cmd+Shift+N (Safari)

3. **Restart the development server:**
   ```bash
   # Stop server (Ctrl+C)
   # Then start again:
   npm run dev
   ```

4. **Check database:**
   - Verify your user's role_type is "super_admin"
   - Check Supabase dashboard → Authentication → Users
   - Check Supabase dashboard → Table Editor → user_profiles

### Issue: Server not running

```bash
cd "/Users/diogoppedro/<:> Software Implementations/GrowShip_MVP"
npm run dev
```

### Issue: Other errors during testing

1. Check browser console (F12) for JavaScript errors
2. Check terminal for server errors
3. Verify .env.local has correct Supabase credentials
4. Check Network tab (F12) for failed API calls

---

## Testing Commands

### Check if server is running:
```bash
curl -s http://localhost:3000 > /dev/null && echo "Server running" || echo "Server not running"
```

### View server logs:
```bash
# Server should already be running in a terminal
# Check that terminal for any errors
```

### Check database (via Supabase CLI or dashboard):
```sql
-- Verify super admin user
SELECT 
  email, 
  role_type, 
  role_name, 
  user_status,
  is_profile_complete
FROM user_profiles 
WHERE email = 'diogo@diogoppedro.com';
```

---

## Success Criteria

✅ **All tests pass if:**
1. Super admin can login through ANY portal (Brand/Distributor/Manufacturer)
2. Super admin has access to ALL features and routes
3. Super admin can see and manage ALL organizations
4. Other role types are still restricted to their correct portals
5. No "Access denied" errors for super admin
6. No console errors or API failures

---

## Expected Database Values

For super admin account (diogo@diogoppedro.com):

```typescript
{
  email: "diogo@diogoppedro.com",
  role_type: "super_admin",          // ← This is what bypasses portal check
  role_name: "super_admin",           // ← This determines route access
  user_status: "approved",            // ← Must be approved
  is_profile_complete: true,          // ← Must be complete
  organization_id: null or string,    // ← Super admin not tied to one org
}
```

---

## Report Template

After testing, report results:

```
✅/❌ Test 1: Brand Portal Login - [PASS/FAIL]
✅/❌ Test 2: Distributor Portal Login - [PASS/FAIL]
✅/❌ Test 3: Manufacturer Portal Login - [PASS/FAIL]
✅/❌ Test 4: Super Admin Permissions - [PASS/FAIL]
✅/❌ Test 5: Other Roles Restricted - [PASS/FAIL] (or SKIPPED)

Notes:
[Any issues or observations]
```

---

**Ready to Test?** 
Start with Test 1 (Brand Portal) at http://localhost:3000

