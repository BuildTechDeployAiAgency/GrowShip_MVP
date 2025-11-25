# Inventory System Inspection Report

**Date:** November 12, 2025  
**Purpose:** Comprehensive inspection of existing codebase before designing inventory ledger system  
**Status:** ✅ Complete - Ready for Plan Design

---

## Executive Summary

The codebase has a solid foundation for inventory management with:
- ✅ Products table with `quantity_in_stock` field
- ✅ Purchase Orders (POs) with normalized `purchase_order_lines` table
- ✅ Orders with normalized `order_lines` table
- ✅ PO workflow engine with status transitions
- ✅ Order workflow engine with status transitions
- ✅ Basic inventory summary functions and dashboard
- ❌ **NO inventory transaction ledger** (this is what we need to build)
- ❌ **NO automatic inventory sync** with PO/Order status changes

---

## A) Data Model / Database Schema

### 1. Products / SKUs

**Table:** `products` (Migration `008_create_products_table.sql`)

**Key Fields:**
- `id` (UUID, PK)
- `brand_id` (UUID, FK to brands)
- `sku` (VARCHAR(100), UNIQUE, NOT NULL)
- `product_name` (VARCHAR(255), NOT NULL)
- `quantity_in_stock` (INTEGER, DEFAULT 0, CHECK >= 0) ⭐ **Current stock field**
- `reorder_level` (INTEGER, DEFAULT 0)
- `reorder_quantity` (INTEGER, DEFAULT 0)
- `unit_price`, `cost_price`, `currency`
- `status` (ENUM: active, inactive, discontinued, out_of_stock)
- `created_at`, `updated_at`, `created_by`, `updated_by`

**Indexes:**
- `idx_products_brand_id`
- `idx_products_sku`
- `idx_products_status`
- `idx_products_category`

**RLS:** ✅ Enabled with brand-scoped policies + super admin access

**Status:** ✅ Fully implemented and functional

---

### 2. Purchase Orders

**Table:** `purchase_orders` (Migrations `002`, `004`, `019`)

**Key Fields:**
- `id` (UUID, PK)
- `brand_id` (UUID, FK, NOT NULL)
- `distributor_id` (UUID, FK, NULL)
- `po_number` (VARCHAR, UNIQUE, NOT NULL)
- `po_status` (ENUM: draft, submitted, approved, rejected, ordered, received, cancelled)
- `items` (JSONB, NOT NULL) - Legacy format
- `submitted_at`, `approved_at`, `approved_by`
- `expected_delivery_date`, `actual_delivery_date`
- `total_amount`, `currency`
- `created_at`, `updated_at`

**Status Transitions:**
- `draft` → `submitted` → `approved` → `ordered` → `received`
- Can cancel from: draft, submitted, approved, ordered

**Normalized Lines Table:** `purchase_order_lines` (Migration `031`)

**Key Fields:**
- `id` (UUID, PK)
- `purchase_order_id` (UUID, FK, NOT NULL)
- `product_id` (UUID, FK, NULL) ⭐ **Links to products**
- `sku` (VARCHAR(100), NOT NULL)
- `product_name` (VARCHAR(255))
- `quantity` (NUMERIC(10,2), CHECK >= 0) ⭐ **Quantity ordered**
- `unit_price` (NUMERIC(10,2), CHECK >= 0)
- `total` (NUMERIC(10,2), GENERATED)
- `currency` (VARCHAR(3), DEFAULT 'USD')
- `created_at`, `updated_at`

**Indexes:**
- `idx_purchase_order_lines_po_id`
- `idx_purchase_order_lines_product_id`
- `idx_purchase_order_lines_sku`

**RLS:** ✅ Enabled with brand/distributor policies

**Status:** ✅ Fully implemented with workflow engine

---

### 3. Orders

**Table:** `orders` (Migrations `002`, `033`)

**Key Fields:**
- `id` (UUID, PK)
- `brand_id` (UUID, FK, NOT NULL)
- `distributor_id` (UUID, FK, NULL)
- `purchase_order_id` (UUID, FK, NULL) ⭐ **Links to parent PO**
- `order_number` (VARCHAR, UNIQUE, NOT NULL)
- `order_status` (ENUM: pending, confirmed, processing, shipped, delivered, cancelled)
- `items` (JSONB, NOT NULL) - Legacy format
- `total_amount` (NUMERIC, CHECK >= 0)
- `actual_delivery_date` (TIMESTAMPTZ)
- `created_at`, `updated_at`, `created_by`, `updated_by`

**Status Transitions:**
- `draft` → `submitted` → `fulfilled` (simplified workflow)
- Can cancel from: draft, submitted

**Normalized Lines Table:** `order_lines` (Migration `032`)

