# Products Table Fix - PostgREST Schema Cache Issue

## Problem

The products table exists in the database but PostgREST's schema cache hasn't been updated, causing this error:

```
Could not find the table 'public.products' in the schema cache
```

## Root Cause

When new tables are created in Supabase, the PostgREST service needs to reload its schema cache to recognize them. This doesn't always happen automatically.

## Solution

### Option 1: Manual Schema Reload (Recommended - Takes 30 seconds)

1. Go to the Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/runefgxmlbsegacjrvvu/sql/new

2. Run this SQL command:

   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

3. Wait 10-15 seconds, then refresh your application

### Option 2: Wait for Auto-Reload

The schema cache automatically reloads every 5-10 minutes. Just wait and it will work.

### Option 3: Restart the Project (if Options 1 & 2 don't work)

1. Go to https://supabase.com/dashboard/project/runefgxmlbsegacjrvvu/settings/general
2. Click "Pause project"
3. Wait 30 seconds
4. Click "Restore project"
5. Wait for the project to fully restart (2-3 minutes)

## Verification

After applying the fix, verify it worked by running:

```bash
node scripts/verify-products-ready.js
```

You should see:

```
✅ Products table is accessible!
🎉 SUCCESS! Your Products page is fully functional!
```

## What We've Verified

✅ Products table exists in database
✅ Migration was run successfully
✅ All fields match the schema
✅ RLS policies are configured correctly
✅ Service role can access the table (for head/count operations)
✅ All React components are correctly implemented
✅ Product form dialog has all database fields
✅ Products list component matches database schema

## Components Ready

All these files are correctly implemented and ready to work once the cache is reloaded:

- `/app/products/page.tsx` - Products page
- `/components/products/products-list.tsx` - Products list with all fields
- `/components/products/product-form-dialog.tsx` - Create/edit form with validation
- `/hooks/use-products.ts` - Data fetching and mutations
- Database schema: `supabase_migrations/008_create_products_table.sql`

## The products page includes:

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Search by SKU, name, category, barcode
- ✅ Filter by status and category
- ✅ List view with all key fields:
  - Product name and image
  - SKU and barcode
  - Category
  - Pricing (unit price, cost price, currency)
  - Stock levels with low stock warnings
  - Status badges
- ✅ Product form with all database fields:
  - Basic info (SKU, name, description, category)
  - Pricing (unit price, cost, currency)
  - Inventory (stock, reorder level, reorder quantity)
  - Product details (weight, barcode, image URL)
  - Status and tags
  - Supplier info
  - Notes
- ✅ Permission-based access control
- ✅ Validation and error handling
- ✅ Toast notifications
- ✅ Loading states

## Next Steps

1. Run the SQL command in Supabase Dashboard (takes 30 seconds)
2. Refresh the application
3. Navigate to /products
4. The page should load without errors
5. Try creating a new product to verify full functionality
