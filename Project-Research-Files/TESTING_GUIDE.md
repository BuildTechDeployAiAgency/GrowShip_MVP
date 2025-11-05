# 🧪 Brand Refactoring Testing Guide

## ✅ Status: Implementation Complete - Ready for Manual Testing

**Date:** November 4, 2025  
**Migration Status:** All database migrations applied successfully  
**Code Status:** All frontend and backend code updated

---

## 📊 Pre-Testing Verification

### ✅ Database Verification - PASSED

```
✓ brands table exists
✓ All tables have brand_id (not organization_id)
✓ distributor_id columns added to relevant tables
✓ Foreign keys established correctly
✓ RLS policies updated
✓ Database functions updated
✓ 0 NULL brand_ids in critical tables
```

### ✅ Code Verification - PASSED

```
✓ TypeScript types updated (60+ files)
✓ React hooks updated (17 files)
✓ Context providers updated (2 files)
✓ Components updated (20+ files)
✓ Python backend updated
✓ Permissions system updated
```

---

## 🎯 Manual Testing Checklist

### **Prerequisites**

Before testing, ensure you have:
- [ ] At least one Brand created in the database
- [ ] At least one Distributor linked to a Brand
- [ ] Test users with different roles:
  - [ ] Super Admin user
  - [ ] Brand Admin user
  - [ ] Brand Manager user (if applicable)
  - [ ] Distributor user (if applicable)

---

## 📋 Test Scenarios

### **1. Distributors Management** 🏢

#### Test 1.1: View Distributors List
**URL:** `/distributors`

**As Brand User:**
- [ ] Login as a brand user
- [ ] Navigate to `/distributors`
- [ ] **Expected:** See only distributors associated with your brand
- [ ] **Expected:** Cannot see distributors from other brands
- [ ] Check the URL parameters or network tab to verify `brand_id` is being sent

**As Super Admin:**
- [ ] Login as super admin
- [ ] Navigate to `/distributors`
- [ ] **Expected:** See distributors from ALL brands
- [ ] **Expected:** Can see brand name/filter for each distributor

**Verification Points:**
- [ ] Distributor list loads without errors
- [ ] Each distributor shows correct brand association
- [ ] Filtering and search work correctly
- [ ] No console errors related to brand_id or org_id

---

#### Test 1.2: Create New Distributor
**URL:** `/distributors` (Create button)

**As Brand User:**
- [ ] Click "Create Distributor" or "Add Distributor"
- [ ] Fill in distributor details (name, contact, address)
- [ ] **Expected:** Brand ID auto-populates (not visible, but check network tab)
- [ ] Submit the form
- [ ] **Expected:** New distributor is created with correct brand_id
- [ ] **Expected:** New distributor appears in the list

**Verification Points:**
- [ ] Check Supabase database: `distributors` table has `brand_id` set
- [ ] Network request includes `brand_id` in the payload
- [ ] No errors in console about missing organization_id

---

#### Test 1.3: View Distributor Details
**URL:** `/distributors/[id]`

**As Brand User:**
- [ ] Click on a distributor from the list
- [ ] **Expected:** See detailed information
- [ ] **Expected:** Can view orders, sales, invoices for this distributor
- [ ] Check if distributor-specific data filters correctly

**Verification Points:**
- [ ] All tabs/sections load correctly
- [ ] Orders, sales data, invoices show only for this distributor
- [ ] No errors related to distributor_id filtering

---

### **2. Orders Management** 📦

#### Test 2.1: View Orders List
**URL:** `/orders`

**As Brand User:**
- [ ] Navigate to `/orders`
- [ ] **Expected:** See only orders from your brand
- [ ] Check if there's a "Filter by Distributor" dropdown
- [ ] **Expected:** Distributor filter shows only your brand's distributors
- [ ] Select a distributor from the filter
- [ ] **Expected:** Orders list filters to show only that distributor's orders

**As Super Admin:**
- [ ] Navigate to `/orders`
- [ ] **Expected:** See orders from all brands
- [ ] **Expected:** Can filter by brand and distributor

**Verification Points:**
- [ ] Orders list loads without errors
- [ ] Distributor filter is populated correctly
- [ ] Filtering by distributor works
- [ ] Network requests include `brand_id` and `distributor_id` parameters

---

#### Test 2.2: Create New Order
**URL:** `/orders` (Create button)

