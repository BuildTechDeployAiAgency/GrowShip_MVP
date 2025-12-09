# Forecasting Schema Enhancements

**Date:** 2025-12-09  
**Author:** GrowShip MVP Team  
**Migration File:** `supabase_migrations/20251209_forecasting_schema_enhancements.sql`

---

## Executive Summary

This document describes the schema and API enhancements implemented to support robust **3-6 month demand forecasting** and **inventory optimization** as specified in the SOW requirements.

---

## Problem Statement

### Gap 1: Forecast Source Data (Critical)

The existing `forecast_inputs` view and forecast generation API only pulled data from the `orders` table. This completely **ignored distributor sales uploads** stored in `sales_data`, resulting in inaccurate forecasts for brands using external distribution channels.

### Gap 2: Inventory Optimization

No dynamic recommendation engine existed. Users could see forecasts but received no actionable "Buy X quantity by Y date" advice based on forecast + current stock + lead time.

### Gap 3: Missing Logistics Parameters

The `products` table lacked `lead_time_days` (supplier lead time) and `safety_stock_days` (buffer stock target), making accurate reorder point calculations impossible.

---

## Solution Implemented

### 1. Refactored `forecast_inputs` View

**Before:** Aggregated from `orders.items` JSONB (only system orders)  
**After:** Aggregates from `sales_data` table which includes:

- System orders (auto-synced via trigger)
- Distributor uploads (manual CSV imports)

**Key Columns:**
| Column | Description |
|--------|-------------|
| `brand_id` | Brand reference |
| `sku` | Product SKU |
| `sales_month` | Reporting month (DATE) |
| `quantity_sold` | Total units sold |
| `revenue` | Total sales value |
| `avg_unit_price` | Calculated average price |
| `pending_inbound_quantity` | Incoming PO quantities |
| `sales_channel` | Channel segmentation |
| `system_order_count` | Count from system orders |
| `external_upload_count` | Count from distributor uploads |

---

### 2. Enhanced `products` Table

Added logistics parameters essential for inventory optimization:

| Column              | Type    | Default | Description                            |
| ------------------- | ------- | ------- | -------------------------------------- |
| `lead_time_days`    | INTEGER | 14      | Days from PO creation to stock receipt |
| `safety_stock_days` | INTEGER | 7       | Buffer stock as days of supply         |

---

### 3. New `supply_plans` Table

Stores actionable reorder recommendations based on forecasts.

**Key Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `forecast_id` | UUID | Reference to demand_forecasts |
| `sku` | VARCHAR(100) | Product SKU |
| `suggested_reorder_date` | DATE | Recommended order date |
| `suggested_reorder_quantity` | NUMERIC | Recommended quantity |
| `reasoning` | TEXT | Explanation (e.g., "Below safety stock in Nov") |
| `status` | VARCHAR | Workflow: draft -> approved -> converted_to_po |
| `priority` | VARCHAR | critical, high, normal, low |
| `purchase_order_id` | UUID | Linked PO after conversion |

**Workflow States:**

- `draft` - Initial recommendation
- `reviewed` - Reviewed by planner
- `approved` - Approved for ordering
- `converted_to_po` - PO created
- `cancelled` - No longer needed

---

### 4. New `inventory_optimization_metrics` View

Real-time view combining stock, demand, and supply data to calculate reorder triggers.

**Key Calculated Fields:**

| Field                      | Formula/Description                      |
| -------------------------- | ---------------------------------------- |
| `available_stock`          | `quantity_in_stock - allocated_stock`    |
| `projected_stock`          | `current_stock + incoming_stock`         |
| `avg_daily_demand`         | 90-day average from sales_data           |
| `calculated_safety_stock`  | `avg_daily_demand * safety_stock_days`   |
| `demand_during_lead_time`  | `avg_daily_demand * lead_time_days`      |
| `calculated_reorder_point` | `demand_during_lead_time + safety_stock` |
| `days_of_stock`            | `available_stock / avg_daily_demand`     |
| `estimated_stockout_date`  | Current date + days_of_stock             |
| `reorder_status`           | Classification (see below)               |
| `suggested_order_quantity` | EOQ-based recommendation                 |

**Reorder Status Classifications:**
| Status | Condition |
|--------|-----------|
| `CRITICAL_OUT_OF_STOCK` | Stock = 0 |
| `URGENT_BELOW_SAFETY` | Stock < safety stock |
| `REORDER_NOW` | Stock <= reorder point |
| `PLAN_REORDER` | Will hit reorder point within lead time |
| `OK` | Stock is healthy |

