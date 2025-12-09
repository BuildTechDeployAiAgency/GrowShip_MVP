# Forecasting & Supply Planning Module Documentation

**Date:** December 9, 2025  
**Version:** 1.0  
**Status:** Complete - Ready for Production

---

## Table of Contents

1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [Architecture](#architecture)
4. [Data Sources](#data-sources)
5. [Forecasting Algorithms](#forecasting-algorithms)
6. [Inventory Optimization](#inventory-optimization)
7. [Supply Planning](#supply-planning)
8. [Database Schema](#database-schema)
9. [API Reference](#api-reference)
10. [User Guide](#user-guide)
11. [Testing & Validation](#testing--validation)
12. [Troubleshooting](#troubleshooting)
13. [Future Enhancements](#future-enhancements)

---

## Overview

The Forecasting & Supply Planning module provides **3-6 month demand forecasting** capabilities that combine historical sales data from multiple sources to generate accurate predictions. It includes inventory optimization insights and production planning inputs to help brands make informed purchasing decisions.

### Key Features

- **Multi-Source Forecasting**: Combines system orders AND distributor sales uploads
- **Multiple Algorithms**: Simple Moving Average, Exponential Smoothing, Trend Analysis
- **Inventory Optimization**: Real-time reorder point calculations with safety stock
- **Supply Planning**: Actionable reorder recommendations with workflow tracking
- **Confidence Scoring**: Each forecast includes a confidence level percentage
- **Algorithm Comparison**: Compare predictions across different algorithms

---

## Business Requirements

### SOW Requirements Addressed

| Requirement                  | Implementation                                                     |
| ---------------------------- | ------------------------------------------------------------------ |
| 3-6 month demand forecasting | Configurable forecast periods from 1-12 months                     |
| Sales data integration       | Sources from `sales_data` table (orders + distributor uploads)     |
| PO data integration          | Pending inbound stock from approved/ordered POs                    |
| Delivery data                | Shipment completion updates inventory for optimization             |
| Inventory optimization       | Real-time reorder points, safety stock, days-of-stock calculations |
| Production planning          | Supply plans with recommended order quantities and dates           |

### User Personas

1. **Brand Administrator/Manager**

   - Generate forecasts for product planning
   - Review supply plan recommendations
   - Convert supply plans to purchase orders

2. **Inventory Manager**

   - Monitor reorder status across all products
   - Configure lead times and safety stock levels
   - Adjust product logistics parameters

3. **Finance/Operations**
   - Analyze forecast accuracy
   - Export forecast data for reporting
   - Review cost projections for supply plans

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA SOURCES                                   │
├─────────────────────┬─────────────────────┬─────────────────────────────┤
│   System Orders     │  Distributor Uploads │  Purchase Orders            │
│   (orders table)    │  (CSV imports)       │  (inbound supply)           │
└──────────┬──────────┴──────────┬───────────┴──────────┬──────────────────┘
           │                     │                      │
           │   Auto-sync via     │   Manual upload      │
           │   trigger           │   via Import UI      │
           ▼                     ▼                      │
     ┌─────────────────────────────────────────┐        │
     │              sales_data                  │        │
     │  (Unified sales history table)          │        │
     └──────────────────┬──────────────────────┘        │
                        │                               │
                        ▼                               ▼
              ┌─────────────────────────────────────────────────┐
              │              forecast_inputs (VIEW)             │
              │  - Monthly aggregated sales by SKU              │
              │  - Product inventory snapshot                   │
              │  - Pending inbound quantities                   │
              │  - Channel/territory segmentation               │
              └──────────────────┬──────────────────────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│  FORECASTING    │   │  OPTIMIZATION   │   │  SUPPLY PLANNING        │
│  ENGINE         │   │  ENGINE         │   │                         │
│                 │   │                 │   │  supply_plans table     │
│  - SMA          │   │  - Reorder      │   │  - Recommendations      │
│  - Exponential  │   │    Points       │   │  - Workflow tracking    │
│  - Trend        │   │  - Safety Stock │   │  - PO conversion        │
│                 │   │  - Days of Stock│   │                         │
└────────┬────────┘   └────────┬────────┘   └────────┬────────────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────────────┐   ┌──────────────────┐
│demand_forecasts │   │inventory_optimization_  │   │ purchase_orders  │
│    (table)      │   │    metrics (VIEW)       │   │    (table)       │
└─────────────────┘   └─────────────────────────┘   └──────────────────┘
```

### Data Flow

1. **Sales Data Collection**

   - System orders automatically sync to `sales_data` when status changes to processing/shipped/delivered
   - Distributor uploads (CSV) insert directly into `sales_data`

2. **Forecast Generation**

   - User requests forecast via UI or API
   - Engine retrieves historical data from `sales_data` (up to 24 months)
   - Aggregates by SKU and month
   - Applies selected algorithm
   - Stores predictions in `demand_forecasts`

3. **Inventory Optimization**

   - Real-time view calculates reorder metrics
   - Combines current stock + incoming supply - forecasted demand
   - Classifies products by reorder urgency

4. **Supply Planning**
   - Generates recommendations from optimization metrics
   - Tracks workflow from draft → approved → converted to PO

---

## Data Sources

### Primary: sales_data Table

The `sales_data` table is the **single source of truth** for all forecasting. It contains:

| Source              | How Data Arrives                                                          | Identification         |
| ------------------- | ------------------------------------------------------------------------- | ---------------------- |
| System Orders       | Auto-synced via trigger when order status is processing/shipped/delivered | `order_id IS NOT NULL` |
| Distributor Uploads | Manual CSV import via Import UI                                           | `order_id IS NULL`     |

**Key Columns Used for Forecasting:**

| Column              | Type    | Description                     |
| ------------------- | ------- | ------------------------------- |
| `brand_id`          | UUID    | Brand context                   |
| `sku`               | VARCHAR | Product SKU                     |
| `sales_date`        | DATE    | Transaction date                |
| `reporting_month`   | DATE    | Normalized to first of month    |
| `quantity_sold`     | NUMERIC | Units sold                      |
| `total_sales`       | NUMERIC | Revenue amount                  |
| `sales_channel`     | TEXT    | retail, ecom, wholesale, direct |
| `territory_country` | TEXT    | Geographic region               |

### Secondary: products Table

Product master data with logistics parameters:

| Column              | Type    | Default | Description                 |
| ------------------- | ------- | ------- | --------------------------- |
| `quantity_in_stock` | INTEGER | 0       | Current on-hand stock       |
| `allocated_stock`   | INTEGER | 0       | Reserved for pending orders |
| `inbound_stock`     | INTEGER | 0       | Expected from approved POs  |
| `reorder_level`     | INTEGER | 0       | Manual reorder threshold    |
| `reorder_quantity`  | INTEGER | 0       | Standard order quantity     |
| `lead_time_days`    | INTEGER | 14      | Supplier lead time          |
| `safety_stock_days` | INTEGER | 7       | Buffer stock target         |

### Tertiary: purchase_orders & purchase_order_lines

Incoming supply data:

- Only `approved` and `ordered` status POs are considered
- Filters by `expected_delivery_date >= current date`
- Aggregates quantities by SKU for pending inbound calculations

---

## Forecasting Algorithms

### 1. Simple Moving Average (SMA)

**Best For:** Stable demand patterns, established products

**How It Works:**

- Takes the average of the last N periods of sales
- Default lookback: 6 months
- Weights all periods equally

**Formula:**

```
Forecast = (Sum of last N periods) / N × periods_ahead
```

**Confidence Level:** Based on coefficient of variation (CV)

- CV < 0.3 → High confidence (85%+)
- CV 0.3-0.7 → Medium confidence (60-85%)
- CV > 0.7 → Low confidence (<60%)

### 2. Exponential Smoothing

**Best For:** Products with recent trend changes, promotions

**How It Works:**

- Gives more weight to recent data points
- Alpha parameter: 0.3 (30% weight to recent, 70% to historical)
- Adapts faster to changes than SMA

**Formula:**

```
Smoothed = α × Current + (1-α) × Previous_Smoothed
Forecast = Smoothed × periods_ahead
```

**Confidence Level:** Based on prediction error variance

### 3. Trend Analysis (Linear Regression)

**Best For:** Growing/declining products, new product launches

**How It Works:**

- Fits a linear trend line to historical data
- Projects the trend forward
- Includes optional seasonality adjustment

**Formula:**

```
Forecast = slope × future_period_index + intercept
```

**Confidence Level:** Based on R-squared value

- R² > 0.8 → High confidence
- R² 0.5-0.8 → Medium confidence
- R² < 0.5 → Low confidence

### Algorithm Comparison Mode

Users can enable "Compare Algorithms" to see predictions from all three methods side-by-side. This helps identify which algorithm is most appropriate for each product's demand pattern.

---

## Inventory Optimization

### Core Concepts

#### 1. Safety Stock

Buffer inventory to protect against demand variability and supply delays.

**Calculation:**

```
Safety Stock = Average Daily Demand × Safety Stock Days
```

**Example:**

- Average daily demand: 10 units
- Safety stock days: 7
- Safety stock: 70 units

#### 2. Reorder Point

The inventory level at which a new order should be placed.

**Calculation:**

```
Reorder Point = Demand During Lead Time + Safety Stock
              = (Daily Demand × Lead Time Days) + Safety Stock
```

**Example:**

- Daily demand: 10 units
- Lead time: 14 days
- Safety stock: 70 units
- Reorder point: (10 × 14) + 70 = 210 units

#### 3. Days of Stock

How long current inventory will last at current consumption rate.

**Calculation:**

```
Days of Stock = Available Stock / Average Daily Demand
```

**Example:**

- Available stock: 300 units
- Daily demand: 10 units
- Days of stock: 30 days

### Reorder Status Classifications

| Status                  | Condition                               | Action Required      |
| ----------------------- | --------------------------------------- | -------------------- |
| `CRITICAL_OUT_OF_STOCK` | Stock = 0                               | Immediate reorder    |
| `URGENT_BELOW_SAFETY`   | Stock < Safety Stock                    | Order today          |
| `REORDER_NOW`           | Stock ≤ Reorder Point                   | Place order now      |
| `PLAN_REORDER`          | Will hit reorder point within lead time | Plan order this week |
| `OK`                    | Stock is healthy                        | Monitor normally     |

### Suggested Order Quantity

**Calculation:**

```
Suggested Qty = MAX(
  Reorder Quantity (product setting),
  Daily Demand × (Lead Time + Safety Days + 30 day buffer)
)
```

This ensures orders cover lead time, safety stock, and provide a 30-day buffer.

---

## Supply Planning

### Overview

Supply Plans are actionable recommendations generated from inventory optimization metrics. They guide purchasing decisions and can be converted directly to Purchase Orders.

### Workflow States

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌────────────────┐
│  draft  │ ──► │ reviewed │ ──► │ approved │ ──► │ converted_to_po│
└─────────┘     └──────────┘     └──────────┘     └────────────────┘
     │                                                    │
     │                                                    │
     └──────────────────────┐                            │
                           ▼                             │
                    ┌───────────┐                        │
                    │ cancelled │ ◄──────────────────────┘
                    └───────────┘
```

| Status            | Description                             |
| ----------------- | --------------------------------------- |
| `draft`           | Initial recommendation, auto-generated  |
| `reviewed`        | Planner has reviewed the recommendation |
| `approved`        | Approved for ordering                   |
| `converted_to_po` | PO has been created from this plan      |
| `cancelled`       | No longer needed                        |

### Priority Levels

| Priority   | Criteria                            |
| ---------- | ----------------------------------- |
| `critical` | Out of stock or stockout imminent   |
| `high`     | Below safety stock level            |
| `normal`   | At or below reorder point           |
| `low`      | Planning ahead, stock still healthy |

### Supply Plan Fields

| Field                        | Description                     |
| ---------------------------- | ------------------------------- |
| `suggested_reorder_date`     | When to place the order         |
| `suggested_reorder_quantity` | How much to order               |
| `current_stock_level`        | Stock at time of recommendation |
| `forecasted_demand`          | Predicted demand for period     |
| `incoming_supply`            | Pending inbound from POs        |
| `days_of_stock_remaining`    | Days until stockout             |
| `reasoning`                  | Human-readable explanation      |
| `estimated_cost`             | Projected order cost            |

---

## Database Schema

### Tables

#### demand_forecasts

Stores generated forecast predictions.

```sql
CREATE TABLE demand_forecasts (
  id UUID PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id),
  sku VARCHAR(100) NOT NULL,
  forecast_period_start DATE NOT NULL,
  forecast_period_end DATE NOT NULL,
  forecasted_quantity NUMERIC(10,2),
  forecasted_revenue NUMERIC(10,2),
  confidence_level NUMERIC(5,2),  -- 0-100%
  algorithm_version VARCHAR(50),
  input_data_snapshot JSONB,      -- Metadata about data used
  created_at TIMESTAMPTZ,
  created_by UUID
);

-- Unique constraint for upsert
UNIQUE (brand_id, sku, forecast_period_start, forecast_period_end)
```

#### supply_plans

Stores actionable reorder recommendations.

```sql
CREATE TABLE supply_plans (
  id UUID PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id),
  forecast_id UUID REFERENCES demand_forecasts(id),
  product_id UUID REFERENCES products(id),
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255),

  planning_period_start DATE NOT NULL,
  planning_period_end DATE NOT NULL,

  suggested_reorder_date DATE NOT NULL,
  suggested_reorder_quantity NUMERIC(10,2) NOT NULL,
  estimated_cost NUMERIC(14,2),
  currency VARCHAR(3) DEFAULT 'USD',

  current_stock_level NUMERIC(10,2),
  forecasted_demand NUMERIC(10,2),
  incoming_supply NUMERIC(10,2),
  days_of_stock_remaining NUMERIC(10,2),
  reasoning TEXT,

  status VARCHAR(20) DEFAULT 'draft',
  priority VARCHAR(10) DEFAULT 'normal',
  purchase_order_id UUID REFERENCES purchase_orders(id),

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ
);
```

### Views

#### forecast_inputs

Aggregated sales data for forecasting.

```sql
SELECT
  brand_id,
  sku,
  reporting_month AS sales_month,
  SUM(quantity_sold) AS quantity_sold,
  SUM(total_sales) AS revenue,
  COUNT(DISTINCT id) AS transaction_count,
  -- Average unit price
  SUM(total_sales) / NULLIF(SUM(quantity_sold), 0) AS avg_unit_price,
  -- Product snapshot
  p.quantity_in_stock,
  p.reorder_level,
  p.lead_time_days,
  p.safety_stock_days,
  -- Pending inbound
  (SELECT SUM(quantity) FROM purchase_order_lines...) AS pending_inbound_quantity,
  -- Data source tracking
  COUNT(DISTINCT order_id) FILTER (WHERE order_id IS NOT NULL) AS system_order_count,
  COUNT(DISTINCT id) FILTER (WHERE order_id IS NULL) AS external_upload_count
FROM sales_data
LEFT JOIN products ON ...
GROUP BY brand_id, sku, reporting_month, ...
```

#### inventory_optimization_metrics

Real-time optimization calculations.

```sql
SELECT
  product_id,
  sku,
  current_stock,
  available_stock,
  incoming_stock,

  -- Logistics parameters
  lead_time_days,
  safety_stock_days,

  -- Calculated metrics
  avg_daily_demand,
  calculated_safety_stock,
  demand_during_lead_time,
  calculated_reorder_point,
  days_of_stock,
  estimated_stockout_date,

  -- Decision support
  reorder_status,
  suggested_order_quantity
FROM products
LEFT JOIN (demand calculations)
LEFT JOIN (incoming supply calculations)
WHERE status = 'active'
```

### Functions

#### generate_supply_plan_recommendations

Returns actionable supply recommendations for a brand.

```sql
SELECT * FROM generate_supply_plan_recommendations(
  'brand-uuid'::UUID,  -- Required: brand_id
  'SKU-001',           -- Optional: filter to specific SKU
  FALSE                -- Optional: include OK status items
);
```

**Returns:**

| Column                   | Description                |
| ------------------------ | -------------------------- |
| sku                      | Product SKU                |
| product_name             | Product name               |
| current_stock            | Current stock level        |
| reorder_status           | Classification             |
| days_of_stock            | Days until stockout        |
| suggested_order_quantity | Recommended order qty      |
| suggested_reorder_date   | When to order              |
| reasoning                | Human-readable explanation |

---

## API Reference

### Forecast Generation

#### POST /api/forecasting/generate

Generate demand forecasts for products.

**Request Body:**

```json
{
  "brand_id": "uuid", // Required for super_admin, optional for others
  "sku": "SKU-001", // Optional: specific SKU, or all if omitted
  "forecast_period_start": "2025-01-01",
  "forecast_period_end": "2025-03-31",
  "algorithm_version": "simple_moving_average", // or "exponential_smoothing", "trend_analysis"
  "compare_algorithms": false // true to compare all algorithms
}
```

**Response:**

```json
{
  "forecasts": [
    {
      "id": "uuid",
      "brand_id": "uuid",
      "sku": "SKU-001",
      "forecast_period_start": "2025-01-01",
      "forecast_period_end": "2025-03-31",
      "forecasted_quantity": 1500,
      "forecasted_revenue": 45000,
      "confidence_level": 78.5,
      "algorithm_version": "simple_moving_average",
      "input_data_snapshot": {
        "months_analyzed": 12,
        "periods_ahead": 3,
        "algorithm_metadata": {
          "smoothing_factor": 0.3
        }
      }
    }
  ]
}
```

### Forecast Retrieval

#### GET /api/forecasting

Retrieve existing forecasts with filters.

**Query Parameters:**

| Parameter   | Type   | Description         |
| ----------- | ------ | ------------------- |
| `brand_id`  | UUID   | Filter by brand     |
| `sku`       | string | Filter by SKU       |
| `startDate` | date   | Period start filter |
| `endDate`   | date   | Period end filter   |

**Response:**

```json
{
  "forecasts": [
    {
      // ... forecast object
      "actual_quantity": 1400,
      "actual_revenue": 42000,
      "quantity_variance": -6.67,
      "revenue_variance": -6.67
    }
  ],
  "total": 25
}
```

---

## User Guide

### How to Generate a Forecast

1. **Navigate to Forecasting**

   - Click "Forecasting" in the sidebar menu

2. **Click "Generate Forecast"**

   - Opens the forecast generation dialog

3. **Configure Forecast Parameters**

   - **SKU (optional)**: Leave empty for all products, or enter specific SKU
   - **Forecast Period Start**: First day of forecast period
   - **Forecast Period End**: Last day of forecast period (recommend 3-6 months)
   - **Algorithm**: Select forecasting algorithm
     - Simple Moving Average: Best for stable products
     - Exponential Smoothing: Best for trending products
     - Trend Analysis: Best for growing/declining products

4. **Generate**

   - Click "Generate" button
   - System processes historical data and creates forecasts

5. **View Results**
   - Forecasts appear in the table
   - Use filters to narrow down results
   - Click "Export" to download CSV

### How to Interpret Forecast Results

| Column             | Meaning                                    |
| ------------------ | ------------------------------------------ |
| SKU                | Product identifier                         |
| Period             | Forecast time range                        |
| Forecasted Qty     | Predicted units to sell                    |
| Actual Qty         | Actual sales (if period has passed)        |
| Variance           | Difference between forecast and actual (%) |
| Forecasted Revenue | Predicted revenue                          |
| Confidence         | Algorithm confidence in prediction         |
| Algorithm          | Which algorithm was used                   |

### How to Configure Product Logistics

1. **Navigate to Inventory → Products**

2. **Select a Product**

3. **Edit Logistics Parameters**

   - **Lead Time Days**: How long from PO to receipt (default: 14)
   - **Safety Stock Days**: How many days of buffer stock (default: 7)
   - **Reorder Level**: Manual override for reorder point
   - **Reorder Quantity**: Standard order quantity

4. **Save Changes**

### How to View Inventory Optimization

**Via SQL (Supabase):**

```sql
SELECT * FROM inventory_optimization_metrics
WHERE brand_id = 'your-brand-id'
ORDER BY
  CASE reorder_status
    WHEN 'CRITICAL_OUT_OF_STOCK' THEN 1
    WHEN 'URGENT_BELOW_SAFETY' THEN 2
    WHEN 'REORDER_NOW' THEN 3
    WHEN 'PLAN_REORDER' THEN 4
    ELSE 5
  END;
```

### How to Generate Supply Recommendations

**Via SQL (Supabase):**

```sql
-- Get all products needing attention
SELECT * FROM generate_supply_plan_recommendations('your-brand-id'::UUID);

-- Include healthy products too
SELECT * FROM generate_supply_plan_recommendations('your-brand-id'::UUID, NULL, TRUE);

-- Specific SKU only
SELECT * FROM generate_supply_plan_recommendations('your-brand-id'::UUID, 'SKU-001');
```

---

## Testing & Validation

### Test 1: Verify Data Sources

```sql
-- Check sales_data has records from both sources
SELECT
  COUNT(*) as total_records,
  COUNT(order_id) as from_system_orders,
  COUNT(*) - COUNT(order_id) as from_distributor_uploads
FROM sales_data
WHERE brand_id = 'your-brand-id';
```

**Expected:** Both counts should be > 0 if you have orders and uploads.

### Test 2: Verify forecast_inputs View

```sql
SELECT
  sku,
  sales_month,
  quantity_sold,
  system_order_count,
  external_upload_count
FROM forecast_inputs
WHERE brand_id = 'your-brand-id'
ORDER BY sales_month DESC
LIMIT 10;
```

**Expected:** Monthly aggregations with source counts.

### Test 3: Verify Optimization Metrics

```sql
SELECT
  sku,
  current_stock,
  avg_daily_demand,
  days_of_stock,
  reorder_status,
  suggested_order_quantity
FROM inventory_optimization_metrics
WHERE brand_id = 'your-brand-id';
```

**Expected:** Calculations should reflect current stock and historical demand.

### Test 4: Generate and Verify Forecast

1. Generate a 3-month forecast via UI
2. Verify in database:

```sql
SELECT
  sku,
  forecast_period_start,
  forecasted_quantity,
  confidence_level,
  algorithm_version,
  input_data_snapshot->'months_analyzed' as months_analyzed
FROM demand_forecasts
WHERE brand_id = 'your-brand-id'
ORDER BY created_at DESC
LIMIT 10;
```

### Test 5: Verify Lead Time Impact

```sql
-- Update a product's lead time
UPDATE products
SET lead_time_days = 30
WHERE sku = 'TEST-SKU' AND brand_id = 'your-brand-id';

-- Check recalculated metrics
SELECT sku, lead_time_days, demand_during_lead_time, calculated_reorder_point
FROM inventory_optimization_metrics
WHERE sku = 'TEST-SKU' AND brand_id = 'your-brand-id';
```

**Expected:** `demand_during_lead_time` and `calculated_reorder_point` should increase.

---

## Troubleshooting

### Issue: No forecasts generated

**Symptoms:** "No forecasts generated" error message

**Causes & Solutions:**

1. **No sales data exists**

   - Check: `SELECT COUNT(*) FROM sales_data WHERE brand_id = 'your-brand-id';`
   - Solution: Upload distributor sales CSV or create orders

2. **SKU filter doesn't match**

   - Check: Verify SKU spelling and case
   - Solution: Leave SKU blank to forecast all products

3. **Date range too short**
   - Solution: Extend forecast period to at least 30 days

### Issue: Low confidence scores

**Symptoms:** Forecasts have <50% confidence

**Causes & Solutions:**

1. **High demand variability**

   - The product has erratic sales patterns
   - Solution: Try exponential smoothing algorithm

2. **Insufficient history**

   - Less than 6 months of data
   - Solution: Wait for more data or adjust expectations

3. **Seasonality not captured**
   - Solution: Use trend analysis algorithm

### Issue: Reorder recommendations seem wrong

**Symptoms:** Getting REORDER_NOW for well-stocked items

**Causes & Solutions:**

1. **Lead time too high**

   - Check product's `lead_time_days` setting
   - Solution: Adjust to actual supplier lead time

2. **Safety stock too high**

   - Check product's `safety_stock_days` setting
   - Solution: Reduce to appropriate buffer level

3. **Demand calculated from old data**
   - Sales data may be outdated
   - Solution: Ensure recent orders are synced

### Issue: forecast_inputs view returns no data

**Symptoms:** Query returns empty results

**Causes & Solutions:**

1. **sales_data table empty**

   - Run: `SELECT COUNT(*) FROM sales_data WHERE brand_id = '...';`
   - Solution: Import sales data or sync orders

2. **reporting_month is NULL**
   - Older records may not have reporting_month populated
   - Solution: Run backfill trigger

---

## Future Enhancements

### Phase 2 Features

1. **UI for Inventory Optimization**

   - Dashboard showing reorder status across all products
   - Visual alerts for critical/urgent items
   - Click-to-create PO from recommendations

2. **Supply Plan Workflow UI**

   - List view of all supply plans
   - Status transitions with audit trail
   - Bulk approve/reject

3. **Forecast Accuracy Tracking**

   - Automatic comparison of forecasts vs actuals
   - Accuracy metrics over time
   - Algorithm performance comparison

4. **Seasonal Adjustments**

   - Monthly seasonality factors
   - Holiday/promotion adjustments
   - Year-over-year comparisons

5. **Channel-Specific Forecasting**

   - Separate forecasts by sales channel
   - Territory-based predictions
   - Distributor-specific trends

6. **Automated Supply Planning**
   - Scheduled forecast regeneration
   - Automatic supply plan creation
   - PO auto-generation based on rules

---

## Version History

| Version | Date       | Changes                                            |
| ------- | ---------- | -------------------------------------------------- |
| 1.0     | 2025-12-09 | Initial implementation - Full forecasting pipeline |

---

**End of Documentation**
