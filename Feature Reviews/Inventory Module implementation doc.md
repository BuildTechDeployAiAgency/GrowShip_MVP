# Inventory Module Implementation Documentation

**Date:** November 24, 2025  
**Version:** 1.0  
**Status:** Core Backend Complete - Frontend Pending

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [Transaction Types](#transaction-types)
5. [Workflow Integration](#workflow-integration)
6. [Alert System](#alert-system)
7. [API Reference](#api-reference)
8. [Frontend Components](#frontend-components)
9. [Security & Permissions](#security--permissions)
10. [Historical Backfill](#historical-backfill)
11. [Testing Guide](#testing-guide)
12. [Known Limitations](#known-limitations)
13. [Future Enhancements](#future-enhancements)

---

## Overview

The Inventory Module provides a **single-source-of-truth** inventory management system that automatically tracks all stock movements, integrates seamlessly with Purchase Orders and Orders workflows, generates intelligent alerts based on configurable thresholds, and provides complete transaction visibility.

### Key Features

- ✅ **Automatic Stock Tracking**: Every PO receipt and order fulfillment automatically updates inventory
- ✅ **Allocated vs Available**: Tracks reserved stock separately from on-hand stock
- ✅ **Inbound Visibility**: Shows expected stock from approved purchase orders
- ✅ **Smart Alerts**: Configurable thresholds with automatic notifications
- ✅ **Complete Audit Trail**: Every stock movement is logged with full context
- ✅ **Calendar Integration**: Automatic events for expected deliveries and restock reminders
- ✅ **Manual Adjustments**: Support for stocktakes and corrections
- ✅ **Historical Backfill**: Script to create transactions for existing data

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         Products Table                          │
│  - quantity_in_stock (on-hand physical stock)                   │
│  - allocated_stock (reserved for orders)                        │
│  - inbound_stock (expected from approved POs)                   │
│  - available_stock = quantity_in_stock - allocated_stock        │
│  - Alert thresholds: low, critical, max                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ References
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                  Inventory Transactions Table                   │
│  - Complete ledger of all stock movements                       │
│  - Links to source: PO, Order, Manual Adjustment                │
│  - Tracks before/after for: quantity, allocated, inbound        │
│  - Transaction types: PO_*, ORDER_*, MANUAL_*, STOCKTAKE_*      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  PO Workflow    │ │ Order Workflow  │ │ Manual Adjust   │
│  - Approved     │ │ - Submitted     │ │ - Stocktake     │
│  - Received     │ │ - Fulfilled     │ │ - Correction    │
│  - Cancelled    │ │ - Cancelled     │ │ - Damaged/Return│
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Alert Evaluator     │
                  │  - Check thresholds  │
                  │  - Generate alerts   │
                  └──────────┬───────────┘
                             │
                 ┌───────────┴──────────┐
                 │                      │
                 ▼                      ▼
        ┌─────────────────┐   ┌─────────────────┐
        │  Notifications  │   │  Calendar       │
        │  - Low stock    │   │  - Expected     │
        │  - Critical     │   │    delivery     │
        │  - Restored     │   │  - Restock      │
        └─────────────────┘   │    reminder     │
                              └─────────────────┘
```

### Single Source of Truth

All inventory reads go through the `products` table:

- **On-Hand Stock**: `products.quantity_in_stock`
- **Allocated Stock**: `products.allocated_stock`
- **Available Stock**: `products.available_stock` (computed)
- **Inbound Stock**: `products.inbound_stock`

All inventory writes go through `inventory_transactions`:

- Creates transaction record
- Updates products table atomically
- Triggers threshold evaluation
- Generates notifications/calendar events

---

## Data Model

### Core Tables

#### products (Enhanced)

| Column                     | Type        | Description                           |
| -------------------------- | ----------- | ------------------------------------- |
| `quantity_in_stock`        | INTEGER     | On-hand physical stock                |
| `allocated_stock`          | INTEGER     | Reserved for pending orders           |
| `inbound_stock`            | INTEGER     | Expected from approved POs            |
| `available_stock`          | INTEGER     | Computed: on-hand - allocated         |
| `low_stock_threshold`      | INTEGER     | Alert when stock falls below          |
| `critical_stock_threshold` | INTEGER     | Urgent alert threshold                |
| `max_stock_threshold`      | INTEGER     | Overstock warning (optional)          |
| `enable_stock_alerts`      | BOOLEAN     | Enable/disable alerts                 |
| `last_stock_check`         | TIMESTAMPTZ | Last verification timestamp           |
| `lead_time_days`           | INTEGER     | Supplier lead time (default: 14 days) |
| `safety_stock_days`        | INTEGER     | Buffer stock target (default: 7 days) |

#### inventory_transactions (New)

| Column             | Type        | Description                         |
| ------------------ | ----------- | ----------------------------------- |
| `id`               | UUID        | Primary key                         |
| `product_id`       | UUID        | Product reference                   |
| `sku`              | VARCHAR     | Denormalized for history            |
| `product_name`     | VARCHAR     | Denormalized for history            |
| `transaction_type` | VARCHAR     | Type of movement                    |
| `transaction_date` | TIMESTAMPTZ | When it occurred                    |
| `source_type`      | VARCHAR     | purchase_order, order, manual, etc. |
| `source_id`        | UUID        | Reference to source entity          |
| `reference_number` | VARCHAR     | PO#, Order#, Adj#                   |
| `quantity_change`  | NUMERIC     | +/- quantity                        |
| `quantity_before`  | NUMERIC     | Stock before transaction            |
| `quantity_after`   | NUMERIC     | Stock after transaction             |
| `allocated_before` | NUMERIC     | Allocated before                    |
| `allocated_after`  | NUMERIC     | Allocated after                     |
| `inbound_before`   | NUMERIC     | Inbound before                      |
| `inbound_after`    | NUMERIC     | Inbound after                       |
| `status`           | VARCHAR     | pending, completed, cancelled       |
| `notes`            | TEXT        | Description/reason                  |
| `brand_id`         | UUID        | Brand context                       |
| `created_by`       | UUID        | User who triggered                  |

### Indexes

**inventory_transactions**:

- `idx_inventory_transactions_product_id` - Product lookups
- `idx_inventory_transactions_sku` - SKU searches
- `idx_inventory_transactions_brand_id` - Brand filtering
- `idx_inventory_transactions_source` - Source entity lookups
- `idx_inventory_transactions_date` - Date range queries
- `idx_inventory_transactions_type` - Type filtering
- `idx_inventory_transactions_unique_source` - Prevents duplicates

**products**:

- `idx_products_allocated_stock` - Allocation queries
- `idx_products_inbound_stock` - Inbound queries
- `idx_products_available_stock` - Available queries
- `idx_products_enable_stock_alerts` - Alert evaluation

---

## Transaction Types

### Purchase Order Transactions

| Type           | When         | Quantity Change | On-Hand Change    | Inbound Change    | Allocated Change |
| -------------- | ------------ | --------------- | ----------------- | ----------------- | ---------------- |
| `PO_APPROVED`  | PO approved  | +qty            | No                | +qty              | No               |
| `PO_RECEIVED`  | PO received  | +qty            | +qty              | -qty              | No               |
| `PO_CANCELLED` | PO cancelled | -qty or 0       | If received: -qty | If approved: -qty | No               |

### Order Transactions

| Type              | When             | Quantity Change | On-Hand Change | Inbound Change | Allocated Change |
| ----------------- | ---------------- | --------------- | -------------- | -------------- | ---------------- |
| `ORDER_ALLOCATED` | Order processing | 0               | No             | No             | +qty             |
| `ORDER_FULFILLED` | Order shipped    | -qty            | -qty           | No             | -qty             |
| `ORDER_CANCELLED` | Order cancelled  | 0               | No             | No             | -qty             |

### Manual Transactions

| Type                   | When              | Quantity Change | On-Hand Change | Inbound Change | Allocated Change |
| ---------------------- | ----------------- | --------------- | -------------- | -------------- | ---------------- |
| `MANUAL_ADJUSTMENT`    | Manual adjustment | +/- qty         | +/- qty        | No             | No               |
| `STOCKTAKE_ADJUSTMENT` | Physical count    | +/- qty         | +/- qty        | No             | No               |

---

## Workflow Integration

### Purchase Order Flow

```
┌─────────────────┐
│  PO Created     │
│  (draft)        │
└────────┬────────┘
         │
         │ User submits for approval
         ▼
┌─────────────────┐
│  PO Approved    │────────┐
└────────┬────────┘        │
         │                 │ syncPOApproval()
         │                 │ - Create PO_APPROVED transactions
         │                 │ - Update inbound_stock (+qty)
         │                 │ - Create calendar event
         │                 └──────────┐
         │                            │
         │ User marks as received     │
         ▼                            │
┌─────────────────┐                  │
│  PO Received    │────────┐         │
└────────┬────────┘        │         │
         │                 │ syncPOReceipt()
         │                 │ - Mark pending transactions complete
         │                 │ - Create PO_RECEIVED transactions
         │                 │ - Update quantity_in_stock (+qty)
         │                 │ - Update inbound_stock (-qty)
         │                 │ - Evaluate thresholds → alerts
         │                 │ - Mark calendar event complete
         │                 └──────────┘
         │
     ┌───┴───┐
     │ Done  │
     └───────┘
```

**Cancellation**: Can occur from any status → `syncPOCancellation()`

### Order Flow

```
┌─────────────────┐
│  Order Created  │
│  (pending)      │
└────────┬────────┘
         │
         │ Admin marks as processing
         ▼
┌─────────────────┐
│ Order Processing│────────┐
└────────┬────────┘        │
         │                 │ syncOrderAllocation()
         │                 │ - Check stock availability
         │                 │ - Create ORDER_ALLOCATED transactions
         │                 │ - Update allocated_stock (+qty)
         │                 │ - Evaluate thresholds → alerts if low available
         │                 └──────────┘
         │
         │ Admin marks as shipped
         ▼
┌─────────────────┐
│ Order Shipped   │────────┐
└────────┬────────┘        │
         │                 │ syncOrderFulfillment()
         │                 │ - Create ORDER_FULFILLED transactions
         │                 │ - Update quantity_in_stock (-qty)
         │                 │ - Update allocated_stock (-qty)
         │                 │ - Evaluate thresholds → alerts if critical/low/out
         │                 └──────────┘
         │
     ┌───┴───┐
     │ Done  │
     └───────┘
```

**Cancellation**:

- From `processing` → `syncOrderCancellation()` (Releases allocation)
- From `pending` → No inventory action (nothing allocated yet)

**Direct Fulfillment** (`pending` → `shipped`):

- Triggers both `syncOrderAllocation()` and `syncOrderFulfillment()` to ensure correct transaction history.

---

## Alert System

### Threshold Evaluation

**Alert Levels**:

- `critical`: stock ≤ critical_threshold (or stock = 0)
- `low`: stock ≤ low_threshold (but > critical)
- `overstock`: stock ≥ max_threshold (optional)
- `healthy`: None of the above

**Evaluation Triggers**:

1. PO receipt completes
2. Order fulfillment completes
3. Manual adjustment made
4. Periodic cron job (recommended: daily)

**Notification Creation**:

- Alerts created only when threshold **crossed** (level changes)
- Prevents notification spam
- Auto-clears when stock restored to healthy

### Notification Types

| Scenario         | Type              | Priority | Action Required | Calendar Event                 |
| ---------------- | ----------------- | -------- | --------------- | ------------------------------ |
| Stock = 0        | Out of Stock      | Urgent   | Yes             | Restock reminder               |
| Stock ≤ critical | Critical Stock    | Urgent   | Yes             | Restock reminder               |
| Stock ≤ low      | Low Stock         | High     | Yes             | Restock reminder (if critical) |
| Stock restored   | Stock Replenished | Low      | No              | Deletes pending reminders      |
| Stock ≥ max      | Overstock         | Medium   | No              | None                           |
| Running out soon | Predictive Alert  | High     | Yes             | Predicted stock-out date       |

### Predictive Alerts

**Days Until Out of Stock**:

- Analyzes last 30 days of sales velocity
- Calculates average daily consumption
- Projects when current stock will be depleted
- Creates alert if projection < 7 days

**Formula**: `days_until_out = current_stock / average_daily_consumption`

---

## API Reference

### Manual Adjustments

#### POST /api/inventory/adjust

Adjust stock for a single product.

**Request Body**:

```json
{
  "product_id": "uuid",
  "adjustment_type": "manual" | "stocktake" | "correction" | "damaged" | "return",
  "quantity_change": 10,
  "reason": "Physical count discrepancy",
  "reference_number": "ADJ-2025-001",
  "notes": "Annual stocktake"
}
```

**Response**:

```json
{
  "success": true,
  "transaction": {
    /* transaction object */
  },
  "product": {
    "id": "uuid",
    "sku": "SKU-001",
    "product_name": "Product Name",
    "quantity_before": 50,
    "quantity_after": 60
  }
}
```

**Permissions**: Brand users + Super admins (Distributors: ❌)

#### POST /api/inventory/bulk-adjust

Bulk adjustments for multiple products.

**Request Body**:

```json
{
  "adjustments": [
    { "product_id": "uuid", "quantity_change": 5, "notes": "..." },
    { "product_id": "uuid", "quantity_change": -3, "notes": "..." }
  ],
  "adjustment_type": "stocktake" | "correction",
  "reference_number": "STOCKTAKE-2025-Q1"
}
```

**Response**:

```json
{
  "success": true,
  "reference_number": "STOCKTAKE-2025-Q1",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    { "success": true, "product_id": "uuid" },
    { "success": true, "product_id": "uuid" }
  ]
}
```

### Transaction Queries

#### GET /api/inventory/transactions

List inventory transactions with filtering.

**Query Parameters**:

- `product_id` (UUID) - Filter by product
- `sku` (string) - Partial SKU match
- `transaction_type` (string) - PO_RECEIVED, ORDER_FULFILLED, etc.
- `source_type` (string) - purchase_order, order, manual, etc.
- `source_id` (UUID) - Specific PO/Order
- `date_from` (ISO date) - Start date
- `date_to` (ISO date) - End date
- `status` (string) - pending, completed, cancelled
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50, max: 100) - Per page

**Response**:

```json
{
  "transactions": [
    /* array of transactions */
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

#### GET /api/inventory/products/[id]/history

Get transaction history for a specific product.

**Response**:

```json
{
  "product": {
    "id": "uuid",
    "sku": "SKU-001",
    "product_name": "Product Name",
    "current_stock": 100,
    "allocated_stock": 20,
    "available_stock": 80,
    "inbound_stock": 50
  },
  "transactions": [
    /* array of transactions */
  ],
  "stock_levels_over_time": [
    {
      "date": "2025-11-24",
      "quantity": 100,
      "allocated": 20,
      "available": 80,
      "inbound": 50
    }
  ],
  "summary": {
    "total_inbound": 500,
    "total_outbound": 400,
    "total_adjustments": 10,
    "net_change": 110
  }
}
```

### Database Functions

#### get_stock_breakdown(product_id)

Returns current stock breakdown for a product.

```sql
SELECT * FROM get_stock_breakdown('product-uuid');
```

Returns: on_hand, allocated, available, inbound, thresholds, alerts_enabled

#### check_stock_thresholds(brand_id)

Identifies products crossing thresholds for a brand.

```sql
SELECT * FROM check_stock_thresholds('brand-uuid');
```

Returns: Products with critical, low, or overstock alerts

#### get_inventory_summary_with_alerts(brand_id)

Enhanced inventory summary with breakdowns.

```sql
SELECT * FROM get_inventory_summary_with_alerts('brand-uuid');
```

Returns: Total products, total on-hand, allocated, available, inbound, alert counts

---

## Frontend Components

### ⏳ Pending Implementation

#### Transaction List Page (`/inventory/transactions`)

- Filterable table with all transaction history
- Columns: Date, SKU, Product, Type, Source (link), Quantity (+/-), Stock Before/After, User
- Real-time updates via Supabase Realtime
- Export to CSV
- Pagination (50 per page)

#### Product Detail Enhancements

**Stock Breakdown Card**:

- On Hand: X units
- Allocated: X units (from Y orders)
- Available: X units
- Inbound: X units (from Y POs)

**Alert Thresholds Card**:

- Low Stock Threshold: X units
- Critical Threshold: X units
- Alerts: Enabled/Disabled
- [Edit Thresholds] button

**Recent Transactions Widget**:

- Last 5 transactions
- Link to full history

#### Inventory Settings Page (`/inventory/settings`)

- Bulk edit alert thresholds
- Table of all products with threshold columns
- Enable/disable alerts per product
- Global threshold defaults

#### Manual Adjustment Dialog

- Product selector (searchable)
- Adjustment type dropdown
- Quantity change input
- Reason (required)
- Reference number (optional)
- Notes (optional)

#### PO Detail Inventory Impact Section

- Shows inventory impact per line
- If approved: "Inbound: +X units (expected [date])"
- If received: "Added +X units to stock on [date]"
- Link to inventory transactions

#### Order Detail Stock Allocation Section

- Shows stock allocation per line
- If submitted: "Stock Allocated: -X units"
- If fulfilled: "Stock Consumed: -X units on [date]"
- If cancelled: "Stock Released: +X units"
- Link to inventory transactions

---

## Security & Permissions

### Row Level Security (RLS)

**inventory_transactions**:

```sql
-- Brand users see their brand's transactions
brand_id IN (SELECT brand_id FROM user_profiles WHERE user_id = auth.uid())

-- Distributors see transactions for their orders/POs only
source_type IN ('order', 'purchase_order') AND source_id IN (
  SELECT id FROM orders/purchase_orders
  WHERE distributor_id = user_distributor_id
)

-- Super admins see all
role_name = 'super_admin'
```

### Operation Permissions

| Operation          | Brand Users       | Distributors        | Super Admins |
| ------------------ | ----------------- | ------------------- | ------------ |
| View transactions  | ✅ (own brand)    | ✅ (own orders/POs) | ✅ (all)     |
| Manual adjustments | ✅ (own products) | ❌                  | ✅ (all)     |
| Edit thresholds    | ✅ (own products) | ❌                  | ✅ (all)     |
| View stock levels  | ✅                | ✅                  | ✅           |

---

## Historical Backfill

### Migration 054: Backfill Script

**Purpose**: Create historical transactions for existing POs and Orders

**Process**:

1. Backup current stock levels
2. Reset all stock to zero
3. Process received POs chronologically (add stock)
4. Process fulfilled orders chronologically (consume stock)
5. Reconcile with original stock levels
6. Create adjustment transactions for mismatches

**Safety Features**:

- Commented BEGIN/COMMIT (manual execution)
- Backup table created before changes
- Progress logging
- Mismatch detection and correction
- Validation queries included

**Execution**:

```sql
-- 1. Review the script carefully
-- 2. Test in non-production environment first
-- 3. Uncomment BEGIN and COMMIT
-- 4. Run the script
-- 5. Review output logs
-- 6. Run validation queries
```

**Validation Queries**:

- Transaction counts per product
- Products without transactions
- Stock calculation verification

---

## Testing Guide

### Unit Tests (Pending)

**Database Functions**:

- `create_inventory_transaction()` - Various scenarios
- `update_allocated_stock()` - Boundary conditions
- `check_stock_thresholds()` - All alert levels

**Service Functions**:

- `syncPOApproval()` - Transaction creation
- `syncOrderAllocation()` - Stock availability checks
- `evaluateStockThresholds()` - Threshold detection

### Integration Tests (Pending)

**PO Workflow**:

1. Create PO → Approve → Check inbound stock updated
2. Receive PO → Check on-hand stock updated, inbound decreased
3. Cancel PO (approved) → Check inbound reversed
4. Cancel PO (received) → Check on-hand reversed

**Order Workflow**:

1. Submit Order → Check allocated stock updated
2. Fulfill Order → Check on-hand decreased, allocated decreased
3. Cancel Order → Check allocated released

**Alert System**:

1. Fulfill order causing low stock → Check notification created
2. Receive PO resolving low stock → Check notification created
3. Manual adjustment crossing threshold → Check notification

### End-to-End Scenarios

**Scenario 1: Complete PO Flow**

```
1. Create PO for 100 units of Product A
2. Approve PO
   → Verify inbound_stock = 100
   → Verify calendar event created
3. Receive PO
   → Verify quantity_in_stock += 100
   → Verify inbound_stock -= 100
   → Verify PO_RECEIVED transaction exists
   → Verify calendar event marked complete
```

**Scenario 2: Order Allocation & Fulfillment**

```
1. Product A: on-hand = 100, allocated = 0
2. Create order for 30 units, submit
   → Verify allocated_stock = 30
   → Verify available_stock = 70
   → Verify ORDER_ALLOCATED transaction
3. Fulfill order
   → Verify quantity_in_stock = 70
   → Verify allocated_stock = 0
   → Verify ORDER_FULFILLED transaction
```

**Scenario 3: Low Stock Alert**

```
1. Product A: stock = 25, low_threshold = 20
2. Fulfill order for 10 units
   → Stock = 15 (below threshold)
   → Verify notification created
   → Verify calendar reminder created
3. Receive PO for 50 units
   → Stock = 65 (above threshold)
   → Verify "Stock Restored" notification
   → Verify calendar reminder deleted
```

---

## Known Limitations (MVP Scope)

1. **No Partial PO Receipts**

   - Full receipt only
   - Future: Track `received_quantity` per line

2. **No Partial Order Fulfillments**

   - All-or-nothing fulfillment
   - Future: Track `fulfilled_quantity` per line

3. **No Multi-Warehouse Support**

   - Single inventory pool per brand
   - Future: Add `warehouse_id` dimension

4. **No Batch/Lot Tracking**

   - No expiry dates or serial numbers
   - Future: Add `batch_id`, `lot_number`, `expiry_date`

5. **Frontend UI Incomplete**
   - Core backend complete
   - Frontend components pending

> **Note:** Advanced Forecasting and Supply Planning are now implemented! See "Forecasting and Supply Planning Documentation.md" for details.

---

## Future Enhancements

### Phase 2 Features

1. **Multi-Warehouse Support**

   - Track inventory per location
   - Stock transfers between warehouses
   - Location-specific thresholds

2. **Partial Operations**

   - Partial PO receipts
   - Partial order fulfillments
   - Split shipments

3. **Batch & Lot Tracking**

   - Expiry date management
   - Serial number tracking
   - FIFO/LIFO/FEFO support

> **Completed Features (December 2025):**
>
> - ✅ **Advanced Forecasting** - Multiple algorithms (SMA, Exponential Smoothing, Trend Analysis)
> - ✅ **Supply Planning** - Automated reorder recommendations with workflow tracking
> - ✅ **Lead Time Integration** - Products now have `lead_time_days` and `safety_stock_days`
> - ✅ **Inventory Optimization** - Real-time reorder point calculations
>
> See "Forecasting and Supply Planning Documentation.md" for full details.

6. **Inventory Reports**

   - Stock turnover analysis
   - Aging reports
   - Valuation reports (FIFO, LIFO, Weighted Average)
   - ABC analysis

7. **Cycle Counting**

   - Regular partial stocktakes
   - Variance tracking
   - Adjustment workflows

8. **Mobile Apps**

   - Barcode scanning for receipts
   - Mobile stocktake
   - Quick adjustments

9. **3PL Integration**

   - External warehouse sync
   - Real-time stock updates
   - Automated receipts/shipments

10. **Cost Tracking**
    - Landed cost calculation
    - Cost layer management
    - Profitability analysis

---

## Support & Troubleshooting

### Common Issues

**Issue**: Stock levels don't match after backfill
**Solution**: Run validation queries in migration 054, check reconciliation adjustments

**Issue**: Duplicate transactions error
**Solution**: Unique index prevents duplicates - this is expected behavior

**Issue**: Negative stock levels
**Solution**: System allows negative stock (backorders) - review business rules if unwanted

**Issue**: Alerts not triggering
**Solution**: Check `enable_stock_alerts` flag on product, verify thresholds configured

### Debug Queries

**Check recent transactions for a product**:

```sql
SELECT * FROM inventory_transactions
WHERE product_id = 'uuid'
ORDER BY transaction_date DESC
LIMIT 10;
```

**Verify stock calculation**:

```sql
SELECT
  p.sku,
  p.quantity_in_stock as current,
  SUM(it.quantity_change) as calculated
FROM products p
LEFT JOIN inventory_transactions it ON p.id = it.product_id
WHERE p.id = 'uuid'
GROUP BY p.id;
```

**Find products with alerts**:

```sql
SELECT * FROM check_stock_thresholds('brand-uuid');
```

---

## Troubleshooting Guide

### Transactions Not Appearing After Order Status Change

**Symptoms**: Order status updates successfully, but no new transactions appear in the Inventory → Transactions tab.

**Common Causes & Solutions**:

1. **No `order_lines` Records**

   - Orders created via certain methods may not have `order_lines` populated
   - The sync functions now fall back to parsing the `items` JSON column if `order_lines` is empty
   - Verify with: `SELECT COUNT(*) FROM order_lines WHERE order_id = 'your-order-id'`

2. **SKU Not Linked to Product**

   - If order items have SKUs that don't exist in the `products` table, no transactions are created
   - The sync functions skip items without a valid `product_id`
   - Solution: Ensure all order line SKUs have corresponding products

3. **RLS Policy Blocking Inserts**

   - The inventory sync functions use `createAdminClient()` to bypass RLS
   - If using `createClient()` by mistake, inserts may fail silently
   - Check server logs for RLS-related errors

4. **Stale UI Cache**
   - The transactions list has a 30-second cache (`staleTime`)
   - Refresh the page or wait for cache to expire after making changes

### Debugging Steps

1. **Check Terminal Logs**

   After changing an order status, look for these log messages:

   ```
   [syncOrderAllocation] Starting allocation for order {id}
   [syncOrderAllocation] Found order {number} (brand: {id})
   [syncOrderAllocation] Found {n} line item(s) for order {id} (source: order_lines|items_json)
   [syncOrderAllocation] Created ORDER_ALLOCATED transaction for SKU {sku}
   ```

2. **Verify Order Has Line Items**

   ```sql
   -- Check order_lines table
   SELECT * FROM order_lines WHERE order_id = 'your-order-id';

   -- Check items JSON
   SELECT items FROM orders WHERE id = 'your-order-id';
   ```

3. **Verify Products Exist for SKUs**

   ```sql
   SELECT p.id, p.sku FROM products p
   INNER JOIN order_lines ol ON p.sku = ol.sku
   WHERE ol.order_id = 'your-order-id';
   ```

4. **Check Recent Transactions**
   ```sql
   SELECT * FROM inventory_transactions
   WHERE source_id = 'your-order-id'
   ORDER BY created_at DESC;
   ```

### Manual Transaction Backfill

If orders were processed before the fix was applied, you may need to manually create transactions:

1. Use the **Manual Adjustment** feature in the Inventory UI
2. Or run the backfill migration script: `supabase_migrations/054_backfill_inventory_transactions.sql`

---

## Version History

| Version | Date       | Changes                                                        |
| ------- | ---------- | -------------------------------------------------------------- |
| 1.0     | 2025-11-24 | Initial implementation - Core backend complete                 |
| 1.1     | 2025-12-05 | Fixed: syncOrderAllocation now uses admin client to bypass RLS |
| 1.1     | 2025-12-05 | Added: Fallback to items JSON if order_lines table is empty    |
| 1.1     | 2025-12-05 | Added: Enhanced diagnostic logging throughout sync functions   |
| 1.1     | 2025-12-05 | Added: Troubleshooting guide section                           |

---

**End of Documentation**
