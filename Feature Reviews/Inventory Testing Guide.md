# Inventory System: Testing & Verification Guide

**Objective:** Verify that inventory transactions are automatically created and stock levels are updated when Orders and Purchase Orders change status.

## 1. Purchase Order Workflow (Inbound Stock)

_This tests receiving new stock into the warehouse._

### Step 1: Create a Purchase Order

1.  Navigate to **Purchase Orders**.
2.  Click **Create New**.
3.  Select a **Manufacturer** (e.g., "Test Manufacturer").
4.  Add line items:
    - **Product**: Select a product (e.g., `SKU001`). Note the current "On Hand" stock.
    - **Quantity**: Enter `100`.
5.  Click **Create Draft**.

### Step 2: Approve the PO

1.  Open the PO you just created.
2.  Click **Approve**.
    - **Verify**: Go to **Inventory > Products**. Search for `SKU001`.
    - **Check**: `Inbound Stock` should have increased by 100. `On Hand` should remain unchanged.

### Step 3: Receive the PO

1.  Go back to the PO.
2.  Click **Receive Stock** (or mark as "Received").
    - **Verify**: Go to **Inventory > Transactions**.
    - **Check**: You should see a new transaction at the top:
      - **Type**: `PO_RECEIVED`
      - **Quantity**: `+100`
      - **Source**: Link to your PO number.
    - **Verify**: Go to **Inventory > Products**. `On Hand` should have increased by 100. `Inbound Stock` should decrease by 100.

---

## 2. Order Workflow (Outbound Stock)

_This tests selling stock and fulfilling orders._

### Step 1: Create an Order

1.  Navigate to **Orders**.
2.  Click **New Order**.
3.  Select a **Customer**.
4.  Add line items:
    - **Product**: Select the same product as above (`SKU001`).
    - **Quantity**: Enter `10`.
5.  Click **Create Order**. Status starts as `Pending`.

### Step 2: Process the Order (Allocation)

1.  Open the Order.
2.  Change status from `Pending` to **Processing**.
    - **Verify**: Go to **Inventory > Transactions**.
    - **Check**: You should see a new transaction:
      - **Type**: `ORDER_ALLOCATED`
      - **Quantity**: `0` (Allocation doesn't change on-hand count yet).
      - **Allocated After**: Should show an increase (e.g., from 0 to 10).
    - **Verify**: Go to **Inventory > Products**. `Allocated Stock` should be `10`. `Available Stock` (On Hand - Allocated) should be lower.

### Step 3: Ship the Order (Fulfillment)

1.  Go back to the Order.
2.  Change status from `Processing` to **Shipped**.
    - **Verify**: Go to **Inventory > Transactions**.
    - **Check**: You should see a new transaction:
      - **Type**: `ORDER_FULFILLED`
      - **Quantity**: `-10` (This deducts from physical stock).
    - **Verify**: Go to **Inventory > Products**. `On Hand` stock should have decreased by 10. `Allocated Stock` should have dropped back down (releasing the reservation).

### Step 4: Direct Fulfillment (Optional)

_Test skipping the processing step._

1.  Create another Order for `5` units of `SKU001`. Status: `Pending`.
2.  Change status directly to **Shipped**.
    - **Verify**: Go to **Inventory > Transactions**.
    - **Check**: You should see **two** transactions created almost simultaneously:
      1.  `ORDER_ALLOCATED` (System auto-allocates first).
      2.  `ORDER_FULFILLED` (System immediately consumes the stock).
    - **Result**: Net change to `On Hand` is `-5`.

---

## 3. Troubleshooting

### Quick Checklist

If you do not see transactions appearing after changing an order status:

1. **Refresh the page**: The Transactions tab has a 30-second cache. Refresh the browser to see new data.
2. **Check the Brand filter**: If you are a Super Admin with a brand assigned, transactions are filtered by that brand.
3. **Clear all filters**: Ensure "All Types", "All Products", and "All Statuses" are selected.
4. **Wait 5-10 seconds**: Database updates may take a moment to propagate.

### Debugging Checklist

If transactions still don't appear after refreshing:

1. **Check Terminal Logs**

   - Look for `[syncOrderAllocation]` or `[syncOrderFulfillment]` messages
   - If you see "No line items found", the order may not have `order_lines` or `items`
   - If you see "Created ORDER_ALLOCATED transaction", the database insert succeeded

2. **Verify Order Has Products**

   - The order must have line items with valid SKUs that exist in your Products list
   - Items without matching products in the database will be skipped

3. **Check `/api/inventory/transactions` Response**

   - Open browser DevTools → Network tab
   - Look for the transactions API call
   - Verify the response includes your expected transactions

4. **Database Direct Check** (for admins)
   - Query: `SELECT * FROM inventory_transactions WHERE source_id = 'your-order-id' ORDER BY created_at DESC;`
   - If empty, the sync function didn't create transactions

### Common Issues & Solutions

| Symptom                                | Cause                                                        | Solution                                |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| No transactions created                | Order has no `order_lines` and items JSON is empty/invalid   | Create order with valid line items      |
| Transactions created but not visible   | Brand ID mismatch between order and user profile             | Verify you're viewing the correct brand |
| Error in terminal: "Product not found" | Order line SKU doesn't exist in products table               | Add the product or correct the SKU      |
| Error: "Transaction creation failed"   | Possible unique constraint violation (duplicate transaction) | Check if transaction already exists     |

### Server Log Messages Reference

| Log Message                                      | Meaning                                   |
| ------------------------------------------------ | ----------------------------------------- |
| `[syncOrderAllocation] Starting allocation...`   | Function was called successfully          |
| `Found {n} line item(s) (source: order_lines)`   | Using order_lines table                   |
| `Found {n} line item(s) (source: items_json)`    | Fallback to items JSON (no order_lines)   |
| `Created ORDER_ALLOCATED transaction for SKU...` | Transaction inserted successfully         |
| `No line items found`                            | Both order_lines and items JSON are empty |
| `Product not found: {id}`                        | Product doesn't exist in database         |
