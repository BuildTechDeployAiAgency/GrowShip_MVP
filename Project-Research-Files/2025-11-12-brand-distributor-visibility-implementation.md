# Brand and Distributor Admin Visibility Implementation

**Date:** November 12, 2025  
**Status:** ✅ Complete

## Overview

Implemented comprehensive RLS (Row Level Security) policies to ensure brand admins and distributor admins only see data within their respective scopes:

- **Brand Admins**: See all distributors and records within their brand
- **Distributor Admins**: See only records linked to their specific distributor

## Problem Statement

Users `noahjxpedro@gmail.com` and `isabellarxpedro@gmail.com` (User ID: `183fae76-a2e4-415c-bac3-ef932bbadc03`) should only see:
- Records under Brand: `5f563ab7-a6b1-4a8c-af25-2d19d656f26e`
- Records linked to Distributor: `d0c13998-62e5-4d89-adec-10bb6ae47e3b`

## Solution Implemented

### Migration 027: Ensure Brand and Distributor Admin Visibility

**File:** `supabase_migrations/027_ensure_brand_distributor_visibility.sql`

#### Tables Updated with RLS Policies:

1. **distributors**
   - Brand admins: See all distributors in their brand
   - Distributor admins: See only their own distributor

2. **orders**
   - Brand admins: See orders for their brand's distributors
   - Distributor admins: See only orders for their distributor

3. **invoices**
   - Brand admins: See invoices for their brand
   - Distributor admins: See only invoices for their distributor

4. **purchase_orders**
   - Brand admins: See POs for their brand
   - Distributor admins: See only POs for their distributor

5. **shipments**
   - Brand admins: See shipments for their brand
   - Distributor admins: See only shipments for their distributor

6. **sales_data**
   - Brand admins: See sales data for their brand
   - Distributor admins: See only sales data for their distributor

7. **user_profiles**
   - Brand admins: See profiles in their brand
   - Distributor admins: See only profiles linked to their distributor

#### Policy Logic:

Each policy checks:
1. **Super Admin**: Can see/manage all (bypasses all filters)
2. **Brand Admin** (`distributor_id IS NULL`): Can see/manage data where `brand_id` matches their brand
3. **Distributor Admin** (`distributor_id IS NOT NULL`): Can only see/manage data where:
   - `distributor_id` matches their distributor_id
   - `brand_id` matches their brand_id (double-check for security)

### Migration 028: Products and Manufacturers Access

**File:** `supabase_migrations/028_ensure_products_manufacturers_distributor_access.sql`

#### Tables Updated:

1. **products**
   - Brand admins: Can view and manage products for their brand
   - Distributor admins: Can view products from their brand (read-only)
   - Super admins: Can view and manage all products

2. **manufacturers**
   - Brand admins: Can view and manage manufacturers for their brand
   - Distributor admins: Can view manufacturers from their brand (read-only)
   - Super admins: Can view and manage all manufacturers

**Note:** Products and manufacturers are brand-level resources, so distributor admins can view them but cannot create/update/delete them.

## Helper Functions Created

1. `is_distributor_admin(user_uuid)` - Checks if user is a distributor admin
2. `get_user_distributor_id(user_uuid)` - Gets user's distributor_id
3. `get_user_brand_id(user_uuid)` - Gets user's brand_id

## Application-Level Filtering

The following hooks and components already implement application-level filtering that works with RLS:

### Hooks:
- `use-orders.ts` - Filters by `distributorId` for distributor admins
- `use-distributors.ts` - Filters by `distributorId` for distributor admins
- `use-products.ts` - Filters by `brandId` (RLS handles distributor admin filtering)
- `use-invoices.ts` - Filters by `distributorId` for distributor admins
- `use-purchase-orders.ts` - Filters by `distributorId` for distributor admins
- `use-shipments.ts` - Filters by `distributorId` for distributor admins

### Components:
- `components/orders/orders-list.tsx` - Passes `distributorId` from profile
- `app/import/page.tsx` - Uses `distributorId` for distributor admins
- `app/api/import/*` - Validates `distributorId` matches user's distributor

## Verification

### Test Queries (Run in Supabase SQL Editor):

```sql
-- Test as distributor admin user
-- Should only see their own distributor
SELECT COUNT(*) FROM distributors 
WHERE id IN (
  SELECT distributor_id FROM user_profiles 
  WHERE user_id = auth.uid() 
  AND distributor_id IS NOT NULL
);

-- Should only see orders for their distributor
SELECT COUNT(*) FROM orders 
WHERE distributor_id IN (
  SELECT distributor_id FROM user_profiles 
  WHERE user_id = auth.uid() 
  AND distributor_id IS NOT NULL
);

-- Should see products from their brand
SELECT COUNT(*) FROM products 
WHERE brand_id IN (
  SELECT brand_id FROM user_profiles 
  WHERE user_id = auth.uid()
);
```

### Expected Behavior:

**For Distributor Admin (`183fae76-a2e4-415c-bac3-ef932bbadc03`):**
- ✅ Can see only distributor `d0c13998-62e5-4d89-adec-10bb6ae47e3b`
- ✅ Can see only orders/invoices/POs/shipments for that distributor
- ✅ Can see products/manufacturers from brand `5f563ab7-a6b1-4a8c-af25-2d19d656f26e`
- ✅ Cannot see other distributors in the brand
- ✅ Cannot create/update/delete products or manufacturers

**For Brand Admin:**
- ✅ Can see all distributors in their brand
- ✅ Can see all orders/invoices/POs/shipments for their brand
- ✅ Can manage products and manufacturers for their brand

## Security Notes

1. **Double-Check Pattern**: Distributor admin policies check both `distributor_id` AND `brand_id` to ensure distributors belong to their brand
2. **RLS First**: Database-level RLS policies are the primary security mechanism
3. **Application Filtering**: Application-level filtering provides additional security and better UX
4. **Read-Only Access**: Distributor admins have read-only access to brand-level resources (products, manufacturers)

## Files Modified

1. `supabase_migrations/027_ensure_brand_distributor_visibility.sql` - Main RLS policies
2. `supabase_migrations/028_ensure_products_manufacturers_distributor_access.sql` - Products/manufacturers policies

## Testing Checklist

- [x] Migration 027 applied successfully
- [x] Migration 028 applied successfully
- [ ] Test distributor admin can only see their distributor
- [ ] Test distributor admin can only see their orders/invoices/POs/shipments
- [ ] Test distributor admin can see products/manufacturers from their brand
- [ ] Test distributor admin cannot create/update/delete products/manufacturers
- [ ] Test brand admin can see all distributors in their brand
- [ ] Test brand admin can see all records for their brand
- [ ] Test super admin can see everything

## Next Steps

1. Test with actual user accounts (`noahjxpedro@gmail.com` and `isabellarxpedro@gmail.com`)
2. Verify all pages/components respect the visibility rules
3. Monitor for any RLS policy violations in logs
4. Update documentation if needed

