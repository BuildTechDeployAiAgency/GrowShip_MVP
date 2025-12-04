# Geographic Reporting Framework Implementation

**Date:** 2025-12-08  
**Status:** Implemented  
**Scope:** MVP + Phase 2

## Executive Summary

This document details the implementation of a scalable Country–Region–Territory reporting framework for the GrowShip MVP. The framework establishes a single source of truth for geographic data that flows consistently across customers, orders, distributors, and sales imports.

## Problem Statement

Prior to this implementation:

- Geographic data was stored as free-text fields (`territory`, `territory_country`)
- No normalization or validation of geographic values
- Inconsistent territory naming across different data entry points
- No hierarchical structure (Region → Territory → Country)
- Limited ability to aggregate sales by standardized regions

## Solution Architecture

### Data Model

```
┌─────────────┐
│   regions   │ (GCC, Europe, APAC, etc.)
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐
│ territories │ (UAE, KSA, UK, etc.)
└──────┬──────┘
       │ N:1        N:1
       ▼            ▼
┌─────────────┐  ┌─────────────┐
│distributors │  │   orders    │
└──────┬──────┘  └──────┬──────┘
       │                │
       └────────┬───────┘
                ▼
         ┌─────────────┐
         │ sales_data  │
         └─────────────┘
```

### Key Design Decisions

1. **Regions are Reference Data:** Regions are system-defined and cannot be modified by users. They represent the highest level of geographic aggregation.

2. **Territories are Configurable:** Territories can be global (shared by all brands) or brand-specific. Each territory maps to one or more ISO country codes.

3. **Denormalized region_id:** Both territories and related entities store `region_id` directly for query performance, even though it could be derived from `territory_id`.

4. **Backward Compatibility:** Existing text fields are preserved and continue to be populated alongside the new FK fields.

5. **Auto-Assignment:** Triggers automatically assign territory based on country, reducing manual data entry burden.

## Database Schema

### Regions Table

```sql
CREATE TABLE regions (
  id UUID PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,  -- 'GCC', 'EUR', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);
```

### Territories Table

```sql
CREATE TABLE territories (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,  -- 'UAE', 'KSA', etc.
  name VARCHAR(100) NOT NULL,
  region_id UUID REFERENCES regions(id),
  countries TEXT[] NOT NULL,         -- ['AE', 'SA', ...]
  brand_id UUID REFERENCES brands(id), -- NULL = global
  is_active BOOLEAN DEFAULT TRUE
);
```

### Column Additions

| Table          | New Columns                 |
| -------------- | --------------------------- |
| `distributors` | `territory_id`, `region_id` |
| `orders`       | `territory_id`, `region_id` |
| `sales_data`   | `territory_id`, `region_id` |

## Territory Lookup Logic

The `find_territory_by_country()` function implements the following priority:

1. **Brand-specific territory:** If a territory exists that contains the country AND matches the brand_id, use it
2. **Global territory:** If no brand-specific match, use a global territory (brand_id IS NULL)
3. **NULL:** If no matching territory found

This allows brands to define custom territories while falling back to system defaults.

## Auto-Assignment Triggers

### Distributor Trigger

```sql
BEFORE INSERT OR UPDATE ON distributors
FOR EACH ROW
EXECUTE FUNCTION auto_assign_distributor_territory()
```

When a distributor is created/updated with a country but no territory_id:

- Look up territory by country code
- Assign territory_id
- Derive region_id from territory

### Order Trigger

```sql
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION auto_assign_order_territory()
```

Priority for orders:

1. Inherit from distributor (if distributor_id is set)
2. Derive from shipping_country
3. Leave NULL if no match found

## Analytics Integration

### Updated RPC Functions

**`get_sales_by_territory`** - Now returns:

- `territory` (text)
- `territory_id` (UUID)
- `region_name` (text)
- `region_id` (UUID)
- Revenue and growth metrics

**`get_sales_by_region`** - New function:

- Aggregates at region level
- Returns territory and country counts per region

**`get_territory_details`** - Admin function:

- Returns all territories with metrics
- Used for territory management UI

## Seeded Data

### Regions (9 total)

| Code   | Name                       |
| ------ | -------------------------- |
| GCC    | Gulf Cooperation Council   |
| LEVANT | Levant                     |
| MENA   | Middle East & North Africa |
| EUR    | Europe                     |
| NAM    | North America              |
| APAC   | Asia Pacific               |
| LATAM  | Latin America              |
| AFR    | Africa                     |
| OTHER  | Other                      |

### Territories (30+ total)

Covers major markets including:

