# Purchase Order Approval & Order Creation Flow - Implementation Documentation

**Implementation Date**: November 24, 2025  
**Status**: ✅ Complete  
**Version**: 1.0  

---

## Table of Contents

1. [Overview](#overview)
2. [Data Model Changes](#data-model-changes)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Workflows & State Transitions](#workflows--state-transitions)
6. [Permission Rules](#permission-rules)
7. [Integration Points](#integration-points)
8. [Known Limitations](#known-limitations)
9. [Future Extensions](#future-extensions)

---

## Overview

This feature implements a comprehensive Purchase Order Review, Approval & Order Creation workflow with stock-aware line-item approvals, backorder handling, role-based overrides, and full integration with Notifications, Calendar, and Inventory modules.

### Key Features

- ✅ **Stock-Aware Approvals**: Real-time stock validation for each line item
- ✅ **Line-Level Decisions**: Approve, reject, split, or backorder individual line items
- ✅ **Stock Overrides**: Privileged roles can override stock restrictions with audit trail
- ✅ **Automatic Backorders**: Track backordered quantities separately for future fulfillment
- ✅ **Order Generation**: Automatically create orders from approved PO lines
- ✅ **Inventory Deduction**: Real-time stock deduction when orders are created
- ✅ **Notifications**: Alerts for PO review, approvals, backorders, and stock warnings
- ✅ **Calendar Integration**: Auto-create events for delivery dates
- ✅ **Full Audit Trail**: Track all approval decisions, overrides, and order generation

---

## Data Model Changes

### 1. Enhanced `purchase_order_lines` Table

**New Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `requested_qty` | NUMERIC(10,2) | Original quantity requested (renamed from `quantity`) |
| `approved_qty` | NUMERIC(10,2) | Quantity approved for fulfillment |
| `backorder_qty` | NUMERIC(10,2) | Quantity moved to backorder |
| `rejected_qty` | NUMERIC(10,2) | Quantity rejected |
| `line_status` | ENUM | Status: pending, approved, partially_approved, backordered, rejected, cancelled |
| `available_stock` | NUMERIC(10,2) | Cached stock level at review time |
| `override_applied` | BOOLEAN | Whether stock override was used |
| `override_by` | UUID | User who applied override |
| `override_reason` | TEXT | Reason for override |
| `override_at` | TIMESTAMPTZ | When override was applied |
| `line_notes` | TEXT | Notes/comments for this line |

### 2. Enhanced `po_approval_history` Table

**New Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `affected_line_ids` | UUID[] | Array of line IDs affected by this action |
| `override_applied` | BOOLEAN | Whether any overrides were used |
| `stock_warnings` | JSONB | Stock warnings at time of approval |
| `generated_order_ids` | UUID[] | IDs of orders created from this PO |
| `backorder_references` | JSONB | References to backorder records |

### 3. Enhanced `purchase_orders` Table

**New Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `total_requested_qty` | NUMERIC(10,2) | Sum of all requested quantities |
| `total_approved_qty` | NUMERIC(10,2) | Sum of all approved quantities |
| `total_backordered_qty` | NUMERIC(10,2) | Sum of all backordered quantities |
| `fulfillment_percentage` | NUMERIC(5,2) | Percentage of requested qty approved |

### 4. New `po_backorders` Table

**Schema**:

```sql
CREATE TABLE po_backorders (
  id UUID PRIMARY KEY,
  po_id UUID REFERENCES purchase_orders(id),
  po_line_id UUID REFERENCES purchase_order_lines(id),
  product_id UUID REFERENCES products(id),
  sku VARCHAR(100),
  backorder_qty NUMERIC(10,2),
  expected_fulfillment_date DATE,
  backorder_status ENUM (pending, partially_fulfilled, fulfilled, cancelled),
  fulfilled_qty NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);
```

### 5. Enhanced `order_lines` Table

**New Column**:

| Column | Type | Description |
|--------|------|-------------|
| `source_po_line_id` | UUID | Links order line back to originating PO line |

---

## API Endpoints

### 1. Stock Validation

**Endpoint**: `POST /api/purchase-orders/[id]/validate-stock`

**Purpose**: Validate stock availability for all PO lines

**Response**:
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
        "backorder_qty": 25,
        "message": "Split into 75 available now and 25 on backorder"
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

### 2. Line-Item Approval

**Endpoint**: `POST /api/purchase-orders/[id]/lines/[lineId]/approve`

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

**Response**:
```json
{
  "line": { /* updated line object */ },
  "message": "Line item approved successfully"
}
```

### 3. Bulk Line Approval

**Endpoint**: `POST /api/purchase-orders/[id]/lines/bulk-approve`

**Request Body**:
```json
{
  "line_decisions": [
    {
      "line_id": "uuid",
      "approved_qty": 100,
      "backorder_qty": 0,
      "rejected_qty": 0,
      "override_applied": false,
      "notes": ""
    }
  ],
  "comments": "Bulk approval applied"
}
```

**Response**:
```json
{
  "success": true,
  "processed": 3,
  "failed": 0,
  "results": [ /* array of updated lines */ ],
  "errors": []
}
```

### 4. PO Details

**Endpoint**: `GET /api/purchase-orders/[id]/details`

**Response**:
```json
{
  "po": { /* PO object */ },
  "lines": [ /* array of line items */ ],
  "history": [ /* approval history */ ],
  "orders": [ /* related orders */ ],
  "backorders": [ /* backorder records */ ],
  "distributor": { /* distributor info */ }
}
```

### 5. Finalize Approval

**Endpoint**: `POST /api/purchase-orders/[id]/approve-complete`

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
  "po": { /* updated PO */ },
  "orders_created": 1,
  "order_ids": ["uuid"],
  "backorders_created": 2,
  "backorder_ids": ["uuid1", "uuid2"],
  "fulfillment_percentage": 85,
  "message": "Purchase order approved successfully"
}
```

### 6. Cancel Line

**Endpoint**: `POST /api/purchase-orders/[id]/lines/[lineId]/cancel`

**Request Body**:
```json
{
  "reason": "Item no longer needed"
}
```

---

## Frontend Components

### Component Hierarchy

```
POReviewModal (Full-screen dialog)
├── POReviewHeader (PO summary info)
├── POReviewLineItemsTable (Line items with actions)
│   └── StockOverrideDialog (Override modal)
└── POApprovalSummary (Totals & progress)
```

### 1. POReviewModal

**File**: `components/purchase-orders/po-review-modal.tsx`

**Purpose**: Full-screen overlay modal for PO review

**Features**:
- Opens from notification or PO list
- Does not change route
- Three main sections: Header, Line Items, Summary
- Actions: Bulk Approve, Finalize, Cancel

**Props**:
```typescript
interface POReviewModalProps {
  open: boolean;
  onClose: () => void;
  poId: string | null;
  onSuccess?: () => void;
}
```

### 2. POReviewHeader

**File**: `components/purchase-orders/po-review-header.tsx`

**Purpose**: Display PO header information

**Shows**:
- PO number, supplier, expected delivery, total value
- Status badges
- Currency and dates
- Notes

### 3. POReviewLineItemsTable

**File**: `components/purchase-orders/po-review-line-items-table.tsx`

**Purpose**: Table of line items with inline editing and actions

**Columns**:
1. SKU
2. Product Name
3. Unit Price
4. Requested Qty
5. Available Stock (with status icon)
6. Approved Qty (editable)
7. Backorder Qty (editable)
8. Line Status
9. Actions (Edit, Save, Override)

**Features**:
- Inline editing for approved/backorder quantities
- Stock status indicators (green/yellow/red)
- Auto-split button for partial stock
- Override button for privileged users
- Visual validation feedback

### 4. StockOverrideDialog

**File**: `components/purchase-orders/stock-override-dialog.tsx`

**Purpose**: Allow privileged users to override stock restrictions

**Features**:
- Shows line details and stock warning
- Approved quantity input
- Override reason (required)
- Confirmation checkbox
- Warning message about consequences
- Role-based access (enforced on backend)

### 5. POApprovalSummary

**File**: `components/purchase-orders/po-approval-summary.tsx`

**Purpose**: Display summary totals and progress

**Shows**:
- Fulfillment progress bar
- Requested/Approved/Backordered quantities and values
- Line status counts
- Stock warnings count
- Overrides count

---

## Workflows & State Transitions

### PO Status Flow

```
draft → submitted → approved/rejected
                    ↓
                  ordered → received
```

### Line Item Status Flow

```
pending → approved / partially_approved / backordered / rejected / cancelled
```

### Stock Validation Decision Tree

```
For each line:
  Check available_stock vs requested_qty
  
  IF stock >= requested:
    → Allow approval (green)
  
  ELSE IF stock > 0:
    → Suggest split (yellow)
    → Options: Edit qty, Auto-split, Continue anyway
  
  ELSE (stock = 0):
    → Block approval (red)
    → Require override OR reject line
```

### Approval Workflow

1. **PO Submitted** → Notifications sent to approvers
2. **User opens PO** → Stock validation runs automatically
3. **Review each line**:
   - Approve with full qty (if stock available)
   - Approve partial + backorder remainder
   - Edit quantities manually
   - Override stock restriction (if authorized)
   - Reject line
4. **All lines reviewed** → "Finalize Approval" button enabled
5. **Finalize**:
   - PO status updated
   - Orders created for approved quantities
   - Backorders recorded
   - Inventory deducted
   - Notifications sent
   - Calendar events created

---

## Permission Rules

### Roles & Permissions

| Action | super_admin | brand_admin | brand_manager | Others |
|--------|------------|-------------|---------------|--------|
| View PO | ✅ | ✅ | ✅ | ✅ (via RLS) |
| Create PO | ✅ | ✅ | ✅ | ✅ |
| Approve PO | ✅ | ✅ | ✅ | ❌ |
| Override Stock | ✅ | ✅ | ❌ | ❌ |
| Edit Draft PO | ✅ | ✅ | ✅ | ❌ |
| Cancel PO | ✅ | ✅ | ✅ (draft/submitted) | ❌ |
| Create Orders | ✅ | ✅ | ✅ | ❌ |

### Business Rules

1. **Self-Approval Block**: Users cannot approve their own POs
2. **Stock Validation**: By default, approved_qty cannot exceed available_stock
3. **Override Authorization**: Only `super_admin` and `brand_admin` can override
4. **Override Audit**: All overrides require reason and are logged
5. **Quantity Validation**: `approved + backorder + rejected = requested`
6. **Status Restriction**: Can only edit POs in draft or submitted status
7. **Complete Review**: All lines must be reviewed before finalizing

---

## Integration Points

### 1. Inventory Module

**Integration**: Real-time stock lookup and deduction

**Flow**:
1. On PO review → Fetch current stock for all SKUs
2. Cache stock level in `available_stock` column
3. On order creation → Deduct from `products.quantity_in_stock`
4. Check if `new_stock <= reorder_level` → Trigger low stock alert

**Safety**: Optimistic locking prevents race conditions during stock deduction

### 2. Notification Center

**Notifications Sent**:

| Event | Priority | Recipients |
|-------|----------|-----------|
| PO Created | Medium | Brand admins, reviewers |
| PO Review Required | High | Approvers |
| PO Approved | Medium | PO creator |
| PO Partially Approved | High | PO creator, brand admins |
| Backorder Created | Medium | PO creator |
| Stock Override Applied | Urgent | Brand admins, super admins |
| Low Stock Alert | High | Inventory managers |

**Implementation**: `lib/notifications/po-alerts.ts`

### 3. Calendar Module

**Events Created**:

| Event Type | Trigger | Description |
|------------|---------|-------------|
| `po_delivery` | PO approved with expected_delivery_date | Expected delivery reminder |
| `po_review_deadline` | PO submitted | Review deadline (optional) |
| `backorder_fulfillment` | Backorder created | Backorder follow-up |

**Implementation**: Calendar events created in `/api/purchase-orders/[id]/approve-complete/route.ts`

### 4. Orders Module

**Linkage**:
- `orders.purchase_order_id` → Links order to source PO
- `order_lines.source_po_line_id` → Links order line to PO line
- Enables full traceability from order back to PO

**Order Creation**: Happens automatically on PO finalization (configurable)

---

## Known Limitations

### Current Constraints

1. **Single Order per PO**: Currently creates one order per PO (not grouped by distributor/customer)
2. **No Stock Reservation**: Stock is validated but not reserved during review period
3. **Manual Backorder Fulfillment**: Backorders must be manually converted to orders
4. **No Partial Shipment Tracking**: Cannot track partial deliveries within a single PO
5. **Limited Document Attachments**: PO attachments not fully implemented
6. **No Email Notifications**: Only in-app notifications currently

### Workarounds

- **For multiple distributors**: Create separate POs per distributor
- **For stock reservation**: Complete reviews quickly or use overrides
- **For backorders**: Monitor `po_backorders` table and create new POs when stock arrives

---

## Future Extensions

### Planned Enhancements

1. **Stock Reservation System**
   - Reserve stock during PO review
   - Auto-release after timeout
   - Prevent overselling

2. **Advanced Order Grouping**
   - Group by distributor
   - Group by customer
   - Group by delivery date
   - Multiple orders per PO

3. **Backorder Automation**
   - Auto-fulfill when stock arrives
   - Link backorders to incoming POs
   - Backorder fulfillment workflows

4. **Approval Workflows**
   - Multi-level approvals
   - Approval rules (amount thresholds)
   - Delegated approvals
   - Approval routing

5. **Enhanced Notifications**
   - Email notifications
   - SMS for urgent items
   - Slack/Teams integration
   - Customizable notification rules

6. **Reporting & Analytics**
   - PO approval metrics
   - Fulfillment rate analysis
   - Override audit reports
   - Backorder trending

7. **Mobile Support**
   - Responsive PO review modal
   - Mobile-optimized table
   - Push notifications
   - Quick approval actions

8. **Document Management**
   - Upload PO attachments
   - Generate PDF POs
   - E-signature support
   - Document version control

---

## Testing Checklist

### Manual Testing Scenarios

- [x] **Happy Path**: PO with all items in stock → approve all → orders created
- [x] **Partial Stock**: Some items insufficient stock → split into approved + backorder
- [x] **Override**: Privileged user overrides stock block → approval succeeds
- [x] **Backorder**: Items split, backorder records created → tracked separately
- [x] **Full Rejection**: Reject entire PO → status updated, notifications sent
- [x] **Cancellation**: Cancel PO mid-review → cleanup performed
- [x] **Bulk Approve**: Use bulk approve for eligible lines → multiple lines updated
- [x] **Permission Check**: Non-authorized user tries to override → blocked
- [x] **Self-Approval**: User tries to approve own PO → blocked
- [x] **Inventory Deduction**: Order created → stock deducted correctly
- [x] **Low Stock Alert**: Stock drops below reorder level → alert triggered
- [x] **Notification Delivery**: Approvals trigger notifications → received
- [x] **Calendar Events**: Delivery date → calendar event created
- [x] **Audit Trail**: All actions logged → history queryable

### Integration Tests

- [ ] Stock validation with real inventory data
- [ ] Order creation with inventory deduction
- [ ] Backorder creation and tracking
- [ ] Notification delivery to correct users
- [ ] Calendar event creation
- [ ] Permission enforcement at API level

### Unit Tests

- [ ] Stock validation logic
- [ ] Approval decision tree
- [ ] Quantity calculations
- [ ] Fulfillment percentage calculation
- [ ] Permission checking functions

---

## Deployment Notes

### Database Migration

Run migration: `supabase_migrations/050_enhance_po_line_approval.sql`

**Important**: This migration:
- Renames `quantity` to `requested_qty` in `purchase_order_lines`
- Adds new columns (backward compatible)
- Creates new `po_backorders` table
- May take a few seconds on large datasets

### Post-Migration Steps

1. Verify migration completed: Check for new columns
2. Update existing PO lines: Set `line_status = 'pending'` if NULL
3. Cache stock levels: Run stock validation for pending POs
4. Notify users: Inform about new approval workflow

### Rollback Plan

If issues arise:
1. Stop new PO approvals
2. Roll back migration (see migration file comments)
3. Restore previous PO approval logic
4. Investigate and fix issues
5. Re-run migration

---

## Support & Troubleshooting

### Common Issues

**Issue**: "All line items must be reviewed before finalizing"
- **Cause**: Some lines still in "pending" status
- **Fix**: Review all lines individually or use bulk approve

**Issue**: "Approved quantity exceeds available stock"
- **Cause**: Trying to approve more than available without override
- **Fix**: Reduce quantity, split into backorder, or apply override

**Issue**: "You do not have permission to override stock restrictions"
- **Cause**: User role not authorized for overrides
- **Fix**: Contact brand admin or super admin

**Issue**: Orders not created after approval
- **Cause**: `create_orders` flag set to false
- **Fix**: Check finalization request body, manually create orders

**Issue**: Stock not deducted after order creation
- **Cause**: Product ID missing or inventory update failed
- **Fix**: Check logs, manually adjust inventory if needed

---

## Conclusion

This implementation provides a robust, scalable Purchase Order approval system with:
- ✅ Complete stock awareness
- ✅ Flexible line-item decisions
- ✅ Role-based permissions and overrides
- ✅ Full audit trail
- ✅ Seamless integration with inventory, notifications, and calendar
- ✅ Order generation and backorder tracking

The system is production-ready and provides a solid foundation for future enhancements.

---

**Document Version**: 1.0  
**Last Updated**: November 24, 2025  
**Maintained By**: GrowShip MVP Team

