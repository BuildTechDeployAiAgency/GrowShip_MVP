# Changelog - December 3, 2025 - Fix Order Lines Creation

## Summary

Fixed the order creation flow to properly create `order_lines` records when a new order is created, enabling shipment creation for orders.

## Problem

When orders were created through the Order Form Dialog, only the order header was saved to the `orders` table with the `items` JSONB array. The corresponding `order_lines` table records were not being created.

This caused the "Create Shipment" dialog to show "No order lines are available for shipping" because it queries the `order_lines` table to display shippable items.

## Solution

Modified the `createOrderMutation` in `hooks/use-orders.ts` to create `order_lines` records after successfully creating an order.

## Changes

### File Modified

- `hooks/use-orders.ts`

### Code Change

Added order_lines creation logic after order insertion:

```typescript
// Create order_lines from the items array to support shipments/fulfilment
if (order.items && Array.isArray(order.items) && order.items.length > 0) {
  const orderLinesPayload = order.items.map((item: any) => ({
    order_id: newOrder.id,
    product_id: item.product_id || null,
    sku: item.sku || "",
    product_name: item.product_name || item.name || "",
    quantity: item.quantity || 0,
    unit_price: item.unit_price || item.price || 0,
    discount: item.discount || 0,
    tax: item.tax || item.tax_rate || 0,
    currency: order.currency || "USD",
    notes: item.notes || null,
    shipped_quantity: 0,
  }));

  const { error: linesError } = await supabase
    .from("order_lines")
    .insert(orderLinesPayload);

  if (linesError) {
    console.error("Error creating order lines:", linesError);
    // Don't fail the entire operation, order was created successfully
  }
}
```

## Impact

- New orders created via the Order Form Dialog will now have corresponding `order_lines` records
- Shipment creation will work properly for new orders
- Existing orders without `order_lines` can be backfilled using migration `060_backfill_order_lines.sql`

## Note for Existing Orders

For orders created before this fix, run the backfill migration:
```sql
-- Run 060_backfill_order_lines.sql to populate order_lines from orders.items JSONB
```

