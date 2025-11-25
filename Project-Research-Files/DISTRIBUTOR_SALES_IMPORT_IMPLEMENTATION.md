# Distributor Sales Report Import Module - Implementation Guide

**Date:** November 22, 2025  
**Version:** 1.0  
**Status:** ✅ Implementation Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Excel Template & Field Mapping](#excel-template--field-mapping)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Data Flow](#data-flow)
8. [Security & Access Control](#security--access-control)
9. [Testing Guide](#testing-guide)
10. [Integration with Dashboards](#integration-with-dashboards)
11. [Future Enhancements](#future-enhancements)

---

## Overview

The Distributor Sales Report Import Module enables distributors and brand admins to upload monthly sales data via Excel files. This Phase 1 MVP feature processes distributor sales reports and integrates them into the existing sales tracking and analytics system.

### Key Features

- **Excel-based Import**: Uses ExcelJS for robust file parsing
- **Data Validation**: Comprehensive validation against products catalog and business rules
- **Role-based Access**: Distributor admins can only import their own data; brand admins see all
- **Batch Processing**: Handles large files with batched database inserts
- **Error Reporting**: Detailed validation feedback with row-level error tracking
- **Dashboard Integration**: Imported data flows directly into existing analytics

### Technical Stack

- **Backend**: Next.js API Routes, TypeScript
- **Database**: Supabase PostgreSQL with RLS policies
- **Parsing**: ExcelJS library
- **Frontend**: React, Next.js 14, shadcn/ui components

---

## Architecture

### System Components

```
┌─────────────────────┐
│   Frontend (Next.js) │
│  - Import Page       │
│  - useImportSales()  │
│  - Validation UI     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   API Routes        │
│  - /api/import/sales│
│  - .../validate     │
│  - .../confirm      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Business Logic    │
│  - sales-parser.ts  │
│  - Validation       │
│  - Batch Insert     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Supabase DB       │
│  - sales_data table │
│  - RLS Policies     │
│  - Import Logs      │
└─────────────────────┘
```

---

## Database Schema

### Migration: `038_add_sales_data_import_fields.sql`

#### New Columns Added to `sales_data`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `reporting_month` | DATE | Yes | Normalized month (first day) for reporting |
| `import_timestamp` | TIMESTAMPTZ | No | When data was imported (default: now()) |
| `sales_channel` | TEXT | Yes | Channel: retail, ecom, wholesale, direct, other |
| `gross_revenue_local` | NUMERIC(14,2) | Yes | Gross revenue before discounts/returns |
| `marketing_spend` | NUMERIC(14,2) | Yes | Marketing spend associated with sales |
| `territory_country` | TEXT | Yes | Country-level territory classification |

#### Indexes Created

- `idx_sales_data_reporting_month` - For monthly reporting queries
- `idx_sales_data_brand_dist_month` - Composite for brand + distributor + month
- `idx_sales_data_sales_channel` - For channel-based filtering
- `idx_sales_data_territory_country` - For country-based filtering
- `idx_sales_data_import_timestamp` - For import tracking and auditing

#### Trigger: `populate_reporting_month`

Auto-populates `reporting_month` from `sales_date` by normalizing to the first day of the month.

```sql
-- Example: sales_date = '2025-11-15' → reporting_month = '2025-11-01'
```

### Existing RLS Policies (Maintained)

From `027_ensure_brand_distributor_visibility.sql`:

- **Super Admin**: Can see all sales data
- **Brand Admin**: Can see sales data for their brand (all distributors)
- **Distributor Admin**: Can only see sales data for their assigned distributor

---

## Excel Template & Field Mapping

### Configuration: `lib/excel/sales-template-config.ts`

#### Required Fields

| Excel Header | Database Column | Type | Validation |
|--------------|----------------|------|------------|
| Sales Date | `sales_date` | DATE | Valid date, normalized to `reporting_month` |
| SKU | `sku` | TEXT | Must exist in products and be active |
| Retailer | `retailer_name` | TEXT | Not empty |
| Territory/Region | `territory` | TEXT | Not empty |
| Units Sold | `units_sold` | NUMERIC | >= 0 |
| Net Revenue | `total_sales` | NUMERIC | >= 0 |

#### Optional Fields

| Excel Header | Database Column | Type | Validation |
|--------------|----------------|------|------------|
| Product Name | `product_name` | TEXT | For reference only |
| Category | `category` | TEXT | For reference only |
| Country | `territory_country` | TEXT | Country name |
| Sales Channel | `sales_channel` | TEXT | Must be: retail, ecom, wholesale, direct, other |
| Currency | `currency` | TEXT | Defaults to USD |
| Gross Revenue Local | `gross_revenue_local` | NUMERIC | >= 0 |
| Marketing Spend | `marketing_spend` | NUMERIC | >= 0 |
| Distributor ID | `distributor_id` | UUID | Auto-filled from user profile |
| Target Revenue | `target_revenue` | NUMERIC | >= 0 (optional comparison) |
| Notes | `notes` | TEXT | Free text |

### Template Generator: `lib/excel/sales-template-generator.ts`

Generates downloadable Excel templates with:
- Color-coded headers (dark green = required, light green = optional)
- Sample data row with examples
- Data validation dropdowns for `sales_channel`
- Instructions sheet with field descriptions
- Brand and distributor ID pre-populated when applicable

**Download Endpoint**: `GET /api/import/template?type=sales&brandId=xxx&distributorId=xxx`

---

## Backend Implementation

### 1. Parser: `lib/excel/sales-parser.ts`

**Function**: `parseSalesExcel(fileBuffer, autoPopulateData)`

**Process**:
1. Load Excel workbook using ExcelJS
2. Validate required headers are present
3. Iterate through rows, extracting and parsing data
4. Normalize dates to `reporting_month` (first day of month)
5. Parse numbers, handling currency symbols and commas
6. Collect distributor IDs and enforce single-distributor rule
7. Return `ParsedSalesRow[]` array with extracted metadata

**Error Handling**:
- Missing required columns → throw error with column list
- Multiple distributor IDs → throw error with conflicting IDs
- Invalid data types → log warning, skip row

### 2. Upload/Parse Endpoint: `app/api/import/sales/route.ts`

**Endpoint**: `POST /api/import/sales`

**Request**: FormData with `file` field

**Process**:
1. Authenticate user and get profile (brand_id, distributor_id)
2. Validate file type (.xlsx, .xls) and size (<= 10MB)
3. Generate file hash (SHA-256) for tracking
4. Call `parseSalesExcel()` with auto-populate data
5. Return parsed sales rows with metadata

**Response**:
```json
{
  "success": true,
  "data": {
    "salesRows": [...],
    "totalCount": 150,
    "fileHash": "abc123...",
    "fileName": "sales_november.xlsx",
    "fileSize": 245678,
    "brandId": "uuid",
    "extractedDistributorId": "uuid",
    "distributorIdConsistent": true
  }
}
```

### 3. Validation Endpoint: `app/api/import/sales/validate/route.ts`

**Endpoint**: `POST /api/import/sales/validate`

**Request**:
```json
{
  "salesRows": [...],
  "distributorId": "uuid",
  "fileHash": "abc123",
  "brandId": "uuid"
}
```

**Validation Rules**:
1. **Sales Date**: Must be valid date format
2. **SKU**: Must exist in products catalog for brand and be active
3. **Retailer**: Required, not empty
4. **Territory**: Required, not empty
5. **Units Sold**: Required, >= 0
6. **Net Revenue**: Required, >= 0
7. **Gross Revenue Local**: If provided, >= 0
8. **Marketing Spend**: If provided, >= 0
9. **Sales Channel**: If provided, must be in allowed list
10. **Distributor**: Must exist, belong to brand, and be active
11. **Distributor Access**: Distributor admins can only import for their own distributor

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "validSalesRows": [...],
    "invalidSalesRows": []
  }
}
```

**Error Format**:
```json
{
  "row": 5,
  "field": "sku",
  "message": "SKU 'PROD-999' does not exist in your products catalog",
  "code": "SKU_NOT_FOUND",
  "value": "PROD-999"
}
```

### 4. Confirm/Import Endpoint: `app/api/import/sales/confirm/route.ts`

**Endpoint**: `POST /api/import/sales/confirm`

**Request**:
```json
{
  "salesRows": [...],
  "distributorId": "uuid",
  "fileHash": "abc123",
  "fileName": "sales_november.xlsx",
  "brandId": "uuid"
}
```

**Process**:
1. Authenticate user and validate access
2. Create import log entry with status = "processing"
3. Process sales rows in batches of 50
4. Transform to database format (map fields, add timestamps)
5. Insert into `sales_data` table
6. Track successes and failures
7. Update import log with final status and error details

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "successful": 148,
    "failed": 2,
    "importLogId": "uuid",
    "errors": [
      {
        "row": 25,
        "message": "Database constraint violation",
        "code": "INSERT_ERROR"
      }
    ]
  }
}
```

**Import Log Fields**:
- `user_id`, `brand_id`, `distributor_id`
- `import_type` = "sales"
- `file_name`, `file_hash`
- `total_rows`, `successful_rows`, `failed_rows`
- `status`: "processing" → "completed" / "partial" / "failed"
- `error_details`: Array of ValidationError objects

---

## Frontend Implementation

### Hook: `hooks/use-import-sales.ts`

Manages the import lifecycle state machine:

**States**:
- `upload` → `confirm` → `validate` → `validated` → `importing` → `completed`

**Key Functions**:
- `uploadFile(file)` - Uploads and parses Excel file
- `validateSalesRows(distributorId)` - Validates parsed data
- `confirmImport(distributorId)` - Executes final import
- `reset()` - Resets state for new import
- `downloadErrorReport()` - Downloads error report (future)

**State Management**:
```typescript
{
  step: ImportStep,
  loading: boolean,
  error: string | null,
  salesRows: ParsedSalesRow[],
  validationResults: ValidationResult | null,
  importSummary: ImportSummary | null,
  fileHash: string | null,
  fileName: string | null,
  brandId: string | null
}
```

### UI Components (Reused from Orders Import)

#### ImportTypeTabs
- Updated to include "Sales Import" tab
- Grid layout with 2 columns for Orders and Sales
- Tab content dynamically switches based on `activeTab`

#### Import Page: `app/import/page.tsx`

**Dual Import Support**:
- Manages both `useImportOrders()` and `useImportSales()` hooks
- Computes active step, loading, error based on `activeTab`
- Routes file uploads, validation, and confirmations to correct hook
- Auto-selects distributor for distributor admins
- Shows distributor confirmation dialog for brand admins

**Shared Components**:
- `InstructionsBanner` - Shows field requirements and download template button
- `FileUploader` - Drag-and-drop + file picker
- `DistributorConfirmationDialog` - Select/confirm distributor before validation
- `ValidationResultsPanel` - Shows validation errors with row/field details
- `ImportProgressDialog` - Loading spinner during parse/validate/import
- Results cards - Success/partial/failure summary with error details

**Role-Based Behavior**:
- **Super Admin**: Can select any brand and distributor (requires manual selection)
- **Brand Admin**: Can select any distributor within their brand
- **Distributor Admin**: Auto-selected to their distributor, cannot change

---

## Data Flow

### End-to-End Import Flow

```
1. User clicks "Download Template" 
   → GET /api/import/template?type=sales
   → Receives branded Excel template

2. User fills template with sales data

3. User uploads file via FileUploader
   → POST /api/import/sales (FormData)
   → parseSalesExcel() extracts data
   → Returns ParsedSalesRow[] + metadata
   → State: step = "confirm"

4a. Brand Admin: Select distributor from dropdown
    → DistributorConfirmationDialog shown
    → User confirms distributor selection

4b. Distributor Admin: Auto-confirm distributor
    → Automatically uses profile.distributor_id
    → Skips dialog

5. Validation triggered
   → POST /api/import/sales/validate
   → Validates SKUs, dates, numbers, business rules
   → Returns ValidationResult
   → State: step = "validated"

6. User reviews validation results
   → If errors: Fix Excel and re-upload
   → If valid: Click "Proceed with Import"

7. Import execution
   → POST /api/import/sales/confirm
   → Batch inserts into sales_data table
   → Creates import_logs entry
   → Returns ImportSummary
   → State: step = "completed"

8. User sees results
   → Success: "150 sales records imported!"
   → Partial: "148 of 150 records imported (2 failed)"
   → Failure: "Import failed: 0 of 150 records imported"
   → Can view error details table
```

---

## Security & Access Control

### Authentication & Authorization

1. **User Authentication**: All endpoints require valid Supabase auth session
2. **Profile Verification**: User must have a valid `user_profiles` entry with `brand_id`
3. **Distributor Access**:
   - Distributor admins: Can only import for `profile.distributor_id`
   - Brand admins: Can import for any distributor within their brand
   - Super admins: Can import for any brand/distributor (if implemented)

### RLS Policies (Database Level)

From `027_ensure_brand_distributor_visibility.sql`:

```sql
-- Brand admins: See sales data for their brand
brand_id IN (
  SELECT brand_id FROM user_profiles 
  WHERE user_id = auth.uid()
  AND distributor_id IS NULL
)

-- Distributor admins: Only see their distributor's data
distributor_id IN (
  SELECT distributor_id FROM user_profiles 
  WHERE user_id = auth.uid() 
  AND distributor_id IS NOT NULL
)
```

### Validation Checks

- **File Type**: Only .xlsx and .xls allowed
- **File Size**: Maximum 10MB
- **Row Limit**: Maximum 5000 rows per import (enforced at validation)
- **Single Distributor Rule**: All rows must have same distributor_id
- **SKU Validation**: Products must exist and be active in brand's catalog
- **Numeric Validation**: Units and revenue must be non-negative

---

## Testing Guide

### Manual Testing Checklist

#### Setup
- [ ] Run migration `038_add_sales_data_import_fields.sql`
- [ ] Verify new columns exist in `sales_data` table
- [ ] Verify indexes created
- [ ] Verify trigger `populate_reporting_month` exists

#### Template Download
- [ ] As Brand Admin: Download sales template → verify brand_id in URL
- [ ] As Distributor Admin: Download template → verify distributor_id pre-filled
- [ ] Open template → verify Instructions sheet present
- [ ] Verify required fields have dark green headers
- [ ] Verify optional fields have light green headers
- [ ] Verify sample data row included

#### Upload & Parse
- [ ] Upload valid Excel file → parse succeeds
- [ ] Upload file with missing required columns → error message shown
- [ ] Upload non-Excel file → rejected with error
- [ ] Upload file > 10MB → rejected with error
- [ ] Upload file with multiple distributor IDs → error message shown

#### Validation
- [ ] Valid data → all rows pass validation
- [ ] Invalid SKU → validation error on correct row
- [ ] Negative units/revenue → validation error
- [ ] Invalid sales channel → validation error
- [ ] Missing required field → validation error per row
- [ ] Distributor admin importing for wrong distributor → access denied

#### Import
- [ ] Valid data import → all rows inserted successfully
- [ ] Check `sales_data` table → verify rows present
- [ ] Verify `reporting_month` auto-populated from `sales_date`
- [ ] Verify `import_timestamp` set
- [ ] Check `import_logs` table → verify log entry created
- [ ] Partial failure → some rows succeed, some fail, errors logged

#### Role-Based Access
- [ ] Brand Admin: Can select any distributor in their brand
- [ ] Distributor Admin: Auto-selected to their distributor, cannot change
- [ ] Distributor Admin: Cannot import for other distributors
- [ ] Super Admin: Can view all imports (if implemented)

#### Error Handling
- [ ] Network timeout → graceful error message
- [ ] Invalid JSON response → error handled
- [ ] Database constraint violation → error logged and shown
- [ ] User cancels during processing → state resets correctly

### Automated Testing (Future)

```typescript
// Example unit tests for sales-parser.ts
describe("parseSalesExcel", () => {
  test("parses valid Excel file", async () => {
    const result = await parseSalesExcel(validBuffer);
    expect(result.salesRows).toHaveLength(10);
    expect(result.distributorIdConsistent).toBe(true);
  });

  test("normalizes sales_date to reporting_month", async () => {
    const result = await parseSalesExcel(bufferWithDates);
    expect(result.salesRows[0].reporting_month).toBe("2025-11-01");
  });

  test("throws on multiple distributor IDs", async () => {
    await expect(parseSalesExcel(multiDistBuffer)).rejects.toThrow("Multiple distributor IDs");
  });
});
```

---

## Integration with Dashboards

### Sales Data Queries

Dashboards should query `sales_data` table and leverage new fields:

```sql
-- Monthly sales aggregation
SELECT 
  reporting_month,
  SUM(total_sales) as net_revenue,
  SUM(units_sold) as total_units,
  SUM(gross_revenue_local) as gross_revenue,
  SUM(marketing_spend) as marketing_spend,
  COUNT(*) as transaction_count
FROM sales_data
WHERE brand_id = $1
  AND distributor_id = $2
  AND reporting_month BETWEEN $3 AND $4
GROUP BY reporting_month
ORDER BY reporting_month;
```

```sql
-- Sales by channel
SELECT 
  sales_channel,
  SUM(total_sales) as revenue,
  SUM(units_sold) as units
FROM sales_data
WHERE brand_id = $1
  AND reporting_month = $2
GROUP BY sales_channel;
```

```sql
-- Top retailers by territory
SELECT 
  territory_country,
  retailer_name,
  SUM(total_sales) as revenue,
  SUM(units_sold) as units
FROM sales_data
WHERE brand_id = $1
  AND reporting_month = $2
GROUP BY territory_country, retailer_name
ORDER BY revenue DESC
LIMIT 10;
```

### Updating Existing Hooks

If there's a `use-sales-data` hook, update queries to:
- Use `reporting_month` for time-based grouping
- Filter by `sales_channel` for channel analysis
- Join with `products` on SKU for product details
- Respect RLS policies (automatically enforced)

### Dashboard Components

Sales dashboards should:
- Display monthly trends using `reporting_month`
- Break down sales by `sales_channel`
- Show territory performance using `territory` and `territory_country`
- Compare `total_sales` vs `target_revenue` when available
- Track `marketing_spend` ROI
- Show import history via `import_timestamp`

---

## Future Enhancements

### Phase 2 Improvements

1. **Background Processing**
   - Offload large imports to background jobs (>1000 rows)
   - Real-time progress updates via WebSocket/Server-Sent Events
   - Email notification on completion

2. **Advanced Validation**
   - Retailer master data lookup and standardization
   - Territory mapping table for consistent naming
   - Duplicate detection (same SKU + retailer + month)
   - Cross-month anomaly detection

3. **Error Reporting**
   - Generate downloadable error report Excel file
   - Highlight errors in original file format
   - Suggest corrections based on common patterns

4. **Data Enrichment**
   - Auto-fill product names from SKU lookup
   - Currency conversion to base currency (USD)
   - Geo-coding territories to lat/long for maps

5. **Performance Optimization**
   - Materialized views for monthly aggregations
   - Partitioning `sales_data` by `reporting_month`
   - Incremental refresh strategy for dashboards

6. **Bulk Operations**
   - Multi-file upload (multiple months at once)
   - Scheduled imports via SFTP/API
   - Automated retry for failed rows

7. **Audit & Compliance**
   - Track all field changes (before/after)
   - Data lineage tracking (source file → sales_data row)
   - Compliance reporting for data freshness

### Scalability Considerations

- **Large Monthly Uploads**: Current batch size = 50 rows. For files with 10,000+ rows, consider:
  - Streaming inserts with progress updates
  - Parallel batch processing
  - Chunked file upload for files > 10MB

- **Dashboard Performance**: For brands with millions of sales records:
  - Aggregate tables (`sales_data_monthly_summary`)
  - Caching layer (Redis) for common queries
  - Pre-computed metrics updated on import

---

## Files Reference

### Database Migrations
- `supabase_migrations/038_add_sales_data_import_fields.sql`

### Backend
- `lib/excel/sales-template-config.ts` - Field definitions and template config
- `lib/excel/sales-template-generator.ts` - Excel template generator
- `lib/excel/sales-parser.ts` - ExcelJS parser for sales data
- `app/api/import/sales/route.ts` - Upload/parse endpoint
- `app/api/import/sales/validate/route.ts` - Validation endpoint
- `app/api/import/sales/confirm/route.ts` - Import execution endpoint
- `app/api/import/template/route.ts` - Updated to support sales templates

### Frontend
- `hooks/use-import-sales.ts` - Sales import state management hook
- `app/import/page.tsx` - Updated to support both orders and sales tabs
- `components/import/ImportTypeTabs.tsx` - Updated with Sales tab

### Types
- `types/import.ts` - Updated with `ParsedSalesRow` and sales-related types

---

## Troubleshooting

### Common Issues

**Issue**: "Multiple distributor IDs found in sheet"
- **Solution**: Ensure all rows have the same `Distributor ID` or leave blank for auto-fill

**Issue**: "SKU does not exist in your products catalog"
- **Solution**: Verify SKU spelling matches products table, ensure product is active

**Issue**: "Import failed: None of the records could be imported"
- **Solution**: Check import logs table for detailed error, verify database constraints

**Issue**: Reporting month not auto-populating
- **Solution**: Verify trigger `populate_reporting_month` exists and is enabled

**Issue**: Distributor admin cannot import
- **Solution**: Verify user has `distributor_id` set in `user_profiles` table

---

## Changelog

### Version 1.0 (November 22, 2025)
- ✅ Initial implementation complete
- ✅ Database migration for new fields
- ✅ ExcelJS parser and template generator
- ✅ API endpoints for upload, validate, confirm
- ✅ Frontend hook and UI integration
- ✅ Role-based access control
- ✅ Batch processing (50 rows per batch)
- ✅ Comprehensive error handling
- ✅ Import logging

---

## Support

For questions or issues:
1. Check this documentation first
2. Review import logs table for error details
3. Check browser console for frontend errors
4. Check server logs for backend errors
5. Contact the development team with:
   - Import log ID
   - File hash
   - Error messages
   - Steps to reproduce

---

**Last Updated:** November 22, 2025  
**Version:** 1.0  
**Maintainers:** GrowShip MVP Team

