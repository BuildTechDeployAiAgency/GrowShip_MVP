# Distributor Admin Import and Data Visibility Implementation

**Date:** November 10, 2025  
**Feature:** Enable Distributor Admins to import Excel files with auto-populated distributor_id and implement data visibility filtering  
**Status:** ✅ Complete

## Overview

Successfully implemented Excel import functionality for Distributor Admin users with automatic distributor_id population and comprehensive data visibility filtering to ensure they only see data related to their assigned distributor account.

## Key Features Implemented

### 1. Database Schema Updates

**File:** `supabase_migrations/023_add_distributor_id_to_user_profiles.sql`

- Added `distributor_id` column to `user_profiles` table (nullable UUID, foreign key to `distributors.id`)
- Created constraint to ensure distributor belongs to user's brand_id
- Added indexes for performance:
  - `idx_user_profiles_distributor_id` on `distributor_id`
  - `idx_user_profiles_brand_distributor` composite index

### 2. RLS Policy Updates

**File:** `supabase_migrations/024_add_distributor_rls_policies.sql`

Added RLS policies for distributor users to filter by `distributor_id` on:
- `distributors` table - distributor users can only view/manage their own distributor
- `orders` table - distributor users can only view/manage orders for their distributor
- `invoices` table - distributor users can only view/manage invoices for their distributor
- `purchase_orders` table - distributor users can only view/manage POs for their distributor
- `shipments` table - distributor users can only view/manage shipments for their distributor
- `sales_data` table - distributor users can only view/manage sales data for their distributor

All policies check: `distributor_id IN (SELECT distributor_id FROM user_profiles WHERE user_id = auth.uid() AND distributor_id IS NOT NULL)`

### 3. TypeScript Type Updates

**File:** `types/auth.ts`

- Added `distributor_id?: string` to `UserProfile` interface

### 4. Import API Route Updates

#### 4.1 Import Upload Route
**File:** `app/api/import/orders/route.ts`

- Updated profile query to include `distributor_id`
- Auto-populate `distributorId` from user profile when distributor_admin imports
- Return `distributorId` in response for distributor_admin users

#### 4.2 Import Validate Route
**File:** `app/api/import/orders/validate/route.ts`

- Updated profile query to include `distributor_id`
- Validate that distributor_admin can only import for their own distributor_id
- Auto-populate distributor_id from profile if not provided
- Return error if distributor_admin tries to import for different distributor

#### 4.3 Import Confirm Route
**File:** `app/api/import/orders/confirm/route.ts`

- Updated profile query to include `distributor_id`
- Validate that distributor_admin can only confirm imports for their own distributor_id
- Return error if distributor_admin tries to import for different distributor

#### 4.4 Template Route
**File:** `app/api/import/template/route.ts`

- Updated profile query to include `distributor_id`
- Auto-populate distributorId in template when distributor_admin downloads
- Validate that distributor_admin can only download templates for their distributor

### 5. Data Fetching Hooks Updates

#### 5.1 Orders Hook
**File:** `hooks/use-orders.ts`

- Added `distributorId` parameter to `UseOrdersOptions`
- Updated `fetchOrders` to filter by `distributorId` when provided
- For distributor_admin users, automatically filter by their distributor_id

#### 5.2 Invoices Hook
**File:** `hooks/use-invoices.ts`

- Added `distributorId` parameter to `UseInvoicesOptions`
- Updated `fetchInvoices` to filter by `distributorId` when provided

#### 5.3 Purchase Orders Hook
**File:** `hooks/use-purchase-orders.ts`

- Added `distributorId` parameter to `UsePurchaseOrdersOptions`
- Updated `fetchPurchaseOrders` to filter by `distributorId` when provided

#### 5.4 Distributors Hook
**File:** `hooks/use-distributors.ts`

- Added `distributorId` parameter to `UseDistributorsOptions`
- Updated `fetchDistributors` to filter by `distributorId` when provided
- For distributor_admin users, only return their own distributor

### 6. Import Page UI Updates

**File:** `app/import/page.tsx`

- Auto-select distributor for distributor_admin users from `profile.distributor_id`
- Skip distributor confirmation dialog for distributor_admin users (auto-populated)
- Auto-validate orders when distributor_admin uploads file
- Fetch only their own distributor for distributor_admin users
- Updated distributor selection logic to prioritize profile.distributor_id

### 7. Excel Parser Updates

**File:** `lib/excel/parser.ts`

- `AutoPopulationData` interface already includes `distributorId` (no changes needed)
- Parser already supports auto-populating distributor_id from autoPopulate parameter

## Security Considerations

1. **Database-Level Security**: RLS policies enforce distributor filtering at the database level
2. **API-Level Validation**: All import routes validate that distributor_admin can only import for their assigned distributor_id
3. **No Override Capability**: Distributor_admin users cannot override their distributor_id
4. **Automatic Filtering**: Hooks automatically filter by distributor_id for distributor_admin users

## Testing Checklist

- [x] Database migration adds distributor_id column successfully
- [x] RLS policies prevent access to other distributors' data
- [x] Distributor admin can import Excel files
- [x] Distributor_id auto-populates from profile during import
- [x] Distributor admin only sees orders for their distributor
- [x] Distributor admin only sees invoices for their distributor
- [x] Distributor admin only sees their own distributor account
- [x] Import validation works for distributor_admin
- [x] Import confirmation works for distributor_admin
- [x] Template download works for distributor_admin with auto-populated distributor_id

## Migration Instructions

1. Run database migration: `supabase_migrations/023_add_distributor_id_to_user_profiles.sql`
2. Run RLS policies migration: `supabase_migrations/024_add_distributor_rls_policies.sql`
3. Update existing distributor_admin users to set their `distributor_id` in `user_profiles` table
4. Restart the application to load new code changes

## Notes

- The `distributor_id` field in `user_profiles` is nullable, allowing for users who are not distributor admins
- RLS policies work in conjunction with hook-level filtering for defense in depth
- Profile fetching already uses `select("*")` so distributor_id will be included automatically after migration

