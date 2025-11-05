# Brand Schema Refactoring Migration Guide

## Overview
This guide provides step-by-step instructions for applying the brand schema refactoring migrations to your Supabase database.

## Prerequisites
- ✅ All code changes have been made (types, hooks, contexts, components, backend)
- ✅ Migration scripts are ready in `supabase_migrations/` directory
- ⚠️ **BACKUP YOUR DATABASE BEFORE PROCEEDING**
- Access to Supabase SQL Editor or CLI

## Migration Order

The migrations MUST be applied in the following order:

1. `001_rename_organizations_to_brands.sql`
2. `002_update_foreign_keys_to_brand_id.sql`
3. `003_update_distributors_table.sql`
4. `004_add_distributor_relationships.sql`
5. `005_update_manufacturers_table.sql`
6. `006_update_rls_policies.sql`
7. `007_update_database_functions.sql`

## Step-by-Step Instructions

### Step 1: Backup Your Database

```bash
# Using Supabase CLI
supabase db dump -f backup_before_brand_refactoring.sql

# Or from Supabase Dashboard:
# Settings → Database → Database backups → Create backup
```

### Step 2: Apply Migrations via Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. For each migration file (001-007), in order:
   - Open the migration file in a text editor
   - Copy the entire SQL content
   - Paste it into the Supabase SQL Editor
   - Click **Run** to execute
   - Wait for confirmation of successful execution
   - Verify no errors in the output

### Step 3: Alternative - Using Supabase CLI

If you have Supabase CLI installed and linked:

```bash
# Navigate to your project directory
cd "/Users/diogoppedro/<:> Software Implementations/GrowShip_MVP"

# Apply migrations one by one
supabase db execute < supabase_migrations/001_rename_organizations_to_brands.sql
supabase db execute < supabase_migrations/002_update_foreign_keys_to_brand_id.sql
supabase db execute < supabase_migrations/003_update_distributors_table.sql
supabase db execute < supabase_migrations/004_add_distributor_relationships.sql
supabase db execute < supabase_migrations/005_update_manufacturers_table.sql
supabase db execute < supabase_migrations/006_update_rls_policies.sql
supabase db execute < supabase_migrations/007_update_database_functions.sql
```

### Step 4: Run Verification Queries

After ALL migrations are applied, run the verification script:

```bash
# Using Supabase SQL Editor:
# Copy and paste verify_migration.sql
# Run each section individually to review results

# Or using CLI:
supabase db execute < supabase_migrations/verify_migration.sql
```

## Verification Checklist

After running verify_migration.sql, check the following:

### ✅ Table Existence
- [ ] `brands` table exists
- [ ] `organizations` table does NOT exist (renamed)
- [ ] `organizations_archived` table exists (with non-brand records)

### ✅ Column Verification
- [ ] All tables use `brand_id` instead of `organization_id`
- [ ] `distributor_id` exists in: sales_data, orders, purchase_orders, invoices, shipments
- [ ] No orphaned `organization_id` columns remain (except in archived tables)

### ✅ Foreign Key Constraints
- [ ] All `brand_id` columns have foreign keys to `brands(id)`
- [ ] All `distributor_id` columns have foreign keys to `distributors(id)`
- [ ] Distributors table has `brand_id` foreign key (NOT NULL)
- [ ] Manufacturers table has `brand_id` foreign key (NOT NULL)

### ✅ Indexes
- [ ] `idx_distributors_brand_id` exists
- [ ] `idx_manufacturers_brand_id` exists
- [ ] `idx_sales_data_distributor_id` exists
- [ ] `idx_sales_data_brand_distributor_date` composite index exists
- [ ] `idx_orders_distributor_id` exists
- [ ] `idx_orders_brand_distributor` composite index exists

### ✅ RLS Policies
- [ ] All tables have RLS enabled
- [ ] Brand users can only see their brand's data
- [ ] Brand users can only see their distributors
- [ ] Super admins can see all data
- [ ] No old "organization" policies remain

### ✅ Database Functions
- [ ] `get_brand_sales_data()` function exists
- [ ] `get_category_performance()` function exists
- [ ] `get_monthly_sales_trend()` function exists
- [ ] `create_brand_view()` function exists (replaces create_organization_view)
- [ ] `get_brand_distributors()` helper function exists
- [ ] `get_sales_by_distributor()` helper function exists

