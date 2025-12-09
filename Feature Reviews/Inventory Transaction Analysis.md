# Inventory Transaction Analysis & Fix Plan

## Issue Description
The user reported that inventory transactions are not being recorded when order statuses change.

## Root Cause Analysis
Upon reviewing the codebase, a critical mismatch was found between the order status workflow and the inventory synchronization logic.

### 1. Status Mismatch
- **Actual Order Statuses** (from `types/orders.ts`): `pending`, `processing`, `shipped`, `delivered`, `cancelled`.
- **Workflow Engine Statuses** (from `lib/orders/workflow-engine.ts`): `draft`, `submitted`, `fulfilled`.
- **API Route Logic** (`app/api/orders/[id]/route.ts`): Checks for specific one-step transitions:
    - `pending` -> `processing` (Triggers Allocation)
    - `processing` -> `shipped` (Triggers Fulfillment)

### 2. The "Gap" Bug
If an order is updated directly from `pending` to `shipped` (skipping `processing`), **neither inventory trigger fires**.
- `newStatus === "shipped"` (matches 2nd block) AND `oldStatus === "pending"` (fails 2nd block's `oldStatus === "processing"` check).
- Result: Order status changes to `shipped`, but no inventory is deducted.

### 3. Unused Code
The `lib/orders/workflow-engine.ts` file contains a robust `executeOrderTransition` function, but it is **not used** by the API route. The API route implements a simplified, buggy version of the logic inline.

## Implementation Plan

### 1. Fix API Route (`app/api/orders/[id]/route.ts`)
Update the logic to handle various transition paths:
- **Path A (`pending` -> `processing`)**: Call `syncOrderAllocation`.
- **Path B (`processing` -> `shipped`)**: Call `syncOrderFulfillment`.
- **Path C (`pending` -> `shipped`)**: Call `syncOrderAllocation` THEN `syncOrderFulfillment`.
- **Cancellation**:
    - If `oldStatus` was `processing` (allocated), call `syncOrderCancellation`.
    - If `oldStatus` was `pending` (not allocated), no inventory action needed.

### 2. Update Documentation
- Update `Inventory Module implementation doc.md` to reflect the actual status names (`pending`, `processing`, `shipped`).
- Document the rules for stock movement based on these statuses.

### 3. Cleanup (Optional but Recommended)
- Update `lib/orders/workflow-engine.ts` to match the actual schema, so future developers using it don't re-introduce bugs.

## Inventory Rules (Revised)

| From Status | To Status | Inventory Action | Transaction Type |
|-------------|-----------|------------------|------------------|
| `pending` | `processing` | Allocate Stock | `ORDER_ALLOCATED` |
| `processing` | `shipped` | Consume Stock | `ORDER_FULFILLED` |
| `pending` | `shipped` | Allocate + Consume | `ORDER_ALLOCATED` + `ORDER_FULFILLED` |
| `processing` | `cancelled` | Release Allocation | `ORDER_CANCELLED` |
| `shipped` | `cancelled` | N/A (Complex return flow) | `RETURN` (Manual) |