**Key Fields:**
- `id` (UUID, PK)
- `order_id` (UUID, FK, NOT NULL)
- `product_id` (UUID, FK, NULL) ⭐ **Links to products**
- `sku` (VARCHAR(100), NOT NULL)
- `product_name` (VARCHAR(255))
- `quantity` (NUMERIC(10,2), CHECK >= 0) ⭐ **Quantity ordered**
- `unit_price` (NUMERIC(10,2), CHECK >= 0)
- `discount`, `tax` (NUMERIC(10,2), DEFAULT 0)
- `total` (NUMERIC(10,2), GENERATED)
- `currency` (VARCHAR(3), DEFAULT 'USD')
- `created_at`, `updated_at`

**Indexes:**
- `idx_order_lines_order_id`
- `idx_order_lines_product_id`
- `idx_order_lines_sku`
- `idx_order_lines_created_at`

**RLS:** ✅ Enabled with brand/distributor policies

**Status:** ✅ Fully implemented with workflow engine

---

### 4. Inventory-Related Tables

**Current State:**
- ❌ **NO `inventory_transactions` table** (needs to be created)
- ❌ **NO `inventory_ledger` table** (needs to be created)
- ❌ **NO `stock_levels` table** (current stock is denormalized in `products.quantity_in_stock`)

**Existing Functions:** (Migration `017_create_inventory_functions.sql`)
- `get_inventory_summary(p_brand_id)` - Returns summary stats
- `get_low_stock_products(p_brand_id)` - Returns products at/below reorder level
- `get_upcoming_shipments(p_brand_id, p_days_ahead)` - Returns POs with expected deliveries

**Status:** ✅ Functions exist, but no transaction tracking

---

## B) Backend Services / Modules

### 1. Purchase Order Workflow Engine

**File:** `lib/po/workflow-engine.ts`

**Key Functions:**
- `executeTransition(poId, userId, action, comments)` - Handles status changes
- `checkPermission(userId, poId, action)` - Authorization checks

**Status Transitions Handled:**
- `submit` → Sets `submitted_at`
- `approve` → Sets `approved_at`, `approved_by`
- `reject` → Sets `rejection_reason`
- `order` → Changes status to `ordered`
- `receive` → Changes status to `received`
- `cancel` → Changes status to `cancelled`

**Current Behavior:**
- ✅ Updates PO status
- ✅ Creates history entry in `po_approval_history`
- ❌ **NO inventory impact** (does not adjust stock)

**API Endpoints:**
- `POST /api/purchase-orders/[id]/approve`
- `POST /api/purchase-orders/[id]/cancel`
- `POST /api/purchase-orders/[id]/create-order`

**Status:** ✅ Functional, but missing inventory sync

---

### 2. Order Workflow Engine

**File:** `lib/orders/workflow-engine.ts`

**Key Functions:**
- `executeOrderTransition(orderId, userId, action, notes)` - Handles status changes
- `checkPermission(userId, orderId, action)` - Authorization checks
- `validateNewOrderWithPO(orderData)` - Validates PO linkage

**Status Transitions Handled:**
- `submit` → Changes status to `submitted`
- `fulfill` → Changes status to `fulfilled`, sets `actual_delivery_date`
- `cancel` → Changes status to `cancelled`

**Current Behavior:**
- ✅ Updates order status
- ✅ Validates PO linkage
- ❌ **NO inventory impact** (does not allocate or consume stock)

**Status:** ✅ Functional, but missing inventory sync

---

### 3. Inventory API Endpoints

**Existing Endpoints:**

1. **`GET /api/inventory/summary`**
   - Calls `get_inventory_summary()` function
   - Returns: total_products, total_value, low_stock_count, out_of_stock_count

2. **`GET /api/inventory/alerts`**
   - Calls `get_low_stock_products()` function
   - Returns: List of products at/below reorder level

3. **`GET /api/inventory/upcoming-shipments`**
   - Calls `get_upcoming_shipments()` function
   - Returns: List of POs with expected deliveries

**Missing Endpoints:**
- ❌ `GET /api/inventory/transactions` - List inventory transactions
- ❌ `POST /api/inventory/adjust` - Manual stock adjustment
- ❌ `GET /api/inventory/stock/[sku]` - Get current stock per SKU

**Status:** ✅ Basic endpoints exist, transaction endpoints missing

---

## C) Frontend Components / Pages

### 1. Inventory Page

**File:** `app/inventory/page.tsx`

**Component:** `components/inventory/inventory-dashboard.tsx`

**Features:**
- ✅ Summary cards (Total Products, Total Value, Low Stock, Out of Stock)
- ✅ Low Stock Alerts list
- ✅ Upcoming Shipments list
- ❌ **NO transaction list view**
- ❌ **NO manual adjustment UI**

