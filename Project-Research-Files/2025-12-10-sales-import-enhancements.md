# Sales Import Enhancements

**Date:** 2025-12-10  
**Author:** GrowShip MVP Team  
**Status:** Implementation Complete

---

## Overview

This document describes the enhancements made to the distributor sales report import functionality to improve data quality, performance, and user experience.

---

## Changes Implemented

### 1. Duplicate Import Prevention

**File:** `app/api/import/sales/confirm/route.ts`

Added check to prevent importing the same file multiple times:

- Checks `import_logs` table for existing imports with matching `file_hash`, `brand_id`, and `distributor_id`
- Only blocks imports with status `completed` or `partial`
- Returns error with details about the existing import if duplicate detected

**Impact:** Prevents duplicate data from being imported, maintaining data integrity.

---

### 2. CSV File Support

**Files Modified:**

- `app/api/import/sales/route.ts` - Updated to accept CSV MIME types and file extensions
- `lib/excel/sales-parser.ts` - Added `parseSalesCSV()` function

**Supported File Types:**

- Excel: `.xlsx`, `.xls`
- CSV: `.csv`

**CSV Parser Features:**

- Handles quoted fields with embedded commas
- Handles escaped quotes (`""`)
- Same field mapping as Excel parser
- Same validation and normalization logic

**Impact:** Distributors can now upload CSV files in addition to Excel, providing more flexibility.

---

### 3. Retailer Reference Table

**Migration:** `supabase_migrations/20251210_create_retailers_table.sql`

**New Table: `retailers`**

| Column          | Type         | Description                 |
| --------------- | ------------ | --------------------------- |
| `id`            | UUID         | Primary key                 |
| `brand_id`      | UUID         | Brand reference (required)  |
| `retailer_code` | VARCHAR(50)  | Optional internal code      |
| `retailer_name` | VARCHAR(255) | Display name (required)     |
| `territory_id`  | UUID         | Territory assignment        |
| `region_id`     | UUID         | Region assignment           |
| `contact_email` | VARCHAR(255) | Contact email               |
| `contact_phone` | VARCHAR(50)  | Contact phone               |
| `address`       | TEXT         | Full address                |
| `city`          | VARCHAR(100) | City                        |
| `country`       | VARCHAR(100) | Country                     |
| `status`        | VARCHAR(20)  | active/inactive/suspended   |
| `notes`         | TEXT         | Additional notes            |
| `created_at`    | TIMESTAMPTZ  | Creation timestamp          |
| `updated_at`    | TIMESTAMPTZ  | Last update timestamp       |
| `created_by`    | UUID         | User who created the record |

**Unique Constraint:** `(brand_id, LOWER(retailer_name))` - Case-insensitive uniqueness per brand

**Helper Function:** `find_or_create_retailer(p_brand_id, p_retailer_name, p_created_by)`

- Looks up existing retailer by name (case-insensitive)
- Creates new retailer if not found
- Returns retailer UUID

**sales_data Enhancement:**

- Added `retailer_id` column with foreign key to `retailers` table
- Import process now auto-creates retailers and links them

**Impact:** Normalized retailer data enables better reporting, deduplication, and customer analytics.

---

### 4. Pre-computed Quarter/Year Columns

**Migration:** Same as above (`20251210_create_retailers_table.sql`)

**New Columns on `sales_data`:**

| Column              | Type    | Description                                   |
| ------------------- | ------- | --------------------------------------------- |
| `reporting_quarter` | INTEGER | Generated: `EXTRACT(QUARTER FROM sales_date)` |
| `reporting_year`    | INTEGER | Generated: `EXTRACT(YEAR FROM sales_date)`    |

**Indexes Created:**

- `idx_sales_data_reporting_quarter` - (year, quarter)
- `idx_sales_data_reporting_year` - (year)
- `idx_sales_data_brand_quarter` - (brand_id, year, quarter)

**Impact:** Improved query performance for quarterly and yearly reports. No manual calculation needed.

---

## API Changes

### POST /api/import/sales

