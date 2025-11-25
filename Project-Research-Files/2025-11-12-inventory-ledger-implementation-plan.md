# Inventory Ledger System - Implementation Plan

**Date:** November 12, 2025  
**Status:** 📋 **PLAN - AWAITING APPROVAL**  
**Purpose:** Design and implement inventory transaction ledger with automatic sync from POs and Orders

---

## Overview

This plan outlines the implementation of a comprehensive inventory management system that:
- Tracks every stock-impacting transaction in a ledger
- Automatically syncs inventory with Purchase Orders and Sales Orders
- Provides transaction history view (inventory journal)
- Shows current stock per SKU on product pages
- Displays inventory impact on PO and Order detail pages

---

## A) Data Modeling (Inventory Ledger and Stock Fields)

### 1.1 Create Inventory Transactions Table

**Migration:** `035_create_inventory_transactions_table.sql`

**Table Structure:**

```sql
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product Reference
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku VARCHAR(100) NOT NULL,  -- Denormalized for performance and legacy support
  
  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL,  -- PURCHASE_ORDER, SALES_ORDER, MANUAL_ADJUSTMENT, RETURN, CORRECTION
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Source Reference (polymorphic)
  source_type VARCHAR(50),  -- 'purchase_order', 'order', 'manual', 'return', 'correction'
  source_id UUID,  -- ID of the PO, Order, or NULL for manual
  
  -- Quantity Movement
  quantity_change NUMERIC(10,2) NOT NULL,  -- Positive for inbound, negative for outbound
  quantity_before NUMERIC(10,2) NOT NULL,  -- Stock level before this transaction
  quantity_after NUMERIC(10,2) NOT NULL,    -- Stock level after this transaction
  
  -- Status & Context
  status VARCHAR(20) DEFAULT 'completed',  -- 'pending', 'completed', 'cancelled', 'reversed'
  reference_number VARCHAR(100),  -- PO number, Order number, or adjustment reference
  notes TEXT,
  
  -- User & Brand Context
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Transaction Types:**
- `PURCHASE_ORDER_RECEIVED` - PO received (adds to stock)
- `PURCHASE_ORDER_CANCELLED` - PO cancelled (reverses inbound)
- `SALES_ORDER_ALLOCATED` - Order created/submitted (reserves stock)
- `SALES_ORDER_FULFILLED` - Order fulfilled/delivered (consumes stock)
- `SALES_ORDER_CANCELLED` - Order cancelled (releases allocation)
- `MANUAL_ADJUSTMENT` - Manual stock adjustment
- `RETURN` - Product return (adds to stock)
- `CORRECTION` - Stock correction/adjustment

**Indexes:**
```sql
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_sku ON inventory_transactions(sku);
CREATE INDEX idx_inventory_transactions_brand_id ON inventory_transactions(brand_id);
CREATE INDEX idx_inventory_transactions_source ON inventory_transactions(source_type, source_id);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(transaction_date DESC);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_status ON inventory_transactions(status);
```

**RLS Policies:**
- Users can view transactions for their brand
- Users can create transactions for their brand (via application logic)
- Super admins can view all transactions
- Distributor admins can view transactions for their distributor's orders/POs

---

### 1.2 Enhance Products Table (Optional - Current Stock Tracking)

**Decision:** Keep `products.quantity_in_stock` as denormalized current stock.

**Rationale:**
- Performance: Fast queries without aggregating transactions
- Simplicity: Single source of truth for "current stock"
- Maintained via triggers/functions when transactions are created

**Alternative Considered:** Compute on-the-fly from transactions
- ❌ Rejected: Performance concerns for large transaction history
- ✅ Can add materialized view later if needed

**Additional Fields to Consider (Future):**
- `allocated_stock` INTEGER - Reserved stock (from orders)
- `inbound_stock` INTEGER - Expected stock (from POs)
- `available_stock` INTEGER - Computed: on_hand - allocated

**Recommendation:** Add these fields in Phase 2 if needed. For MVP, use `quantity_in_stock` only.

---

### 1.3 Create Helper Functions

**Migration:** `036_create_inventory_functions.sql`

**Functions:**

1. **`get_current_stock(p_product_id UUID)`**
   - Returns current `quantity_in_stock` from products table
   - Fast lookup for current stock

2. **`get_stock_history(p_product_id UUID, p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ)`**
   - Returns all transactions for a product in date range
   - Used for product detail page history

3. **`create_inventory_transaction(...)`**
   - Wrapper function to create transaction and update products.quantity_in_stock
   - Ensures atomicity (transaction + stock update)
   - Validates stock doesn't go negative (unless allowed)

4. **`get_inventory_transactions(p_filters JSONB)`**
   - Generic function to query transactions with filters
   - Supports: product_id, sku, transaction_type, date_range, source_type, source_id
   - Used by API endpoint

---

## B) Inventory Consumption & Sync Logic (POs + Orders)

### 2.1 Purchase Order Inventory Sync

#### When PO is Created (`draft` status)
**Action:** ❌ **NO inventory change**
- POs in draft don't affect inventory
- Only committed POs create inbound expectations

#### When PO is Approved (`approved` status)
**Action:** ⚠️ **OPTIONAL - Create "inbound" transaction**
- **Decision:** For MVP, we'll track inbound only when PO is `ordered` or `received`
- **Rationale:** Approved POs may not be ordered immediately
- **Future Enhancement:** Add `inbound_stock` tracking for approved POs

#### When PO is Ordered (`ordered` status)
**Action:** ✅ **Create INBOUND transaction (status: pending)**
- Transaction type: `PURCHASE_ORDER_INBOUND`
- Status: `pending` (not yet received)
- Quantity: Sum of all `purchase_order_lines.quantity` for this PO
- **Does NOT update `products.quantity_in_stock`** (not yet received)

#### When PO is Received (`received` status)
**Action:** ✅ **Complete INBOUND transaction and update stock**
- Find pending transaction for this PO
- Update transaction status to `completed`
- **Update `products.quantity_in_stock`** for each line item:
  ```sql
  UPDATE products 
  SET quantity_in_stock = quantity_in_stock + pol.quantity
  FROM purchase_order_lines pol
  WHERE products.id = pol.product_id
    AND pol.purchase_order_id = <po_id>
  ```
- Create completed transaction entries for each SKU

#### When PO is Cancelled (`cancelled` status)
**Action:** ✅ **Reverse any pending inbound transactions**
- If PO was `ordered`, cancel pending inbound transactions
- If PO was `received`, create reversal transactions (negative quantity_change)
- Update stock accordingly

#### Partial Receipts (Future Enhancement)
- Track `received_quantity` per `purchase_order_line`
- Create transactions only for received quantities
- Keep pending transactions for remaining quantities

**Implementation Location:**
- Hook into `lib/po/workflow-engine.ts` → `executeTransition()`
- Add inventory sync logic after status update
- Use database transactions to ensure atomicity

---

### 2.2 Order Inventory Sync

#### When Order is Created (`draft` status)
**Action:** ❌ **NO inventory change**
- Draft orders don't reserve stock
- Only submitted orders allocate stock

#### When Order is Submitted (`submitted` status)
**Action:** ✅ **Allocate stock (reserve)**
- Transaction type: `SALES_ORDER_ALLOCATED`
- Status: `completed`
- Quantity: Negative (reduces available stock)
- **Update `products.quantity_in_stock`** for each line item:
  ```sql
  UPDATE products 
  SET quantity_in_stock = quantity_in_stock - ol.quantity
  FROM order_lines ol
  WHERE products.id = ol.product_id
    AND ol.order_id = <order_id>
  ```
- **Validation:** Check stock availability before allocation
- **If insufficient stock:** Optionally allow negative stock (backorder) or reject submission

#### When Order is Fulfilled (`fulfilled` status)
**Action:** ✅ **Consume allocated stock (already consumed on submission)**
- **Note:** For MVP, we consume on submission, not on fulfillment
- **Future Enhancement:** Track allocated vs consumed separately
- For now, fulfillment is just a status change (no additional inventory impact)

#### When Order is Cancelled (`cancelled` status)
**Action:** ✅ **Release allocated stock**
- Find allocation transactions for this order
- Create reversal transactions (positive quantity_change)
- **Update `products.quantity_in_stock`** to restore stock:
  ```sql
  UPDATE products 
  SET quantity_in_stock = quantity_in_stock + ol.quantity
  FROM order_lines ol
  WHERE products.id = ol.product_id
    AND ol.order_id = <order_id>
  ```

#### Partial Fulfillments (Future Enhancement)
- Track `fulfilled_quantity` per `order_line`
- Only consume allocated stock for fulfilled quantities
- Keep allocation for remaining quantities

**Implementation Location:**
- Hook into `lib/orders/workflow-engine.ts` → `executeOrderTransition()`
- Add inventory sync logic after status update
- Use database transactions to ensure atomicity

---

### 2.3 Manual Inventory Adjustments

**New Feature:** Allow authorized users to manually adjust stock

**Transaction Type:** `MANUAL_ADJUSTMENT`

**API Endpoint:** `POST /api/inventory/adjust`

**Request Body:**
```json
{
  "product_id": "uuid",
  "sku": "SKU-001",
  "quantity_change": 10,  // Positive or negative
  "reason": "Stock count correction",
  "reference_number": "ADJ-2025-001",
  "notes": "Physical inventory count discrepancy"
}
```

**Validation:**
- Check user has permission (brand owner or super admin)
- Validate product exists and belongs to user's brand
- Validate stock won't go negative (unless explicitly allowed)
- Create transaction and update `products.quantity_in_stock`

**Implementation:**
- New API route: `app/api/inventory/adjust/route.ts`
- New service function: `lib/inventory/adjust-stock.ts`
- UI: Add "Adjust Stock" button on product detail page

---

### 2.4 Consistency & Idempotency

**Database Transactions:**
- Wrap inventory updates in database transactions
- Rollback if any step fails
- Ensure `inventory_transactions` and `products.quantity_in_stock` stay in sync

**Idempotency:**
- Check if transaction already exists before creating
- Use `source_type` + `source_id` + `transaction_type` as unique constraint
- Prevent duplicate transactions from repeated API calls

**Unique Constraint:**
```sql
CREATE UNIQUE INDEX idx_inventory_transactions_unique_source 
ON inventory_transactions(source_type, source_id, transaction_type, sku)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
```

**Error Handling:**
- Validate stock availability before allocation
- Handle concurrent updates (use row-level locking)
- Log errors for debugging

---

## C) Transaction List View (Inventory Journal)

### 3.1 Backend API Endpoint

**Endpoint:** `GET /api/inventory/transactions`

**Query Parameters:**
- `product_id` (UUID, optional) - Filter by product
- `sku` (string, optional) - Filter by SKU
- `transaction_type` (string, optional) - Filter by type
- `source_type` (string, optional) - Filter by source type
- `source_id` (UUID, optional) - Filter by source ID
- `date_from` (ISO date, optional) - Start date
- `date_to` (ISO date, optional) - End date
- `status` (string, optional) - Filter by status
- `brand_id` (UUID, optional) - Filter by brand (super admin only)
- `page` (number, default: 1) - Pagination
- `limit` (number, default: 50) - Items per page

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "sku": "SKU-001",
      "product_name": "Product Name",
      "transaction_type": "PURCHASE_ORDER_RECEIVED",
      "transaction_date": "2025-11-12T10:00:00Z",
      "source_type": "purchase_order",
      "source_id": "uuid",
      "reference_number": "PO-001",
      "quantity_change": 100,
      "quantity_before": 50,
      "quantity_after": 150,
      "status": "completed",
      "notes": "Received from supplier",
      "created_by": "uuid",
      "created_at": "2025-11-12T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

**Implementation:**
- File: `app/api/inventory/transactions/route.ts`
- Use Supabase query with filters
- Apply RLS automatically via Supabase client

---

### 3.2 Frontend Component

**Component:** `components/inventory/inventory-transactions-list.tsx`

**Features:**
- Table view with columns:
  - Date/Time
  - SKU
  - Product Name
  - Transaction Type (badge)
  - Source (PO/Order number with link)
  - Quantity Change (+/- with color)
  - Stock Before → After
  - Status
  - User
  - Actions (view details)
- Filters:
  - Product/SKU search
  - Transaction type dropdown
  - Date range picker
  - Source type filter
- Sorting:
  - Default: Date DESC (newest first)
  - Sortable: Date, SKU, Quantity Change
- Pagination:
  - Server-side pagination
  - Page size selector (25, 50, 100)

**Hook:** `hooks/use-inventory-transactions.ts`
- TanStack Query for caching
- Filter state management
- Pagination handling

---

### 3.3 Page Location

**Option 1:** Dedicated page (Recommended)
- Route: `/inventory/transactions`
- Add to sidebar menu: "Inventory" → "Transactions"
- Full-page view with filters and table

**Option 2:** Tab in Inventory page
- Add "Transactions" tab to `/inventory` page
- Share same layout as dashboard

**Recommendation:** Option 1 (dedicated page) for better UX and scalability

---

## D) Product Page Integration (Stock per SKU)

### 4.1 Enhance Product Detail Page

**File:** `components/products/product-details-content.tsx`

**Current Display:**
- ✅ Shows `quantity_in_stock`
- ✅ Shows stock status badge
- ✅ Shows reorder level

**Enhancements:**

1. **Add Stock Breakdown Section:**
   ```
   Inventory Breakdown:
   - On Hand: 150 units
   - Allocated: 25 units (from orders)
   - Available: 125 units
   - Inbound: 50 units (from POs)
   ```
   **Note:** For MVP, show only "On Hand". Add allocated/inbound in Phase 2.

2. **Add Transaction History Link:**
   - Button: "View Transaction History"
   - Links to: `/inventory/transactions?sku={product.sku}`
   - Opens transaction list with SKU filter pre-applied

3. **Add Recent Transactions Widget:**
   - Show last 5 transactions for this product
   - Mini table with: Date, Type, Quantity Change, Source
   - Link to full history

**API Endpoint:** `GET /api/inventory/transactions?sku={sku}&limit=5`

---

### 4.2 Product List Enhancement

**File:** `components/products/products-list.tsx`

**Enhancements:**
- Add "Stock" column showing `quantity_in_stock`
- Color-code based on stock status (green/yellow/red)
- Add tooltip showing reorder level
- Make stock clickable → link to transaction history

---

## E) POs & Orders UI Changes

### 5.1 Purchase Order Detail Page

**File:** `components/purchase-orders/po-details.tsx`

**Enhancements:**

1. **Add Inventory Impact Section:**
   - Show for each PO line:
     - Quantity ordered
     - Quantity received (if partially received)
     - Stock impact: "+X units" when received
   - Show overall status: "Will add 150 units to stock when received"

2. **Add Transaction History Link:**
   - Button: "View Inventory Transactions"
   - Links to: `/inventory/transactions?source_type=purchase_order&source_id={po.id}`
   - Shows all transactions related to this PO

3. **Status-Based Display:**
   - `ordered`: Show "Inbound: +X units (pending receipt)"
   - `received`: Show "Received: +X units added to stock"
   - `cancelled`: Show "Cancelled: No stock impact"

**API Endpoint:** `GET /api/inventory/transactions?source_type=purchase_order&source_id={po_id}`

---

### 5.2 Order Detail Page

**File:** `components/orders/order-details.tsx`

**Enhancements:**

1. **Add Stock Allocation Section:**
   - Show for each order line:
     - Quantity ordered
     - Stock allocated: "-X units" (if submitted)
     - Stock consumed: "-X units" (if fulfilled)
   - Show overall status: "Allocated 25 units from stock"

2. **Add Transaction History Link:**
   - Button: "View Inventory Transactions"
   - Links to: `/inventory/transactions?source_type=order&source_id={order.id}`
   - Shows all transactions related to this order

3. **Status-Based Display:**
   - `submitted`: Show "Stock Allocated: -X units"
   - `fulfilled`: Show "Stock Consumed: -X units"
   - `cancelled`: Show "Stock Released: +X units"

**API Endpoint:** `GET /api/inventory/transactions?source_type=order&source_id={order_id}`

---

## F) Permissions & Roles

### 6.1 View Permissions

**Who can view inventory transactions:**
- ✅ Brand owners/users - Their brand's transactions
- ✅ Distributor admins - Transactions for their distributor's orders/POs
- ✅ Super admins - All transactions

**RLS Policy:** Already handled by `brand_id` scoping

---

### 6.2 Manual Adjustment Permissions

**Who can perform manual adjustments:**
- ✅ Brand owners/users - Their brand's products
- ✅ Super admins - All products
- ❌ Distributor admins - **NO** (distributors don't manage inventory)

**Implementation:**
- Check in API endpoint: `app/api/inventory/adjust/route.ts`
- Verify user role and brand_id match

---

### 6.3 Stock Visibility

**Who can view stock levels:**
- ✅ All roles - Can view stock on product pages
- ✅ All roles - Can view inventory summary dashboard
- ✅ All roles - Can view transaction history (scoped to their access)

**Rationale:** Stock visibility is informational, not sensitive

---

## G) Edge Cases & Data Migration

### 7.1 Historical Data Handling

**Problem:** Existing Orders/POs created before inventory ledger

**Options:**

**Option A: Start Fresh (Recommended for MVP)**
- Don't backfill historical transactions
- Start tracking from "now" (when ledger is deployed)
- Current `products.quantity_in_stock` becomes the baseline
- **Pros:** Simple, fast, no data integrity risks
- **Cons:** No history for past transactions

**Option B: Backfill Historical Data**
- Create transactions for all historical Orders/POs
- Calculate stock levels retroactively
- **Pros:** Complete history
- **Cons:** Complex, time-consuming, potential errors

**Recommendation:** Option A (Start Fresh)
- Add backfill script as optional Phase 2 feature
- Document current stock levels as baseline

---

### 7.2 Order Cancellations

**Scenario:** Order cancelled after stock allocated

**Handling:**
- Find allocation transaction(s) for cancelled order
- Create reversal transaction(s) with positive `quantity_change`
- Update `products.quantity_in_stock` to restore stock
- Mark original transaction as `reversed` (or create new reversal transaction)

**Implementation:**
- Hook into order cancellation workflow
- Create reversal transactions automatically

---

### 7.3 PO Cancellations

**Scenario:** PO cancelled after stock received

**Handling:**
- Find receipt transaction(s) for cancelled PO
- Create reversal transaction(s) with negative `quantity_change`
- Update `products.quantity_in_stock` to reduce stock
- Mark original transaction as `reversed`

**Note:** This is rare - usually POs are cancelled before receipt

---

### 7.4 Partial Receipts/Deliveries

**Current Limitation:** MVP assumes full receipt/delivery

**Future Enhancement:**
- Track `received_quantity` per `purchase_order_line`
- Track `fulfilled_quantity` per `order_line`
- Create transactions only for received/fulfilled quantities

**For MVP:** Assume full quantities

---

### 7.5 Stock Corrections

**Scenario:** Physical inventory count reveals discrepancy

**Handling:**
- Use manual adjustment feature
- Create `CORRECTION` transaction
- Update `products.quantity_in_stock`
- Document reason in transaction notes

---

### 7.6 Concurrent Updates

**Problem:** Multiple users updating stock simultaneously

**Handling:**
- Use database row-level locking
- Use optimistic locking (check `updated_at` before update)
- Wrap in database transactions
- Handle conflicts gracefully (retry or error)

---

### 7.7 Data Migration Script

**Migration:** `037_backfill_initial_stock.sql` (Optional)

**Purpose:** Set baseline stock levels if needed

**Script:**
```sql
-- Optional: Create initial stock snapshot
-- This would be run once to establish baseline
-- For MVP, we'll use current products.quantity_in_stock as baseline
```

**Recommendation:** Skip for MVP, add later if needed

---

## H) Implementation Steps (Ordered)

### Phase 1: Database Schema (Week 1)

1. ✅ Create `inventory_transactions` table (Migration `035`)
2. ✅ Create indexes and RLS policies
3. ✅ Create helper functions (Migration `036`)
4. ✅ Test schema with sample data

---

### Phase 2: Backend Logic - PO Sync (Week 1-2)

5. ✅ Enhance PO workflow engine to create transactions
6. ✅ Implement "ordered" → inbound transaction
7. ✅ Implement "received" → stock update + complete transaction
8. ✅ Implement "cancelled" → reversal transaction
9. ✅ Test PO workflow with inventory sync

---

### Phase 3: Backend Logic - Order Sync (Week 2)

10. ✅ Enhance Order workflow engine to create transactions
11. ✅ Implement "submitted" → stock allocation
12. ✅ Implement "cancelled" → stock release
13. ✅ Test Order workflow with inventory sync

---

### Phase 4: Manual Adjustments (Week 2)

14. ✅ Create API endpoint for manual adjustments
15. ✅ Implement validation and permissions
16. ✅ Test manual adjustments

---

### Phase 5: Transaction List API (Week 2-3)

17. ✅ Create API endpoint for transaction list
18. ✅ Implement filtering and pagination
19. ✅ Test API with various filters

---

### Phase 6: Frontend - Transaction List (Week 3)

20. ✅ Create transaction list component
21. ✅ Create hook for transaction queries
22. ✅ Add transaction list page
23. ✅ Add to sidebar menu
24. ✅ Test UI with real data

---

### Phase 7: Frontend - Product Integration (Week 3)

25. ✅ Enhance product detail page with transaction link
26. ✅ Add recent transactions widget
27. ✅ Enhance product list with stock display
28. ✅ Test product page integration

---

### Phase 8: Frontend - PO/Order Integration (Week 3-4)

29. ✅ Enhance PO detail page with inventory impact
30. ✅ Enhance Order detail page with stock allocation
31. ✅ Add transaction history links
32. ✅ Test PO/Order pages

---

### Phase 9: Testing & Documentation (Week 4)

33. ✅ End-to-end testing: PO → Receive → Stock Increase → Order → Fulfill → Stock Decrease
34. ✅ Test edge cases (cancellations, partial receipts)
35. ✅ Performance testing (large transaction history)
36. ✅ Write documentation
37. ✅ User training materials

---

## I) Assumptions & Open Questions

### Assumptions Made:

1. **Current Stock Storage:** Keep `products.quantity_in_stock` as denormalized field
2. **Stock Allocation:** Allocate on order submission, not creation
3. **Stock Consumption:** Consume on order submission (not fulfillment) for MVP
4. **Partial Operations:** Not supported in MVP (assume full quantities)
5. **Historical Data:** Start fresh, don't backfill
6. **Negative Stock:** Not allowed in MVP (reject if insufficient stock)
7. **Warehouse Dimension:** Not in MVP scope (single warehouse assumed)

---

### Open Questions for Review:

1. **Q: Should we track allocated vs available stock separately?**
   - **Recommendation:** Not in MVP, add in Phase 2
   - **Impact:** Simpler implementation, less accurate "available" stock

2. **Q: Should stock be consumed on order submission or fulfillment?**
   - **Recommendation:** Submission (simpler, matches allocation)
   - **Alternative:** Track allocated separately, consume on fulfillment

3. **Q: Should we support partial receipts for POs?**
   - **Recommendation:** Not in MVP, add in Phase 2
   - **Impact:** Simpler implementation, less flexible

4. **Q: Should we allow negative stock (backorders)?**
   - **Recommendation:** Not in MVP, add in Phase 2
   - **Impact:** Simpler validation, less flexible ordering

5. **Q: Where should transaction list live?**
   - **Recommendation:** Dedicated `/inventory/transactions` page
   - **Alternative:** Tab in inventory dashboard

6. **Q: Should distributors see inventory transactions?**
   - **Recommendation:** Yes, for their orders/POs only
   - **Impact:** Better transparency for distributors

---

## J) Success Criteria

### Functional Requirements:

- ✅ Every PO receipt creates inventory transaction
- ✅ Every order submission allocates stock and creates transaction
- ✅ Every order cancellation releases stock and creates transaction
- ✅ Manual adjustments create transactions
- ✅ Transaction list shows all stock movements
- ✅ Product pages show current stock and link to history
- ✅ PO/Order pages show inventory impact

### Performance Requirements:

- ✅ Transaction list loads in < 2 seconds (with pagination)
- ✅ Stock updates complete in < 500ms
- ✅ Product page loads in < 1 second (with transaction history)

### Quality Requirements:

- ✅ No data loss (all transactions recorded)
- ✅ Stock levels always accurate
- ✅ No race conditions (concurrent updates handled)
- ✅ Proper error handling and user feedback

---

## K) Risks & Mitigations

### Risk 1: Data Inconsistency
**Mitigation:** Use database transactions, validate before updates

### Risk 2: Performance Issues
**Mitigation:** Proper indexing, pagination, consider materialized views

### Risk 3: Concurrent Updates
**Mitigation:** Row-level locking, optimistic locking

### Risk 4: Historical Data Gaps
**Mitigation:** Document baseline, optional backfill script

### Risk 5: Complex Edge Cases
**Mitigation:** Start simple (MVP), add complexity in Phase 2

---

## L) Future Enhancements (Post-MVP)

1. **Stock Breakdown:** Track allocated, inbound, available separately
2. **Partial Operations:** Support partial receipts and fulfillments
3. **Warehouse Dimension:** Multi-warehouse support
4. **Negative Stock:** Allow backorders
5. **Stock Alerts:** Real-time alerts for low stock
6. **Inventory Reports:** Advanced reporting and analytics
7. **Bulk Adjustments:** Adjust multiple products at once
8. **Audit Trail:** Enhanced audit logging
9. **Stock Transfers:** Transfer stock between warehouses
10. **Cycle Counting:** Physical inventory count workflows

---

## M) Approval Checklist

Before implementation begins, confirm:

- [ ] Data model approved (inventory_transactions table structure)
- [ ] Transaction types approved
- [ ] PO sync logic approved (when to create transactions)
- [ ] Order sync logic approved (when to allocate/consume)
- [ ] Manual adjustments approved (permissions, UI)
- [ ] Transaction list UI approved (page location, filters)
- [ ] Product page enhancements approved
- [ ] PO/Order page enhancements approved
- [ ] Historical data strategy approved (start fresh vs backfill)
- [ ] Open questions answered

---

**End of Implementation Plan**

**Status:** 📋 **AWAITING APPROVAL**

Please review this plan and provide feedback or approval before implementation begins.

