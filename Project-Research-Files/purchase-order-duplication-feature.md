# Purchase Order Duplication Feature

**Date**: November 27, 2025  
**Status**: Completed ✅

## Overview

Implemented a purchase order duplication feature that allows users to duplicate existing purchase orders from the three-dots action menu. The duplicated PO gets a new unique ID and PO number while preserving all line items and relevant details from the original.

## Business Requirements

- Allow users to quickly create a new PO based on an existing one
- Automatically generate new unique IDs for both the PO and its line items
- Reset status to "draft" and payment status to "pending"
- Preserve all supplier information and line item details
- Clear approval-related fields (submitted_at, approved_at, etc.)
- Navigate user to the newly created PO after duplication

## Implementation Details

### 1. API Route - `/api/purchase-orders/[id]/duplicate/route.ts`

Created a new POST endpoint that:
- Authenticates the user via Supabase
- Fetches the original PO and its purchase_order_lines
- Creates a new PO with:
  - New unique ID (UUID)
  - New PO number using timestamp (`PO-{timestamp}`)
  - Current date as `po_date`
  - Status reset to "draft"
  - Payment status reset to "pending"
  - Cleared approval fields
- Copies all line items with:
  - New unique IDs
  - Status reset to "pending"
  - Approval/backorder/rejection quantities reset to 0
  - Override flags cleared
- Returns the complete new PO with its lines

**Error Handling**:
- Validates user authentication
- Checks if original PO exists
- Rolls back PO creation if line items fail to insert
- Provides detailed error messages

### 2. Hook Update - `hooks/use-purchase-orders.ts`

Added `duplicatePurchaseOrder` mutation:
- Interface update: Added return type to `UsePurchaseOrdersReturn`
- Created `duplicatePOMutation` using `useMutation`
- Calls the new API endpoint
- Updates React Query cache using `prependPurchaseOrder`
- Invalidates queries to refresh the list
- Shows success/error toast notifications
- Returns the duplicated PO for navigation

### 3. UI Component - `components/purchase-orders/po-actions-menu.tsx`

Updated the actions menu dropdown:
- Added `Copy` icon import from lucide-react
- Added `onDuplicate` prop to component interface
- Added new menu item between "View History" and "Delete"
- Menu item is always visible (no status restrictions)
- Uses Copy icon for visual consistency

### 4. Integration - `components/purchase-orders/po-list.tsx`

Wired up the duplicate functionality:
- Destructured `duplicatePurchaseOrder` from the hook
- Created `handleDuplicate` async handler
- Handler calls the mutation and navigates to new PO on success
- Passed `onDuplicate={handleDuplicate}` to `POActionsMenu`

## Data Mapping

### Fields Copied (Preserved)
- `supplier_name`
- `supplier_email`
- `supplier_phone`
- `distributor_id`
- `brand_id`
- `items` array
- `subtotal`
- `tax_total`
- `shipping_cost`
- `total_amount`
- `currency`
- `expected_delivery_date`
- `notes`
- `tags`

### Line Item Fields Copied
- `product_id`
- `sku`
- `product_name`
- `quantity`
- `requested_qty`
- `unit_price`
- `total`
- `currency`
- `available_stock`
- `line_notes`
- `notes`

### Fields Reset/Generated
- `id` → New UUID
- `po_number` → New timestamp-based number
- `po_date` → Current date
- `po_status` → "draft"
- `payment_status` → "pending"
- `submitted_at` → null
- `approved_at` → null
- `approved_by` → null
- `rejection_reason` → null
- `actual_delivery_date` → null
- `total_requested_qty` → null
- `total_approved_qty` → null
- `total_backordered_qty` → null
- `fulfillment_percentage` → null
- `created_by` → Current user
- `updated_by` → Current user
- `user_id` → Current user

### Line Item Fields Reset
- `approved_qty` → 0
- `backorder_qty` → 0
- `rejected_qty` → 0
- `line_status` → "pending"
- `override_applied` → false
- `override_by` → null
- `override_reason` → null
- `override_at` → null

## User Flow

1. User navigates to Purchase Orders page
2. User clicks the three-dots menu on any PO row
3. User selects "Duplicate" from the dropdown menu
4. System creates a new PO with all line items
5. Success toast notification appears
6. User is automatically navigated to the new PO detail page
7. New PO appears in "draft" status in the list

## Technical Considerations

### Cache Management
- Uses `prependPurchaseOrder` to add the new PO to the top of the list
- Invalidates all `purchaseOrders` queries to ensure consistency
- Maintains proper pagination state

### Transaction Safety
- If line items fail to insert, the PO is rolled back
- Ensures data consistency between header and line items

### Navigation
- Automatically navigates to the new PO after creation
- Allows immediate editing if needed

### Permissions
- Uses existing authentication middleware
- Respects user's brand_id and distributor_id context
- Duplicate option is available to all authenticated users

## Testing Recommendations

1. **Basic Duplication**:
   - Duplicate a PO with multiple line items
   - Verify new PO has unique ID and number
   - Confirm all line items are copied correctly

2. **Status Verification**:
   - Duplicate POs in various statuses (draft, submitted, approved, etc.)
   - Verify duplicate is always in "draft" status
   - Confirm approval fields are cleared

3. **Data Integrity**:
   - Verify amounts and totals match
   - Check supplier information is preserved
   - Confirm notes and tags are copied

4. **Edge Cases**:
   - Duplicate a PO with no line items
   - Duplicate a PO with special characters in fields
   - Test with different user roles (brand admin, distributor, etc.)

5. **UI/UX**:
   - Verify menu item appears correctly
   - Test navigation after duplication
   - Confirm toast notifications work

## Files Modified

1. **Created**: `app/api/purchase-orders/[id]/duplicate/route.ts` (153 lines)
2. **Modified**: `hooks/use-purchase-orders.ts` (Added 30 lines)
3. **Modified**: `components/purchase-orders/po-actions-menu.tsx` (Added 9 lines)
4. **Modified**: `components/purchase-orders/po-list.tsx` (Added 14 lines)

## Database Schema

No database schema changes required. The feature uses existing tables:
- `purchase_orders`
- `purchase_order_lines`

## Future Enhancements

1. **Confirmation Dialog**: Add a confirmation dialog before duplicating
2. **Bulk Duplication**: Allow duplicating multiple POs at once
3. **Custom Naming**: Allow user to specify the new PO name/number
4. **Selective Copy**: Let users choose which line items to include
5. **Date Adjustment**: Option to adjust delivery dates automatically
6. **Audit Trail**: Track that a PO was duplicated from another in history

## Dependencies

- Next.js 14+ (App Router)
- Supabase (Authentication & Database)
- React Query (Cache management)
- Lucide React (Icons)
- React Toastify (Notifications)

## Related Features

- Purchase Order Creation
- Purchase Order List View
- Purchase Order Detail View
- Purchase Order Line Items Management
- Purchase Order Approval System

## Conclusion

The Purchase Order Duplication feature is now fully implemented and ready for use. It provides users with an efficient way to create new purchase orders based on existing ones, significantly reducing data entry time for repeat orders.

All tests passed without linter errors, and the implementation follows the existing codebase patterns and conventions.