**New Capabilities:**

- Accepts CSV files (`.csv`) in addition to Excel (`.xlsx`, `.xls`)
- File type auto-detected from extension and MIME type

**Request:** FormData with `file` field (Excel or CSV)

**Response:** Same as before

---

### POST /api/import/sales/confirm

**New Behavior:**

- Rejects duplicate file imports (same file hash + brand + distributor)
- Auto-creates retailers in `retailers` table
- Links sales data to retailer via `retailer_id`

**Error Response (Duplicate):**

```json
{
  "success": false,
  "error": "This file has already been imported",
  "existingImport": {
    "id": "uuid",
    "importedAt": "2025-12-10T...",
    "status": "completed"
  }
}
```

---

## Database Schema Changes

### New Table: `retailers`

```sql
CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  retailer_code VARCHAR(50),
  retailer_name VARCHAR(255) NOT NULL,
  territory_id UUID REFERENCES territories(id),
  region_id UUID REFERENCES regions(id),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
```

### sales_data Modifications

```sql
-- New columns
ALTER TABLE sales_data ADD COLUMN retailer_id UUID REFERENCES retailers(id);
ALTER TABLE sales_data ADD COLUMN reporting_quarter INTEGER GENERATED ALWAYS AS (EXTRACT(QUARTER FROM sales_date)::INTEGER) STORED;
ALTER TABLE sales_data ADD COLUMN reporting_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM sales_date)::INTEGER) STORED;
```

---

## Type Changes

**File:** `types/import.ts`

Added `retailer_id?: string` to `ParsedSalesRow` interface.

---

## RLS Policies

### retailers Table

- Brand admins can SELECT/INSERT/UPDATE retailers for their brand
- Super admins have full access

---

## Usage Examples

### Query Sales by Retailer

```sql
SELECT
  r.retailer_name,
  SUM(sd.total_sales) as revenue,
  SUM(sd.units_sold) as units
FROM sales_data sd
JOIN retailers r ON sd.retailer_id = r.id
WHERE sd.brand_id = 'your-brand-id'
GROUP BY r.retailer_name
ORDER BY revenue DESC;
```

### Query Sales by Quarter

```sql
SELECT
  reporting_year,
  reporting_quarter,
  SUM(total_sales) as revenue,
  SUM(units_sold) as units
FROM sales_data
WHERE brand_id = 'your-brand-id'
GROUP BY reporting_year, reporting_quarter
ORDER BY reporting_year, reporting_quarter;
```

### Find or Create Retailer

```sql
SELECT find_or_create_retailer(
  'brand-uuid'::UUID,
  'Walmart',
  'user-uuid'::UUID
);
```

---

## Migration Instructions

1. Apply the migration:

   ```bash
   # In Supabase SQL Editor or via CLI
   psql -f supabase_migrations/20251210_create_retailers_table.sql
   ```

2. The migration will:

   - Create `retailers` table with indexes and RLS policies
   - Add `retailer_id` column to `sales_data`
   - Add `reporting_quarter` and `reporting_year` generated columns
   - Create the `find_or_create_retailer` function

3. Existing sales data will have:
   - `retailer_id = NULL` (will be populated on future imports)
   - `reporting_quarter` and `reporting_year` auto-calculated from existing `sales_date`

---

## Testing Checklist

- [ ] Upload Excel file - should work as before
- [ ] Upload CSV file - should parse correctly
- [ ] Re-upload same file - should be rejected with duplicate error
- [ ] Check retailers table - new retailers auto-created during import
- [ ] Check sales_data - `retailer_id` populated for new imports
- [ ] Check sales_data - `reporting_quarter` and `reporting_year` populated automatically
- [ ] Query by quarter - should use indexes efficiently

---

## Future Enhancements

1. **Retailer Management UI** - Allow users to view/edit retailers
2. **Retailer Merge** - Deduplicate similar retailer names
3. **Retailer Territory Assignment** - Auto-assign territory based on import data
4. **CSV Template Download** - Provide downloadable CSV template in addition to Excel
