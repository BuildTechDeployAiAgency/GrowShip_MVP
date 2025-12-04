# Sync Orders to Sales Data Implementation

**Date:** 2025-12-07
**Author:** GrowShip MVP Team

## Overview

This document describes the implementation of automatic synchronization between application orders (`orders` + `order_lines` tables) and the `sales_data` table used by dashboard metrics.

## Background

The GrowShip dashboard was designed to display metrics from the `sales_data` table, which was originally populated via:
1. **Excel Imports** - Distributors upload monthly sales reports
2. **API Integration** - (Future) External system integrations

However, orders created directly in the application were stored in a separate `orders` table and were NOT reflected in dashboard metrics, leading to $0 revenue display.

## Architecture Decision

Rather than modifying all dashboard RPC functions to query from multiple tables (`sales_data` + `orders`), we chose to **sync order data into `sales_data`**. This approach:

1. **Maintains single source of truth** for dashboard queries
2. **Preserves existing RPC functions** without modification
3. **Enables mixed data** (imported + app orders) in reports
4. **Supports future audit trail** via `order_id` reference

## Implementation Details

### Database Objects Created

| Object | Type | Purpose |
|--------|------|---------|
| `sales_data.order_id` | Column | Links to source order |
| `sales_data.order_line_id` | Column | Links to specific line item |
| `uq_sales_data_order_line_id` | Constraint | Prevents duplicate syncs |
| `sync_order_to_sales_data()` | Function | Syncs single order |
| `trigger_sync_order_to_sales_data()` | Trigger Function | Auto-sync on status change |
| `trigger_order_to_sales_data` | Trigger | Fires on orders INSERT/UPDATE |

### Order Status Mapping

| Order Status | Action |
|--------------|--------|
| `pending` | No sync (order not yet processing) |
| `processing` | Sync to sales_data |
| `shipped` | Sync to sales_data |
| `delivered` | Sync to sales_data |
| `cancelled` | Remove from sales_data |

### Data Mapping

| sales_data Column | Source |
|-------------------|--------|
| `brand_id` | orders.brand_id |
| `distributor_id` | orders.distributor_id |
| `order_id` | orders.id |
| `order_line_id` | order_lines.id |
| `sku` | order_lines.sku |
| `product_name` | order_lines.product_name |
| `product_category` | products.product_category (lookup) |
| `retailer_name` | orders.customer_name |
| `territory` | NULL (not available) |
| `territory_country` | orders.shipping_country |
| `sales_date` | orders.order_date |
| `reporting_month` | DATE_TRUNC('month', order_date) |
| `sales_channel` | orders.sales_channel |
| `total_sales` | order_lines.total |
| `quantity_sold` | order_lines.quantity |
| `currency` | order_lines.currency or orders.currency |
| `campaign_id` | orders.campaign_id |
| `notes` | orders.notes |
| `import_timestamp` | NOW() |

## Scalability Considerations

### For Future Excel Import Feature

When implementing bulk imports via ExcelJS:
1. Imported records will NOT have `order_id` set (remains NULL)
2. Order-synced records WILL have `order_id` set
3. This allows filtering/reporting by data source if needed

### Query Example
```sql
-- Get revenue from Excel imports only
SELECT SUM(total_sales) FROM sales_data WHERE order_id IS NULL;

-- Get revenue from application orders only
SELECT SUM(total_sales) FROM sales_data WHERE order_id IS NOT NULL;

-- Get all revenue (combined)
SELECT SUM(total_sales) FROM sales_data;
```

## Testing

After applying migration:

1. Create a new order in the application
2. Confirm the order (change status to `confirmed`)
3. Check `sales_data` table for new records
4. Refresh dashboard - revenue should appear

## Related Files

- `supabase_migrations/20251207_sync_orders_to_sales_data.sql`
- `supabase_migrations/20251204_dashboard_metrics.sql` (RPC functions)
- `hooks/use-dashboard-metrics.ts`
- `types/orders.ts`

