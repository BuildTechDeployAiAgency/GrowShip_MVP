# Testing Purchase Orders Approval

**Date:** January 2025  
**Feature:** Purchase Order Approval System  
**Status:** ✅ Complete Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Implemented Features Summary](#implemented-features-summary)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Feature Details & Triggers](#feature-details--triggers)
5. [Step-by-Step Testing Guide](#step-by-step-testing-guide)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Overview

The Purchase Order Approval system provides a comprehensive workflow for reviewing, approving, and processing purchase orders with stock-aware line-item approvals, backorder handling, role-based overrides, and full integration with Notifications, Calendar, and Inventory modules.

### Key Capabilities

- **Stock-Aware Approvals**: Real-time stock validation for each line item
- **Line-Level Decisions**: Approve, reject, split, or backorder individual line items
- **Stock Overrides**: Privileged roles can override stock restrictions with audit trail
- **Automatic Backorders**: Track backordered quantities separately for future fulfillment
- **Order Generation**: Automatically create orders from approved PO lines
- **Inventory Deduction**: Real-time stock deduction when orders are created
- **Notifications**: Alerts for PO review, approvals, backorders, and stock warnings
- **Calendar Integration**: Auto-create events for delivery dates
- **Full Audit Trail**: Track all approval decisions, overrides, and order generation

---

## Implemented Features Summary

### 1. **PO Status Workflow**

- **Status Flow**: `draft → submitted → approved/rejected → ordered → received`
- **Cancellation**: Can cancel at `draft`, `submitted`, `approved`, or `ordered` status
- **Status Transitions**: Enforced through workflow engine with permission checks

### 2. **Stock Validation**

- **Real-time Stock Check**: Validates available stock against requested quantities
- **Stock Status Indicators**:
  - ✅ **Sufficient** (Green): Stock >= requested quantity
  - ⚠️ **Partial** (Yellow): Stock > 0 but < requested quantity
  - ❌ **Insufficient** (Red): Stock = 0
- **Automatic Caching**: Stock levels cached in `available_stock` column at review time

### 3. **Line-Item Approval**

- **Individual Line Approval**: Approve/reject/split individual line items
- **Bulk Approval**: Approve multiple eligible lines at once
- **Quantity Splitting**: Split requested quantity into approved + backorder + rejected
- **Line Status Tracking**: `pending`, `approved`, `partially_approved`, `backordered`, `rejected`, `cancelled`

### 4. **Stock Override System**

- **Override Authorization**: Only `super_admin` and `brand_admin` can override
- **Override Audit Trail**: All overrides require reason and are logged
- **Override Tracking**: Records who, when, and why override was applied

### 5. **Backorder Management**

- **Automatic Backorder Creation**: Creates backorder records for unfulfilled quantities
- **Backorder Tracking**: Separate table (`po_backorders`) tracks backordered items
- **Backorder Notifications**: Alerts created when backorders are generated

### 6. **Order Generation**

- **Automatic Order Creation**: Creates orders from approved PO lines on finalization
- **Inventory Deduction**: Real-time stock deduction when orders are created
- **Low Stock Alerts**: Triggers alerts when stock drops below reorder level
- **Order Linking**: Orders linked back to PO via `purchase_order_id` and `source_po_line_id`

### 7. **Notification System**

- **PO Review Required**: High priority notification to approvers when PO is submitted
- **PO Approved**: Medium priority notification to PO creator
- **PO Partially Approved**: High priority notification with fulfillment percentage
- **Backorder Created**: Medium priority notification
- **Stock Override Applied**: Urgent priority notification to brand admins
- **Low Stock Alert**: High priority notification to inventory managers

### 8. **Calendar Integration**

- **Delivery Events**: Auto-creates calendar events for expected delivery dates
- **Event Types**: `po_delivery`, `po_review_deadline`, `backorder_fulfillment`

### 9. **Audit Trail**

- **Approval History**: Complete history in `po_approval_history` table
- **Action Tracking**: Records all actions (submitted, approved, rejected, cancelled)
- **Actor Tracking**: Records who performed each action
- **Comments**: Optional comments/reasons for each action
- **Override Logging**: Special tracking for stock overrides

---

## User Roles & Permissions

### Role-Based Access Matrix

| Action                 | super_admin     | brand_admin         | brand_manager        | brand_user | Others       |
| ---------------------- | --------------- | ------------------- | -------------------- | ---------- | ------------ |
| **View PO**            | ✅              | ✅                  | ✅                   | ✅         | ✅ (via RLS) |
| **Create PO**          | ✅              | ✅                  | ✅                   | ✅         | ❌           |
| **Edit Draft PO**      | ✅              | ✅                  | ✅                   | ❌         | ❌           |
| **Submit PO**          | ✅              | ✅                  | ✅                   | ✅         | ❌           |
| **Approve PO**         | ✅              | ✅                  | ✅                   | ❌         | ❌           |
| **Reject PO**          | ✅              | ✅                  | ✅                   | ❌         | ❌           |
| **Override Stock**     | ✅              | ✅                  | ❌                   | ❌         | ❌           |
| **Cancel PO**          | ✅ (any status) | ✅ (before ordered) | ✅ (draft/submitted) | ❌         | ❌           |
| **Create Orders**      | ✅              | ✅                  | ✅                   | ❌         | ❌           |
| **Approve Line Items** | ✅              | ✅                  | ✅                   | ❌         | ❌           |
| **Cancel Line Items**  | ✅              | ✅                  | ✅                   | ❌         | ❌           |

### Business Rules

1. **Self-Approval Block**: Users cannot approve their own POs
2. **Stock Validation**: By default, `approved_qty` cannot exceed `available_stock`
3. **Override Authorization**: Only `super_admin` and `brand_admin` can override stock restrictions
4. **Override Audit**: All overrides require reason and are logged in audit trail
5. **Quantity Validation**: `approved_qty + backorder_qty + rejected_qty = requested_qty`
6. **Status Restriction**: Can only edit POs in `draft` or `submitted` status
7. **Complete Review**: All lines must be reviewed before finalizing approval

---

## Feature Details & Triggers

### Feature 1: PO Submission

**Trigger**: User clicks "Submit for Approval" button in PO actions menu

**Who Can Trigger**:

- `super_admin`
- `brand_admin`
- `brand_manager`
- `brand_user` (PO creator)

**Prerequisites**:

- PO status must be `draft`
- PO must have at least one line item

**What Happens**:

1. PO status changes from `draft` → `submitted`
2. `submitted_at` timestamp is set
3. Approval history entry created
4. High priority notification sent to approvers (`super_admin`, `brand_admin`, `brand_manager`)
5. Notification includes link to review the PO

**API Endpoint**: `POST /api/purchase-orders/[id]/approve` (via workflow engine)

**Testing Steps**:

1. Login as `brand_user` or `brand_manager`
2. Create a new PO or open existing draft PO
3. Add line items with products
4. Click "Submit for Approval" in actions menu
5. Verify PO status changes to `submitted`
6. Verify notification appears for approvers
7. Verify `submitted_at` timestamp is set

---

### Feature 2: Stock Validation

**Trigger**: Automatically when PO review modal opens OR manually via API

**Who Can Trigger**:

- Any user with approval permissions viewing PO details
- Automatic on PO review modal open

**What Happens**:

1. Fetches current stock levels for all SKUs in PO lines
2. Compares stock vs requested quantity for each line
3. Caches stock level in `available_stock` column
4. Returns validation results with stock status for each line
5. Provides suggestions for partial stock scenarios

**API Endpoint**: `POST /api/purchase-orders/[id]/validate-stock`

**Response Format**:

```json
{
  "validations": [
    {
      "line_id": "uuid",
      "sku": "SKU-001",
      "requested_qty": 100,
      "available_stock": 75,
      "stock_status": "partial",
      "can_approve": false,
      "suggestion": {
        "type": "split",
        "approved_qty": 75,
        "backorder_qty": 25
      }
    }
  ],
  "summary": {
    "total_lines": 5,
    "sufficient": 3,
    "partial": 1,
    "insufficient": 1,
    "can_approve_all": false
  }
}
```

**Testing Steps**:

1. Login as approver (`brand_admin` or `brand_manager`)
2. Open a submitted PO for review
3. Verify stock validation runs automatically
4. Check stock status indicators (green/yellow/red) for each line
5. Verify `available_stock` is cached in database
6. Test with different stock scenarios:
   - Sufficient stock (all items available)
   - Partial stock (some items partially available)
   - Insufficient stock (some items out of stock)

---

### Feature 3: Individual Line Approval

**Trigger**: User approves/rejects a single line item in PO review modal

**Who Can Trigger**:

- `super_admin`
- `brand_admin`
- `brand_manager`

**Prerequisites**:

- PO status must be `submitted`
- User must not be the PO creator (self-approval blocked)
- User must have approval permissions

**What Happens**:

1. Validates quantities: `approved_qty + backorder_qty + rejected_qty = requested_qty`
2. Checks stock availability (unless override applied)
3. Updates line status based on quantities:
   - All approved → `approved`
   - All backordered → `backordered`
   - All rejected → `rejected`
   - Mixed → `partially_approved`
4. Records override if stock restriction bypassed
5. Creates approval history entry
6. Updates PO totals

**API Endpoint**: `POST /api/purchase-orders/[id]/lines/[lineId]/approve`

**Request Body**:

```json
{
  "approved_qty": 75,
  "backorder_qty": 25,
  "rejected_qty": 0,
  "override_applied": false,
  "override_reason": "",
  "notes": "Splitting due to stock availability"
}
```

**Testing Steps**:

1. Login as `brand_admin` (not the PO creator)
2. Open a submitted PO for review
3. For a line item with partial stock:
   - Set `approved_qty` to available stock amount
   - Set `backorder_qty` to remainder
   - Add notes explaining the split
   - Click "Save" or "Approve Line"
4. Verify line status updates to `partially_approved`
5. Verify quantities are correctly split
6. Verify approval history entry created
7. Test with full approval (all stock available)
8. Test with full rejection
9. Test with full backorder

---

### Feature 4: Bulk Line Approval

**Trigger**: User clicks "Approve All Eligible" button in PO review modal

**Who Can Trigger**:

- `super_admin`
- `brand_admin`
- `brand_manager`

**Prerequisites**:

- PO status must be `submitted`
- User must not be the PO creator
- User must have approval permissions
- Lines must have sufficient stock (eligible for auto-approval)

**What Happens**:

1. Identifies all lines with sufficient stock (`can_approve: true`)
2. Creates approval decisions for eligible lines
3. Processes all decisions in a single transaction
4. Updates all lines simultaneously
5. Creates bulk approval history entry
6. Returns summary of processed/failed lines

**API Endpoint**: `POST /api/purchase-orders/[id]/lines/bulk-approve`

**Request Body**:

```json
{
  "line_decisions": [
    {
      "line_id": "uuid1",
      "approved_qty": 100,
      "backorder_qty": 0,
      "rejected_qty": 0,
      "override_applied": false,
      "notes": ""
    },
    {
      "line_id": "uuid2",
      "approved_qty": 50,
      "backorder_qty": 0,
      "rejected_qty": 0,
      "override_applied": false,
      "notes": ""
    }
  ],
  "comments": "Bulk approval applied"
}
```

**Testing Steps**:

1. Login as `brand_admin` (not the PO creator)
2. Open a submitted PO with multiple line items
3. Ensure some lines have sufficient stock
4. Click "Approve All Eligible" button
5. Verify all eligible lines are approved automatically
6. Verify lines with insufficient stock remain pending
7. Verify bulk approval history entry created
8. Verify success message shows count of processed lines

---

### Feature 5: Stock Override

**Trigger**: User applies stock override when approving line with insufficient stock

**Who Can Trigger**:

- `super_admin`
- `brand_admin` ONLY

**Prerequisites**:

- User must have override permissions
- Line must have insufficient stock
- Override reason must be provided

**What Happens**:

1. Validates user has override permission
2. Records override details:
   - `override_applied: true`
   - `override_by: user_id`
   - `override_reason: reason`
   - `override_at: timestamp`
3. Allows approval despite stock restriction
4. Creates urgent notification to brand admins
5. Logs override in approval history with special flag

**API Endpoint**: `POST /api/purchase-orders/[id]/lines/[lineId]/approve` (with `override_applied: true`)

**Request Body**:

```json
{
  "approved_qty": 100,
  "backorder_qty": 0,
  "rejected_qty": 0,
  "override_applied": true,
  "override_reason": "Customer priority order - stock will be replenished",
  "notes": "Override applied due to urgent customer requirement"
}
```

**Testing Steps**:

1. Login as `brand_admin` (not the PO creator)
2. Open a submitted PO with a line item that has insufficient stock (0 available)
3. Try to approve the line without override → Should fail
4. Click "Override Stock" button (if available in UI) or set `override_applied: true`
5. Enter override reason (required)
6. Approve the line
7. Verify override fields are set in database:
   - `override_applied: true`
   - `override_by` matches your user ID
   - `override_reason` contains your reason
   - `override_at` timestamp is set
8. Verify urgent notification sent to brand admins
9. Verify override logged in approval history
10. Test as `brand_manager` → Should NOT be able to override (permission denied)

---

### Feature 6: Finalize Approval

**Trigger**: User clicks "Finalize Approval" button after reviewing all lines

**Who Can Trigger**:

- `super_admin`
- `brand_admin`
- `brand_manager`

**Prerequisites**:

- PO status must be `submitted`
- User must not be the PO creator
- ALL line items must be reviewed (no `pending` status lines)
- User must have approval permissions

**What Happens**:

1. Validates all lines have been reviewed
2. Calculates PO totals:
   - `total_requested_qty`
   - `total_approved_qty`
   - `total_backordered_qty`
   - `fulfillment_percentage`
3. Determines final PO status:
   - All approved → `approved`
   - All rejected → `rejected`
   - Mixed → `approved` (partial approval)
4. Updates PO status and totals
5. Creates backorder records for lines with `backorder_qty > 0`
6. Generates orders from approved lines (if `create_orders: true`)
7. Deducts inventory for approved quantities
8. Creates calendar events for delivery dates
9. Sends notifications:
   - PO creator: Approval notification
   - Brand admins: Partial approval warning (if < 100% fulfillment)
   - Inventory managers: Low stock alerts (if triggered)
10. Updates approval history with order IDs and backorder references

**API Endpoint**: `POST /api/purchase-orders/[id]/approve-complete`

**Request Body**:

```json
{
  "create_orders": true,
  "comments": "PO approval finalized"
}
```

**Response**:

```json
{
  "success": true,
  "po": {
    /* updated PO */
  },
  "orders_created": 1,
  "order_ids": ["uuid"],
  "backorders_created": 2,
  "backorder_ids": ["uuid1", "uuid2"],
  "fulfillment_percentage": 85,
  "message": "Purchase order approved successfully"
}
```

**Testing Steps**:

1. Login as `brand_admin` (not the PO creator)
2. Open a submitted PO for review
3. Review all line items:
   - Approve some lines fully
   - Split some lines (approved + backorder)
   - Reject some lines (if needed)
4. Ensure all lines have status other than `pending`
5. Click "Finalize Approval" button
6. Verify PO status changes to `approved`
7. Verify PO totals are calculated correctly:
   - Check `total_requested_qty`
   - Check `total_approved_qty`
   - Check `total_backordered_qty`
   - Check `fulfillment_percentage`
8. Verify orders are created (check orders table)
9. Verify inventory is deducted (check products table `quantity_in_stock`)
10. Verify backorder records created (check `po_backorders` table)
11. Verify notifications sent:
    - PO creator receives approval notification
    - Low stock alerts if applicable
12. Verify calendar events created (if delivery date exists)
13. Verify approval history updated with order IDs

**Test Scenarios**:

- **Full Approval**: All lines approved, 100% fulfillment
- **Partial Approval**: Some lines split into approved + backorder
- **Mixed Approval**: Some approved, some rejected
- **Full Rejection**: All lines rejected (should go to `rejected` status)

---

### Feature 7: PO Rejection

**Trigger**: User clicks "Reject" button in PO actions menu

**Who Can Trigger**:

- `super_admin`
- `brand_admin`
- `brand_manager`

**Prerequisites**:

- PO status must be `submitted`
- User must not be the PO creator
- Rejection reason must be provided

**What Happens**:

1. PO status changes from `submitted` → `rejected`
2. `rejection_reason` is set
3. Approval history entry created
4. Notification sent to PO creator
5. All line items remain in their current state

**API Endpoint**: `POST /api/purchase-orders/[id]/reject`

**Request Body**:

```json
{
  "comments": "PO rejected due to budget constraints"
}
```

**Testing Steps**:

1. Login as `brand_admin` (not the PO creator)
2. Open a submitted PO
3. Click "Reject" in actions menu
4. Enter rejection reason (required)
5. Submit rejection
6. Verify PO status changes to `rejected`
7. Verify `rejection_reason` is set
8. Verify notification sent to PO creator
9. Verify approval history entry created
10. Test without reason → Should fail validation

---

### Feature 8: PO Cancellation

**Trigger**: User clicks "Cancel" button in PO actions menu

**Who Can Trigger**:

- `super_admin`: Can cancel at any status
- `brand_admin`: Can cancel before `ordered` status
- `brand_manager`: Can cancel at `draft` or `submitted` status

**Prerequisites**:

- PO status must allow cancellation based on user role
- Cancellation reason must be provided

**What Happens**:

1. PO status changes to `cancelled`
2. `rejection_reason` is set with cancellation reason
3. Approval history entry created
4. Notification sent to PO creator
5. Inventory sync performed (if applicable)

**API Endpoint**: `POST /api/purchase-orders/[id]/cancel`

**Request Body**:

```json
{
  "reason": "PO cancelled due to supplier issues"
}
```

**Testing Steps**:

1. Login as `brand_manager`
2. Open a `draft` or `submitted` PO
3. Click "Cancel" in actions menu
4. Enter cancellation reason (required)
5. Submit cancellation
6. Verify PO status changes to `cancelled`
7. Verify `rejection_reason` is set
8. Verify notification sent to PO creator
9. Test cancellation at different statuses:
   - `draft` → Should work for `brand_manager`
   - `submitted` → Should work for `brand_manager`
   - `approved` → Should NOT work for `brand_manager` (only `brand_admin` or `super_admin`)
   - `ordered` → Should NOT work for `brand_manager` (only `super_admin`)

---

### Feature 9: Line Item Cancellation

**Trigger**: User cancels individual line item in PO review

**Who Can Trigger**:

- `super_admin`
- `brand_admin`
- `brand_manager`

**Prerequisites**:

- PO status must be `submitted`
- User must have approval permissions

**What Happens**:

1. Line status changes to `cancelled`
2. `line_notes` updated with cancellation reason
3. Approval history entry created
4. If all lines cancelled, entire PO is cancelled automatically

**API Endpoint**: `POST /api/purchase-orders/[id]/lines/[lineId]/cancel`

**Request Body**:

```json
{
  "reason": "Item no longer needed"
}
```

**Testing Steps**:

1. Login as `brand_admin` (not the PO creator)
2. Open a submitted PO for review
3. Cancel a single line item
4. Verify line status changes to `cancelled`
5. Verify `line_notes` contains cancellation reason
6. Verify approval history entry created
7. Cancel all remaining lines
8. Verify entire PO is automatically cancelled

---

### Feature 10: Order Generation from PO

**Trigger**: Automatically triggered during "Finalize Approval" if `create_orders: true`

**Who Can Trigger**:

- Automatically by system during approval finalization
- Can be disabled by setting `create_orders: false`

**What Happens**:

1. Creates order(s) from approved PO lines
2. Links order to PO via `purchase_order_id`
3. Links order lines to PO lines via `source_po_line_id`
4. Deducts inventory for approved quantities
5. Checks for low stock alerts
6. Returns order IDs in approval response

**Testing Steps**:

1. Complete "Finalize Approval" process (see Feature 6)
2. Verify orders are created in `orders` table
3. Verify `orders.purchase_order_id` links to PO
4. Verify `order_lines.source_po_line_id` links to PO lines
5. Verify inventory deducted correctly
6. Verify low stock alerts triggered if applicable
7. Test with `create_orders: false` → Orders should NOT be created

---

### Feature 11: Backorder Management

**Trigger**: Automatically during "Finalize Approval" for lines with `backorder_qty > 0`

**Who Can Trigger**:

- Automatically by system during approval finalization

**What Happens**:

1. Creates backorder records in `po_backorders` table
2. Links backorder to PO and PO line
3. Tracks backorder quantity and status
4. Sends backorder notification
5. Records backorder IDs in approval history

**Testing Steps**:

1. Create a PO with line items requesting more than available stock
2. Approve lines with partial quantities (split into approved + backorder)
3. Finalize approval
4. Verify backorder records created in `po_backorders` table
5. Verify backorder quantities match `backorder_qty` from lines
6. Verify backorder notification sent
7. Verify backorder IDs recorded in approval history

---

### Feature 12: Notification System

**Trigger**: Various actions trigger different notifications

**Notification Types**:

1. **PO Review Required** (High Priority)

   - Trigger: PO submitted
   - Recipients: `super_admin`, `brand_admin`, `brand_manager`
   - Action URL: Links to PO review

2. **PO Approved** (Medium Priority)

   - Trigger: PO finalized with 100% fulfillment
   - Recipients: PO creator
   - Message: "Purchase Order {PO_NUMBER} has been approved"

3. **PO Partially Approved** (High Priority)

   - Trigger: PO finalized with < 100% fulfillment
   - Recipients: PO creator, brand admins
   - Message: Includes fulfillment percentage

4. **Backorder Created** (Medium Priority)

   - Trigger: Backorder records created
   - Recipients: PO creator, brand admins
   - Message: Details about backordered items

5. **Stock Override Applied** (Urgent Priority)

   - Trigger: Stock override used during approval
   - Recipients: Brand admins, super admins
   - Message: Details about override and reason

6. **Low Stock Alert** (High Priority)
   - Trigger: Stock drops below reorder level after order creation
   - Recipients: Inventory managers
   - Message: Product SKU and current stock level

**Testing Steps**:

1. Submit a PO → Verify "PO Review Required" notification sent to approvers
2. Approve a PO fully → Verify "PO Approved" notification sent to creator
3. Approve a PO partially → Verify "PO Partially Approved" notification sent
4. Create backorders → Verify "Backorder Created" notification sent
5. Apply stock override → Verify "Stock Override Applied" urgent notification sent
6. Create order that triggers low stock → Verify "Low Stock Alert" notification sent
7. Check notification center for all notifications
8. Verify notification links work correctly

---

### Feature 13: Calendar Integration

**Trigger**: Automatically during "Finalize Approval" if PO has `expected_delivery_date`

**What Happens**:

1. Creates calendar event for PO delivery
2. Event type: `po_delivery`
3. Links event to PO via `related_entity_type` and `related_entity_id`
4. Sets event date to `expected_delivery_date`

**Testing Steps**:

1. Create a PO with `expected_delivery_date` set
2. Finalize approval
3. Verify calendar event created in `calendar_events` table
4. Verify event details:
   - Title: "PO Delivery: {PO_NUMBER}"
   - Event date matches `expected_delivery_date`
   - Event type is `po_delivery`
   - Related entity links to PO
5. Check calendar UI to see event displayed

---

### Feature 14: Audit Trail

**Trigger**: All approval actions automatically create history entries

**What Happens**:

1. Every action creates entry in `po_approval_history` table
2. Records:
   - `po_id`: Purchase order ID
   - `action`: Action type (submitted, approved, rejected, cancelled)
   - `actor_id`: User who performed action
   - `comments`: Optional comments/reason
   - `affected_line_ids`: Array of line IDs affected
   - `override_applied`: Boolean flag for overrides
   - `stock_warnings`: JSONB with stock warning details
   - `generated_order_ids`: Array of order IDs created
   - `backorder_references`: JSONB with backorder details
   - `created_at`: Timestamp

**Testing Steps**:

1. Perform various actions (submit, approve, reject, cancel)
2. Check `po_approval_history` table for entries
3. Verify all fields are populated correctly
4. Test API endpoint: `GET /api/purchase-orders/[id]/history`
5. Verify history is displayed in UI (if implemented)
6. Verify override actions have `override_applied: true`
7. Verify finalization includes `generated_order_ids` and `backorder_references`

---

## Step-by-Step Testing Guide

### Test Scenario 1: Happy Path - Full Approval

**Objective**: Test complete approval workflow with all items in stock

**Users Needed**:

- `brand_user` (PO creator)
- `brand_admin` (Approver)

**Steps**:

1. **Create PO** (as `brand_user`):

   - Login as `brand_user`
   - Navigate to Purchase Orders
   - Create new PO
   - Add 3-5 line items with products that have sufficient stock
   - Save as draft
   - Click "Submit for Approval"

2. **Review PO** (as `brand_admin`):

   - Login as `brand_admin` (different user)
   - Check notifications → Should see "PO Review Required"
   - Click notification or navigate to Purchase Orders
   - Open the submitted PO
   - Verify stock validation runs automatically
   - Verify all lines show green (sufficient stock)
   - Click "Approve All Eligible" button
   - Verify all lines are approved
   - Click "Finalize Approval"

3. **Verify Results**:
   - PO status = `approved`
   - All line statuses = `approved`
   - Orders created (check orders table)
   - Inventory deducted (check products table)
   - Notification sent to PO creator
   - Calendar event created (if delivery date set)
   - Approval history entries created

**Expected Outcome**: ✅ PO fully approved, orders created, inventory updated

---

### Test Scenario 2: Partial Stock - Split Approval

**Objective**: Test approval with partial stock requiring backorders

**Users Needed**:

- `brand_user` (PO creator)
- `brand_admin` (Approver)

**Steps**:

1. **Create PO** (as `brand_user`):

   - Login as `brand_user`
   - Create new PO
   - Add line items:
     - Item A: Request 100, Stock available: 100 (sufficient)
     - Item B: Request 50, Stock available: 30 (partial)
     - Item C: Request 75, Stock available: 0 (insufficient)
   - Submit for approval

2. **Review PO** (as `brand_admin`):

   - Login as `brand_admin`
   - Open submitted PO
   - Verify stock validation shows:
     - Item A: Green (sufficient)
     - Item B: Yellow (partial)
     - Item C: Red (insufficient)
   - Click "Approve All Eligible" → Item A should be approved
   - For Item B:
     - Set `approved_qty: 30`
     - Set `backorder_qty: 20`
     - Save line
   - For Item C:
     - Option A: Reject line (`rejected_qty: 75`)
     - Option B: Apply stock override (if authorized)
   - Click "Finalize Approval"

3. **Verify Results**:
   - PO status = `approved` (partial approval)
   - Item A: `approved` status, `approved_qty: 100`
   - Item B: `partially_approved` status, `approved_qty: 30`, `backorder_qty: 20`
   - Item C: `rejected` or `approved` (if overridden)
   - Backorder record created for Item B
   - Orders created for approved quantities
   - Fulfillment percentage < 100%
   - Partial approval notification sent

**Expected Outcome**: ✅ PO partially approved, backorders created, partial fulfillment tracked

---

### Test Scenario 3: Stock Override

**Objective**: Test stock override functionality for privileged users

**Users Needed**:

- `brand_user` (PO creator)
- `brand_admin` (Approver with override permission)
- `brand_manager` (Approver without override permission)

**Steps**:

1. **Create PO** (as `brand_user`):

   - Create PO with line item requesting 100 units
   - Ensure product has 0 stock available
   - Submit for approval

2. **Try Approval Without Override** (as `brand_manager`):

   - Login as `brand_manager`
   - Open submitted PO
   - Try to approve line with 0 stock
   - Should fail with error: "Approved quantity exceeds available stock"
   - Should NOT see override option

3. **Apply Override** (as `brand_admin`):

   - Login as `brand_admin`
   - Open submitted PO
   - Approve line with override:
     - Set `override_applied: true`
     - Enter override reason: "Urgent customer order - stock arriving tomorrow"
     - Approve line
   - Finalize approval

4. **Verify Results**:
   - Line approved despite 0 stock
   - Override fields set:
     - `override_applied: true`
     - `override_by` = brand_admin user ID
     - `override_reason` = reason provided
     - `override_at` = timestamp
   - Urgent notification sent to brand admins
   - Override logged in approval history

**Expected Outcome**: ✅ Override applied successfully, audit trail created, notifications sent

---

### Test Scenario 4: PO Rejection

**Objective**: Test PO rejection workflow

**Users Needed**:

- `brand_user` (PO creator)
- `brand_admin` (Approver)

**Steps**:

1. **Create PO** (as `brand_user`):

   - Create PO with multiple line items
   - Submit for approval

2. **Reject PO** (as `brand_admin`):

   - Login as `brand_admin`
   - Open submitted PO
   - Click "Reject" in actions menu
   - Enter rejection reason: "PO exceeds budget allocation"
   - Submit rejection

3. **Verify Results**:
   - PO status = `rejected`
   - `rejection_reason` = reason provided
   - Notification sent to PO creator
   - Approval history entry created
   - Line items remain unchanged

**Expected Outcome**: ✅ PO rejected, creator notified, reason recorded

---

### Test Scenario 5: Self-Approval Prevention

**Objective**: Verify users cannot approve their own POs

**Users Needed**:

- `brand_admin` (PO creator and approver)

**Steps**:

1. **Create and Submit PO** (as `brand_admin`):

   - Login as `brand_admin`
   - Create PO
   - Submit for approval

2. **Try to Approve Own PO**:

   - Same user tries to approve
   - Should fail with error: "You cannot approve your own purchase order"

3. **Verify Results**:
   - Approval blocked
   - Error message displayed
   - PO remains in `submitted` status

**Expected Outcome**: ✅ Self-approval prevented, appropriate error shown

---

### Test Scenario 6: Permission Testing

**Objective**: Verify role-based permissions are enforced

**Users Needed**:

- `brand_user` (Limited permissions)
- `brand_manager` (Approval permissions, no override)
- `brand_admin` (Full permissions)

**Steps**:

1. **Test as `brand_user`**:

   - Login as `brand_user`
   - Verify can create PO ✅
   - Verify can submit PO ✅
   - Verify CANNOT approve PO ❌
   - Verify CANNOT override stock ❌

2. **Test as `brand_manager`**:

   - Login as `brand_manager`
   - Verify can approve PO ✅
   - Verify CANNOT override stock ❌
   - Verify can cancel draft/submitted PO ✅
   - Verify CANNOT cancel approved/ordered PO ❌

3. **Test as `brand_admin`**:
   - Login as `brand_admin`
   - Verify can approve PO ✅
   - Verify can override stock ✅
   - Verify can cancel before ordered ✅

**Expected Outcome**: ✅ All permissions enforced correctly

---

### Test Scenario 7: Bulk Approval

**Objective**: Test bulk approval of multiple eligible lines

**Users Needed**:

- `brand_user` (PO creator)
- `brand_admin` (Approver)

**Steps**:

1. **Create PO** (as `brand_user`):

   - Create PO with 5 line items
   - Ensure 3 items have sufficient stock
   - Ensure 2 items have partial/insufficient stock
   - Submit for approval

2. **Bulk Approve** (as `brand_admin`):

   - Login as `brand_admin`
   - Open submitted PO
   - Click "Approve All Eligible"
   - Verify 3 lines with sufficient stock are approved
   - Verify 2 lines with insufficient stock remain pending

3. **Verify Results**:
   - 3 lines automatically approved
   - 2 lines remain pending
   - Bulk approval history entry created
   - Success message shows count

**Expected Outcome**: ✅ Bulk approval works correctly, only eligible lines approved

---

### Test Scenario 8: Complete Workflow with Notifications

**Objective**: Test entire workflow and verify all notifications

**Users Needed**:

- `brand_user` (PO creator)
- `brand_admin` (Approver)

**Steps**:

1. **Create and Submit PO**:

   - Create PO with mixed stock scenarios
   - Submit for approval
   - Verify "PO Review Required" notification sent

2. **Review and Approve**:

   - Approve lines (some full, some partial)
   - Apply override if needed
   - Finalize approval

3. **Verify All Notifications**:
   - PO creator receives approval notification
   - Brand admins receive override notification (if applicable)
   - Inventory managers receive low stock alerts (if applicable)
   - Backorder notifications sent (if applicable)

**Expected Outcome**: ✅ All notifications sent correctly to appropriate recipients

---

## API Endpoints Reference

### Stock Validation

- **Endpoint**: `POST /api/purchase-orders/[id]/validate-stock`
- **Auth**: Required
- **Returns**: Stock validation results for all lines

### Individual Line Approval

- **Endpoint**: `POST /api/purchase-orders/[id]/lines/[lineId]/approve`
- **Auth**: Required (approval permissions)
- **Body**: `{ approved_qty, backorder_qty, rejected_qty, override_applied, override_reason, notes }`

### Bulk Line Approval

- **Endpoint**: `POST /api/purchase-orders/[id]/lines/bulk-approve`
- **Auth**: Required (approval permissions)
- **Body**: `{ line_decisions: [...], comments }`

### Finalize Approval

- **Endpoint**: `POST /api/purchase-orders/[id]/approve-complete`
- **Auth**: Required (approval permissions)
- **Body**: `{ create_orders: boolean, comments: string }`

### PO Approval (Simple)

- **Endpoint**: `POST /api/purchase-orders/[id]/approve`
- **Auth**: Required (approval permissions)
- **Body**: `{ comments: string }`
- **Note**: Uses workflow engine for simple approval

### PO Rejection

- **Endpoint**: `POST /api/purchase-orders/[id]/reject`
- **Auth**: Required (approval permissions)
- **Body**: `{ comments: string }` (required)

### PO Cancellation

- **Endpoint**: `POST /api/purchase-orders/[id]/cancel`
- **Auth**: Required (cancellation permissions)
- **Body**: `{ reason: string }` (required)

### Line Cancellation

- **Endpoint**: `POST /api/purchase-orders/[id]/lines/[lineId]/cancel`
- **Auth**: Required (approval permissions)
- **Body**: `{ reason: string }`

### PO Details

- **Endpoint**: `GET /api/purchase-orders/[id]/details`
- **Auth**: Required
- **Returns**: PO, lines, history, orders, backorders, distributor info

### PO History

- **Endpoint**: `GET /api/purchase-orders/[id]/history`
- **Auth**: Required
- **Returns**: Approval history entries

---

## Common Issues & Troubleshooting

### Issue: "All line items must be reviewed before finalizing"

**Cause**: Some lines still have `pending` status

**Solution**:

1. Check all line items in PO review modal
2. Ensure each line has been approved, rejected, or cancelled
3. Look for lines with `line_status: "pending"`
4. Review and update those lines before finalizing

---

### Issue: "Approved quantity exceeds available stock"

**Cause**: Trying to approve more than available without override

**Solution**:

1. Reduce `approved_qty` to match available stock
2. Move remainder to `backorder_qty`
3. Or apply stock override (if authorized)

---

### Issue: "You do not have permission to override stock restrictions"

**Cause**: User role doesn't have override permission

**Solution**:

1. Only `super_admin` and `brand_admin` can override
2. Contact brand admin or super admin to approve
3. Or reduce quantities to match available stock

---

### Issue: "You cannot approve your own purchase order"

**Cause**: User trying to approve PO they created

**Solution**:

1. Have a different user with approval permissions approve the PO
2. This is a security feature to prevent self-approval

---

### Issue: Orders not created after approval

**Cause**: `create_orders` flag may be false or order generation failed

**Solution**:

1. Check approval request body - ensure `create_orders: true`
2. Check server logs for order generation errors
3. Manually create orders if needed
4. Verify PO has approved line items

---

### Issue: Stock not deducted after order creation

**Cause**: Product ID missing or inventory update failed

**Solution**:

1. Check `purchase_order_lines` table - verify `product_id` is set
2. Check `products` table - verify product exists
3. Check server logs for inventory update errors
4. Manually adjust inventory if needed

---

### Issue: "Cannot approve purchase order with status: {status}"

**Cause**: PO is not in `submitted` status

**Solution**:

1. Check current PO status
2. Only `submitted` POs can be approved
3. If PO is `draft`, submit it first
4. If PO is already `approved`, no action needed

---

### Issue: Notification not received

**Cause**: Notification creation may have failed or user preferences

**Solution**:

1. Check `notifications` table for entries
2. Verify user ID matches PO creator/approver
3. Check notification center in UI
4. Verify notification service is running

---

## Testing Checklist

### Basic Functionality

- [ ] Create PO as draft
- [ ] Submit PO for approval
- [ ] View submitted PO as approver
- [ ] Stock validation runs automatically
- [ ] Approve individual line items
- [ ] Bulk approve eligible lines
- [ ] Finalize approval
- [ ] Verify orders created
- [ ] Verify inventory deducted
- [ ] Verify notifications sent

### Stock Scenarios

- [ ] Approve with sufficient stock
- [ ] Approve with partial stock (split)
- [ ] Approve with insufficient stock (override)
- [ ] Reject line items
- [ ] Cancel line items

### Permissions

- [ ] Self-approval blocked
- [ ] Role-based permissions enforced
- [ ] Override permissions enforced
- [ ] Cancellation permissions enforced

### Edge Cases

- [ ] PO with single line item
- [ ] PO with many line items (10+)
- [ ] PO with all items out of stock
- [ ] PO with all items in stock
- [ ] PO rejection workflow
- [ ] PO cancellation at different stages
- [ ] All lines cancelled → PO cancelled

### Integration

- [ ] Notifications sent correctly
- [ ] Calendar events created
- [ ] Inventory updated correctly
- [ ] Backorders created correctly
- [ ] Audit trail complete

### Error Handling

- [ ] Invalid quantities rejected
- [ ] Missing required fields rejected
- [ ] Permission errors handled
- [ ] Stock validation errors handled
- [ ] Network errors handled gracefully

---

## Conclusion

This comprehensive testing guide covers all implemented features of the Purchase Order Approval system. Follow the step-by-step scenarios to verify functionality, test permissions, and ensure proper integration with other modules.

For additional support or questions, refer to:

- Implementation Documentation: `Feature Reviews/Purchase Order Approval implementation doc.md`
- API Documentation: See API endpoints reference above
- Code References: See source files in `app/api/purchase-orders/` and `lib/po/`

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: GrowShip MVP Team