- GCC: UAE, Saudi Arabia, Kuwait, Qatar, Bahrain, Oman
- Levant: Jordan, Lebanon, Iraq
- Europe: UK, Germany, France, Benelux, Nordics, Southern EU
- Americas: USA, Canada
- APAC: ANZ, China, Japan, Southeast Asia, India

## Import Considerations

### Sales Import

The `ParsedSalesRow` type now includes:

- `territory_id?: string`
- `region_id?: string`

During import processing:

1. Read territory/country from Excel
2. Look up territory_id using `find_territory_by_country()`
3. Include territory_id in the insert

### Validation

Future enhancement: Warn if imported row has no territory match, requiring manual classification.

## Testing Checklist

- [ ] Create distributor with country → territory auto-assigned
- [ ] Create order with distributor → inherits territory
- [ ] Create order with shipping_country → derives territory
- [ ] Import sales data → territory_id populated
- [ ] Dashboard "Sales by Territory" shows normalized data
- [ ] Dashboard "Sales by Region" aggregates correctly
- [ ] RPC functions return expected fields

## UI Implementation

### Country Selection

The country field has been updated from a free-text input to a searchable dropdown with ISO 3166-1 alpha-2 codes. This ensures consistent territory assignment.

**Component:** `components/ui/country-select.tsx`

Countries are grouped by region for easier selection:

- GCC (UAE, Saudi Arabia, Kuwait, Qatar, Bahrain, Oman)
- Levant (Jordan, Lebanon, Iraq, Syria, Palestine)
- MENA (Egypt, Morocco, Tunisia, Algeria, etc.)
- Europe (UK, Germany, France, Italy, Spain, etc.)
- North America (US, Canada, Mexico)
- Asia Pacific (China, Japan, India, Australia, etc.)
- And more...

### Territory Selection

An optional territory override dropdown has been added to the Distributor form.

**Component:** `components/ui/territory-select.tsx`

Features:

- Groups territories by region
- "Auto-assign from country" option (default)
- Shows territory code alongside name
- Loads territories from the database via `useTerritories` hook

### Forms Updated

1. **Distributor Form** (`components/distributors/distributor-form-dialog.tsx`)

   - Country: Searchable dropdown with ISO codes
   - Territory: Optional override dropdown

2. **Invite Distributor Dialog** (`components/users/invite-distributor-dialog.tsx`)
   - Country: Searchable dropdown with ISO codes

### Territory Admin Page (Super Admin Only)

A new territory management page has been created for Super Admins.

**Location:** `/super-admin/territories`

**Features:**

- View all regions and territories
- Add/Edit/Delete custom territories
- Assign countries to territories
- View metrics (distributors, orders, revenue) per territory
- Filter by region
- Search territories
- List view and grouped-by-region view

**Component:** `components/super-admin/territory-management.tsx`

## Future Enhancements

1. ~~**Territory Admin UI**~~ ✅ Implemented

   - ~~CRUD for custom territories~~
   - ~~Country assignment interface~~
   - ~~Deactivate/archive territories~~

2. **Import Validation**

   - Warn on unmapped territories
   - Suggest closest matches
   - Bulk territory assignment

3. **Forecasting Integration**

   - Include territory in demand models
   - Territory-specific seasonality

4. **Drill-Down Charts**
   - Region → Territory → Country hierarchy
   - Interactive geographic visualizations

## Migration Notes

### Running the Migration

1. Execute `20251208_geographic_reporting_framework.sql`
2. Execute `20251208_update_territory_analytics.sql`
3. Verify with provided queries

### Rollback (if needed)

```sql
-- Remove columns
ALTER TABLE distributors DROP COLUMN IF EXISTS territory_id, DROP COLUMN IF EXISTS region_id;
ALTER TABLE orders DROP COLUMN IF EXISTS territory_id, DROP COLUMN IF EXISTS region_id;
ALTER TABLE sales_data DROP COLUMN IF EXISTS territory_id, DROP COLUMN IF EXISTS region_id;

-- Drop tables
DROP TABLE IF EXISTS territories;
DROP TABLE IF EXISTS regions;

-- Drop functions
DROP FUNCTION IF EXISTS find_territory_by_country;
DROP FUNCTION IF EXISTS get_region_for_territory;
DROP FUNCTION IF EXISTS auto_assign_distributor_territory;
DROP FUNCTION IF EXISTS auto_assign_order_territory;
```

## Conclusion

This geographic reporting framework provides a solid foundation for current analytics needs while supporting future expansion into more sophisticated geographic analysis and forecasting.