### ✅ Data Integrity
- [ ] All distributors have `brand_id` (no NULLs)
- [ ] All manufacturers have `brand_id` (no NULLs)
- [ ] No orphaned records (foreign keys all resolve)
- [ ] Archived organizations are preserved

## Testing the Application

### Step 5: Test Frontend Functionality

After migrations are complete, test these features:

#### Distributors
- [ ] Navigate to `/distributors` page
- [ ] List loads without errors
- [ ] Create new distributor (should auto-assign brand_id)
- [ ] Edit existing distributor
- [ ] View distributor details page
- [ ] Check that brand users only see their distributors

#### Orders
- [ ] Navigate to `/orders` page
- [ ] List loads without errors
- [ ] Create new order
- [ ] Filter orders by distributor (if distributor_id is set)
- [ ] Verify brand_id is correctly set

#### Sales Data
- [ ] Navigate to `/sales` and `/sales/analytics`
- [ ] Import sales data (should include distributor_id)
- [ ] View sales metrics
- [ ] Check sales by distributor reports

#### Other Pages
- [ ] Test `/purchase-orders` - verify brand_id queries work
- [ ] Test `/invoices` - verify brand_id queries work
- [ ] Test `/shipments` - verify brand_id queries work
- [ ] Test `/users` - verify brand_id filtering works

### Step 6: Test Brand User Isolation

1. **Login as Brand User**:
   - [ ] Can only see distributors for their brand
   - [ ] Can only see orders for their brand
   - [ ] Can only see sales data for their distributors
   - [ ] Cannot see other brands' data

2. **Login as Super Admin**:
   - [ ] Can see all brands
   - [ ] Can see all distributors across brands
   - [ ] Can see all data

### Step 7: Monitor for Issues

After deployment, monitor:
- Application error logs
- Supabase logs for RLS policy violations
- User reports of missing data
- Performance of new composite indexes

## Rollback Procedure

⚠️ **ONLY IF NEEDED**

If you encounter critical issues and need to rollback:

```bash
# Using Supabase SQL Editor or CLI:
supabase db execute < supabase_migrations/rollback_brand_refactoring.sql
```

**Note**: Rollback will:
- Rename `brands` back to `organizations`
- Restore all `brand_id` columns to `organization_id`
- Restore archived organizations (optional, commented out)
- Remove distributor_id columns and relationships

## Post-Migration Tasks

After successful migration and testing:

1. **Update Documentation**:
   - [ ] Update API documentation to use "brand" terminology
   - [ ] Update user guides and help docs
   - [ ] Update ERD diagrams

2. **Update Team**:
   - [ ] Notify team of schema changes
   - [ ] Update local development databases
   - [ ] Review any custom SQL queries in reporting tools

3. **Performance Monitoring**:
   - [ ] Monitor query performance with new indexes
   - [ ] Check for slow queries in Supabase dashboard
   - [ ] Optimize as needed

## Common Issues & Solutions

### Issue: "relation organizations does not exist"
**Solution**: Migration 001 successfully completed. Update any remaining code references.

### Issue: "column organization_id does not exist"
**Solution**: Check that migrations 002-007 completed successfully. Some old code may still reference organization_id.

### Issue: "foreign key violation"
**Solution**: Ensure migration 001 properly archived non-brand organizations before renaming the table.

### Issue: RLS Policy Errors
**Solution**: Re-run migration 006 to ensure all RLS policies are updated.

## Success Criteria

Migration is successful when:
1. ✅ All 7 migrations execute without errors
2. ✅ All verification queries pass
3. ✅ Frontend application loads without errors
4. ✅ Brand users can only see their data
5. ✅ Super admins can see all data
6. ✅ No orphaned records or foreign key violations
7. ✅ All CRUD operations work correctly

## Support

If you encounter issues:
1. Check migration order (must be 001-007)
2. Review error messages in Supabase logs
3. Verify all code changes are deployed
4. Check that RLS policies are correctly applied
5. Use rollback script if needed

---

**Migration Date**: _____________
**Applied By**: _____________
**Verified By**: _____________

