# ✅ Supabase Setup - COMPLETE

**Status:** All credentials verified and configured  
**Date:** November 3, 2024  
**Project:** GrowShip-MVP

## 🚨 Critical Issue: Environment Variables Not Configured

The app requires valid Supabase credentials to function. Currently, your `.env.local` file has placeholder values which cause the "Failed to fetch" error.

---

## Step-by-Step Setup

### 1. Get Your Supabase Credentials

1. **Go to Supabase Dashboard**

   - Visit: https://supabase.com/dashboard
   - Sign in or create an account if you don't have one

2. **Create or Select Your Project**

   - If you don't have a project, click "New Project"
   - Fill in the project details
   - Wait for the project to be provisioned (takes ~2 minutes)

3. **Get Your API Credentials**
   - Click on your project
   - Go to **Settings** (⚙️ icon in sidebar)
   - Click on **API** in the settings menu
   - You'll see three important values:

#### Required Values:

**a) Project URL**

```
Example: https://abcdefghijklmnop.supabase.co
```

- This is your `NEXT_PUBLIC_SUPABASE_URL`

**b) Anon/Public Key**

```
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...
```

- This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ⚠️ This is safe to expose in client-side code

**c) Service Role Key**

```
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...
```

- This is your `SUPABASE_SERVICE_ROLE_KEY`
- ⚠️ **KEEP THIS SECRET!** Never expose in client-side code
- ⚠️ **DO NOT COMMIT TO GIT!** Ensure `.env.local` is in `.gitignore`

---

### 2. Update `.env.local` File

Open your `.env.local` file in the project root and replace the placeholder values:

```bash
# Open in your editor
code .env.local

# Or use nano
nano .env.local
```

Replace this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

With your actual values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...
```

---

### 3. Restart the Development Server

After updating `.env.local`, you **MUST** restart the server for the changes to take effect:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 4. Verify Configuration

After restarting, try to log in again with your credentials:

- Email: `diogo@diogoppedro.com`
- Password: Your password

### Expected Behavior:

- ✅ Login should work without "Failed to fetch" error
- ✅ Authentication should complete successfully
- ✅ You should be redirected to the dashboard

### If Still Failing:

**Check Browser Console:**

1. Open DevTools (F12)
2. Go to Console tab
3. Look for any Supabase-related errors

**Verify Environment Variables Are Loaded:**

```javascript
// In browser console, type:
console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "Key:",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + "..."
);
```

If these show placeholder values, the `.env.local` file isn't being read properly.

---

## 5. Database Setup (If Needed)

If your Supabase project is brand new, you'll need to set up the database tables:

1. **Run SQL Migrations**

   - Go to your Supabase Dashboard
   - Click on **SQL Editor**
   - Run the migration scripts from your project (if available)

2. **Required Tables:**
   - `user_profiles` - User profile data
   - `sales_documents_storage` - Document storage metadata
   - Any other tables your app needs

---

## Security Best Practices

### ✅ DO:

- Keep `.env.local` in `.gitignore` (already done)
- Use environment variables for all sensitive data
- Rotate keys if they're ever exposed
- Use Row Level Security (RLS) in Supabase

### ❌ DON'T:

- Never commit `.env.local` to Git
- Never share your Service Role Key
- Don't hardcode credentials in your code
- Don't use production keys in development

---

## Troubleshooting

### Error: "Failed to fetch"

**Cause:** Invalid or placeholder Supabase credentials  
**Fix:** Follow steps 1-3 above

### Error: "Invalid API key"

**Cause:** Incorrect anon key or URL  
**Fix:** Double-check you copied the correct values from Supabase Dashboard

### Error: "unauthorized"

**Cause:** Service role key is incorrect  
**Fix:** Verify you copied the Service Role Key (not JWT Secret)

### Changes not taking effect

**Cause:** Server needs restart after `.env.local` changes  
**Fix:** Stop server (Ctrl+C) and run `npm run dev` again

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

**Last Updated:** November 3, 2024  
**Priority:** 🚨 CRITICAL - Required for app to function