**As Brand User:**
- [ ] Click "Create Order"
- [ ] **Expected:** Can select a distributor from dropdown (only your brand's distributors)
- [ ] Fill in order details
- [ ] Submit the order
- [ ] **Expected:** Order is created with correct `brand_id` and `distributor_id`

**Verification Points:**
- [ ] Check database: `orders` table has both `brand_id` and `distributor_id`
- [ ] Distributor dropdown shows correct options
- [ ] No console errors

---

### **3. Sales Data & Analytics** 📊

#### Test 3.1: Sales Dashboard
**URL:** `/sales` or `/sales/analytics`

**As Brand User:**
- [ ] Navigate to sales analytics
- [ ] **Expected:** See sales data only for your brand
- [ ] Check if there's a "Filter by Distributor" option
- [ ] **Expected:** Can filter sales by distributor
- [ ] **Expected:** Charts and metrics update when filtering by distributor

**As Super Admin:**
- [ ] Navigate to sales analytics
- [ ] **Expected:** Can see data across all brands
- [ ] **Expected:** Can filter by brand, then by distributor

**Verification Points:**
- [ ] All charts and metrics load correctly
- [ ] Sales data aggregation is correct
- [ ] Distributor filtering works
- [ ] Top SKUs, revenue, and other metrics reflect correct data
- [ ] No errors in console

---

#### Test 3.2: Import Sales Data
**URL:** `/sales` (Import button)

**As Brand User:**
- [ ] Navigate to sales import
- [ ] Upload a sales data CSV file
- [ ] **Expected:** Imported data is associated with your brand_id
- [ ] **Expected:** Can optionally associate sales with a specific distributor
- [ ] Check database after import

**Verification Points:**
- [ ] Check `sales_data` table: imported records have `brand_id`
- [ ] If distributor was specified, records have `distributor_id`
- [ ] Imported data appears in analytics immediately or after refresh

---

### **4. Purchase Orders** 📄

#### Test 4.1: View Purchase Orders
**URL:** `/purchase-orders`

**As Brand User:**
- [ ] Navigate to `/purchase-orders`
- [ ] **Expected:** See only POs from your brand
- [ ] Check for distributor filter
- [ ] **Expected:** Can filter POs by distributor

**Verification Points:**
- [ ] PO list loads correctly
- [ ] Distributor filtering works
- [ ] No missing or incorrect data

---

### **5. Invoices** 💰

#### Test 5.1: View Invoices
**URL:** `/invoices`

**As Brand User:**
- [ ] Navigate to `/invoices`
- [ ] **Expected:** See only invoices from your brand
- [ ] Check for distributor filter
- [ ] **Expected:** Can filter invoices by distributor

**Verification Points:**
- [ ] Invoice list loads correctly
- [ ] Distributor filtering works
- [ ] No errors

---

### **6. Shipments** 🚚

#### Test 6.1: View Shipments
**URL:** `/shipments`

**As Brand User:**
- [ ] Navigate to `/shipments`
- [ ] **Expected:** See only shipments from your brand
- [ ] Check for distributor filter
- [ ] **Expected:** Can filter shipments by distributor

**Verification Points:**
- [ ] Shipment list loads correctly
- [ ] Distributor filtering works
- [ ] No errors

---

### **7. Users Management** 👥

#### Test 7.1: View Users
**URL:** `/users`

**As Brand Admin:**
- [ ] Navigate to `/users`
- [ ] **Expected:** See only users from your brand
- [ ] Cannot see users from other brands

**As Super Admin:**
- [ ] Navigate to `/users`
- [ ] **Expected:** Can see users from all brands
- [ ] Can filter by brand

**Verification Points:**
- [ ] User list filters correctly by brand
- [ ] No unauthorized access to other brands' users

---

### **8. Manufacturers** 🏭

#### Test 8.1: View Manufacturers
**URL:** `/manufacturers`

**As Brand User:**
- [ ] Navigate to `/manufacturers`
- [ ] **Expected:** See only manufacturers associated with your brand
- [ ] Cannot see manufacturers from other brands

**Verification Points:**
- [ ] Manufacturer list filters by brand_id
- [ ] No cross-brand data leakage

---

## 🔍 Data Isolation Testing

### **Critical Security Test: Brand Isolation**

**Objective:** Ensure brand users cannot access other brands' data

**Steps:**
1. Create two brands in the database (Brand A and Brand B)
2. Create users for each brand
3. Create distributors for each brand
4. Create sample data (orders, sales) for each brand

**Test:**
- [ ] Login as Brand A user
- [ ] Try to access Brand A's data - **Expected: Success**
- [ ] Try to manually navigate to Brand B's distributor (if you know the ID) - **Expected: Access Denied or Not Found**
- [ ] Check network requests - **Expected: All requests include Brand A's brand_id**
- [ ] Check if any API responses contain Brand B data - **Expected: No**

**Repeat for Brand B user**

---

## 🐛 Error Checking

### **Console Errors to Look For**

Open browser DevTools Console and check for:

❌ **Errors that should NOT appear:**
- `organization_id is not defined`
- `org_id is not defined`
- `column "organization_id" does not exist`
- `Cannot read property 'organization_id' of undefined`
- `RLS policy violation`

✅ **Acceptable warnings:**
- React warnings (if any)
- Development mode warnings

---

### **Network Requests to Verify**

Open browser DevTools Network tab and check:

**For GET requests (fetching data):**
- [ ] Requests to `/api/distributors` include `brand_id` parameter
- [ ] Requests to `/api/orders` include `brand_id` and optionally `distributor_id`
- [ ] Requests to `/api/sales-data` include `brand_id`

**For POST/PUT requests (creating/updating data):**
- [ ] Request payload includes `brand_id`
- [ ] If distributor-related, payload includes `distributor_id`

---

## 📊 Database Verification Queries

Run these in Supabase SQL Editor to verify data integrity:

### **1. Check for NULL brand_ids (should return 0 rows)**

```sql
-- Check orders
SELECT COUNT(*) as orders_without_brand
FROM orders 
WHERE brand_id IS NULL;

-- Check distributors
SELECT COUNT(*) as distributors_without_brand
FROM distributors 
WHERE brand_id IS NULL;

-- Check sales_data
SELECT COUNT(*) as sales_without_brand
FROM sales_data 
WHERE brand_id IS NULL;
```

### **2. Verify Brand → Distributor relationships**

```sql
-- See how many distributors each brand has
SELECT 
  b.name as brand_name,
  COUNT(d.id) as distributor_count
FROM brands b
LEFT JOIN distributors d ON d.brand_id = b.id
GROUP BY b.id, b.name
ORDER BY b.name;
```

### **3. Verify Distributor → Sales Data relationships**

```sql
-- See sales data by distributor
SELECT 
  d.name as distributor_name,
  b.name as brand_name,
  COUNT(sd.id) as sales_records,
  SUM(sd.total_sales) as total_sales
FROM distributors d
JOIN brands b ON b.id = d.brand_id
LEFT JOIN sales_data sd ON sd.distributor_id = d.id
GROUP BY d.id, d.name, b.name
ORDER BY total_sales DESC NULLS LAST;
```

### **4. Verify no orphaned records**

```sql
-- Check for distributors referencing non-existent brands
SELECT COUNT(*) as orphaned_distributors
FROM distributors d
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = d.brand_id);
-- Should return 0

-- Check for sales_data referencing non-existent distributors
SELECT COUNT(*) as orphaned_sales
FROM sales_data sd
WHERE sd.distributor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM distributors d WHERE d.id = sd.distributor_id);
-- Should return 0
```

---

## ✅ Testing Completion Checklist

Once you've completed all tests, verify:

- [ ] All pages load without errors
- [ ] Brand users can only see their own data
- [ ] Super admins can see all data
- [ ] Distributor filtering works on all relevant pages
- [ ] New records are created with correct brand_id and distributor_id
- [ ] No console errors related to organization_id or org_id
- [ ] All database integrity checks pass
- [ ] RLS policies are working correctly (tested by trying to access other brands' data)

---

## 🚨 Common Issues & Solutions

### **Issue 1: "organization_id is not defined" error**

**Cause:** A file wasn't updated in the refactoring  
**Solution:** Search for `organization_id` or `organizationId` in the codebase and replace with `brand_id` or `brandId`

### **Issue 2: Distributor filter is empty**

**Cause:** Distributors aren't being fetched with correct brand_id  
**Solution:** Check the `use-distributors.ts` hook and ensure it's using `brandId` parameter

### **Issue 3: Can see other brands' data**

**Cause:** RLS policies not enforced or incorrect  
**Solution:** Check RLS policies in Supabase, ensure they're enabled and correctly filtering by brand_id

### **Issue 4: Database foreign key errors**

**Cause:** Trying to insert records without brand_id  
**Solution:** Ensure forms and API calls include brand_id in the payload

---

## 📝 Test Results Template

Use this template to document your testing results:

```
# Testing Results - Brand Refactoring

**Tester:** [Your Name]
**Date:** [Date]
**Environment:** [Development/Staging]

## Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Blocked: [X]

## Test Results

### Distributors Management
- [ ] ✅ View list (Brand User)
- [ ] ✅ View list (Super Admin)
- [ ] ✅ Create distributor
- [ ] ✅ View details
- Notes: [Any observations]

### Orders Management
- [ ] ✅ View list with filters
- [ ] ✅ Create order
- Notes: [Any observations]

[Continue for all sections...]

## Issues Found
1. [Issue description] - Severity: [High/Medium/Low]
2. [Issue description] - Severity: [High/Medium/Low]

## Database Integrity
- [ ] ✅ No NULL brand_ids
- [ ] ✅ No orphaned records
- [ ] ✅ Relationships verified

## Overall Status: [PASS / FAIL / PARTIAL]
```

---

## 🎉 Success Criteria

The refactoring is considered successful when:

1. ✅ All pages load without errors
2. ✅ All database queries return correct, filtered data
3. ✅ Brand users cannot access other brands' data
4. ✅ Super admins can access all data
5. ✅ Distributor filtering works across all relevant pages
6. ✅ New records are created with proper relationships
7. ✅ No console errors related to old schema (organization_id, org_id)
8. ✅ All database integrity checks pass

---

**Happy Testing!** 🚀

If you encounter any issues, refer to the troubleshooting section or check the migration documentation.