**Status:** ✅ Basic dashboard exists, transaction view missing

---

### 2. Products Page

**File:** `app/products/page.tsx`

**Components:**
- `components/products/products-list.tsx` - List view
- `components/products/product-form-dialog.tsx` - Create/edit form
- `components/products/product-details-content.tsx` - Detail view

**Current Stock Display:**
- ✅ Shows `quantity_in_stock` in product details
- ✅ Shows stock status badge (In Stock / Low Stock / Out of Stock)
- ✅ Shows reorder level and reorder quantity
- ❌ **NO link to transaction history**
- ❌ **NO breakdown** (on-hand, allocated, inbound)

**Status:** ✅ Product pages exist, inventory integration incomplete

---

### 3. Purchase Orders Page

**File:** `app/purchase-orders/page.tsx`

**Components:**
- `components/purchase-orders/po-list.tsx` - List view
- `components/purchase-orders/po-details.tsx` - Detail view
- `components/purchase-orders/po-form-dialog.tsx` - Create/edit form
- `components/purchase-orders/po-actions-menu.tsx` - Actions menu

**Current Features:**
- ✅ Shows PO status, items, totals
- ✅ Workflow actions (approve, cancel, receive)
- ✅ History timeline
- ❌ **NO inventory impact display**
- ❌ **NO link to inventory transactions**

**Status:** ✅ PO pages exist, inventory integration missing

---

### 4. Orders Page

**File:** `app/orders/page.tsx`

**Components:**
- `components/orders/orders-list.tsx` - List view
- `components/orders/order-details.tsx` - Detail view
- `components/orders/order-form-dialog.tsx` - Create/edit form

**Current Features:**
- ✅ Shows order status, items, totals
- ✅ Workflow actions (submit, fulfill, cancel)
- ❌ **NO stock allocation display**
- ❌ **NO link to inventory transactions**

**Status:** ✅ Order pages exist, inventory integration missing

---

## D) Role & Permissions

### Current Role System

**Roles:** (from `user_profiles` table)
- `super_admin` - Full access to all brands
- `brand` - Access to their brand's data
- `distributor` - Access to their distributor's data
- `manufacturer` - Access to manufacturer data

**RLS Policies:**
- ✅ Brand-scoped access for products, orders, POs
- ✅ Distributor-scoped access for their orders/POs
- ✅ Super admin override for all tables

**Current Inventory Permissions:**
- ✅ All roles can view inventory summary (via RLS)
- ✅ Brand users can view their products' stock
- ❌ **NO explicit permissions** for manual adjustments
- ❌ **NO explicit permissions** for viewing transactions

**Status:** ✅ RLS foundation exists, inventory-specific permissions need definition

---

## E) Key Findings Summary

### ✅ What Exists:
1. **Products table** with `quantity_in_stock` field
2. **Normalized line items** for POs and Orders
3. **Workflow engines** for PO and Order status transitions
4. **Basic inventory functions** for summary and alerts
5. **Frontend pages** for Products, POs, Orders, Inventory
6. **RLS policies** for brand/distributor scoping

### ❌ What's Missing:
1. **Inventory transaction ledger** table
2. **Automatic inventory sync** when PO/Order status changes
3. **Stock allocation** system (reserved vs available)
4. **Transaction list view** UI
5. **Manual adjustment** functionality
6. **Inventory impact display** on PO/Order detail pages
7. **Transaction history link** from product pages

---

## F) Assumptions & Notes

### Assumptions:
1. Current `products.quantity_in_stock` represents **on-hand stock** (not allocated)
2. Orders should **allocate stock** when created/submitted (reserve it)
3. Orders should **consume stock** when fulfilled/delivered (reduce on-hand)
4. POs should **add to inbound** when created/approved (not yet received)
5. POs should **add to on-hand** when received (actual receipt)
6. Historical Orders/POs exist before ledger - need to decide on backfill strategy

### Open Questions:
1. Should we support **partial receipts** for POs? (Yes, likely needed)
2. Should we support **partial fulfillments** for Orders? (Yes, likely needed)
3. Should stock be **allocated on order creation** or **on order submission**? (Recommend: submission)
4. Should we track **warehouse/location** dimension? (Recommend: Not in MVP, add later)
5. Should we support **negative stock** (backorders)? (Recommend: No in MVP, add later)
6. How to handle **historical data**? (Recommend: Start from "now", optionally backfill)

---

## Next Steps

1. ✅ **Inspection Complete** - This report
2. ⏳ **Design Plan** - Create step-by-step implementation plan
3. ⏳ **Get Approval** - Review plan with stakeholders
4. ⏳ **Implementation** - Execute approved plan

---

**End of Inspection Report**