---

### 5. Helper Function: `generate_supply_plan_recommendations`

```sql
SELECT * FROM generate_supply_plan_recommendations(
  'brand-uuid'::UUID,  -- p_brand_id (required)
  'SKU-001',           -- p_sku (optional, filter)
  FALSE                -- p_include_ok_status (default: exclude healthy items)
);
```

Returns actionable recommendations sorted by urgency.

---

### 6. Updated Forecast API

**File:** `app/api/forecasting/generate/route.ts`

**Change:** Now queries `sales_data` instead of `orders.items`

**Before:**

```typescript
const { data: orders } = await supabase
  .from("orders")
  .select("order_date, items")
  ...
```

**After:**

```typescript
const { data: salesData } = await supabase
  .from("sales_data")
  .select("sku, sales_date, reporting_month, quantity_sold, total_sales, sales_channel")
  ...
```

---

## Entity Relationship Diagram

```
                    ┌──────────────────┐
                    │     brands       │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    products     │ │   sales_data    │ │ demand_forecasts│
│                 │ │                 │ │                 │
│ + lead_time_days│ │ (source for     │ │ (predictions)   │
│ + safety_stock  │ │  forecasting)   │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         │                   ▼                   │
         │          ┌─────────────────┐          │
         │          │ forecast_inputs │          │
         │          │     (VIEW)      │          │
         │          └─────────────────┘          │
         │                                       │
         ▼                                       ▼
┌─────────────────────────────┐         ┌─────────────────┐
│ inventory_optimization_     │◄────────│  supply_plans   │
│ metrics (VIEW)              │         │ (recommendations│
└─────────────────────────────┘         │  from forecasts)│
                                        └─────────────────┘
```

---

## Testing Verification Queries

```sql
-- 1. Verify forecast_inputs includes both order and upload data
SELECT
  sku,
  sales_month,
  quantity_sold,
  system_order_count,
  external_upload_count
FROM forecast_inputs
WHERE brand_id = 'your-brand-id'
LIMIT 10;

-- 2. Check products have logistics fields
SELECT sku, lead_time_days, safety_stock_days
FROM products
WHERE brand_id = 'your-brand-id';

-- 3. Test inventory optimization view
SELECT
  sku,
  current_stock,
  avg_daily_demand,
  days_of_stock,
  reorder_status
FROM inventory_optimization_metrics
WHERE brand_id = 'your-brand-id';

-- 4. Generate supply recommendations
SELECT * FROM generate_supply_plan_recommendations('your-brand-id'::UUID);
```

---

## Future Considerations (ExcelJS Bulk Import)

When implementing the bulk order import feature using ExcelJS:

1. **Territory Mapping:** Ensure imported data populates `territory_country` for geographic reporting
2. **Deduplication:** The `order_line_id` unique constraint on `sales_data` prevents duplicates
3. **Batch Processing:** The sync trigger on `orders` automatically populates `sales_data`
4. **Forecast Refresh:** After bulk imports, consider auto-triggering forecast regeneration

---

## Files Changed

| File                                                               | Change                                             |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| `supabase_migrations/20251209_forecasting_schema_enhancements.sql` | New migration with all schema changes              |
| `app/api/forecasting/generate/route.ts`                            | Updated to source from `sales_data`                |
| `types/products.ts`                                                | Added `lead_time_days`, `safety_stock_days` fields |
| `types/inventory.ts`                                               | Added supply planning and optimization types       |
| `Feature Reviews/Forecasting and Supply Planning Documentation.md` | Comprehensive feature documentation                |
| `Feature Reviews/Inventory Module implementation doc.md`           | Updated to reflect completed forecasting           |
| `ChangeLogs/2025-12-09_forecasting_schema_enhancements.md`         | Changelog entry                                    |

---

## Related Documentation

- **Full Feature Documentation:** `Feature Reviews/Forecasting and Supply Planning Documentation.md`
- **Inventory Module:** `Feature Reviews/Inventory Module implementation doc.md`

---

## Deployment Notes

1. Run the migration in Supabase SQL Editor
2. Verify tables and views created successfully
3. Test forecast generation with existing data
4. Backfill `lead_time_days` and `safety_stock_days` for existing products if known
5. Restart the application to pick up API changes
