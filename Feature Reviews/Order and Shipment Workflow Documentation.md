# Order & Shipment Workflow Documentation

## Overview

This document outlines the end-to-end workflow for managing Orders and Shipments within the GrowShip MVP platform. It details the status transitions, validation rules, and the relationship between orders and their associated shipments.

## 1. Core Concepts

### 1.1 Orders

An Order represents a customer purchase. It is the central entity that tracks:

- **Customer Information** (Name, Contact, Shipping Address)
- **Line Items** (Products, Quantities, Prices)
- **Financial Status** (Payment, Totals)
- **Fulfillment Status** (Pending, Shipped, Delivered)

### 1.2 Shipments

A Shipment represents a physical package sent to fulfill an Order. One Order can be split into multiple Shipments if needed (e.g., items coming from different warehouses or shipped at different times).

- **Tracking:** Carrier, Tracking Number, URL
- **Contents:** Specific items and quantities included in this package
- **Dates:** Shipped Date, Estimated Delivery, Actual Delivery

## 2. Status Workflows

### 2.1 Order Status Lifecycle

The Order status reflects the overall progress of the customer's request.

| Status         | Description                                              | Valid Next Steps          |
| :------------- | :------------------------------------------------------- | :------------------------ |
| **Pending**    | Order received but not yet processed.                    | `Processing`, `Cancelled` |
| **Processing** | Order is being prepared/packed.                          | `Shipped`, `Cancelled`    |
| **Shipped**    | At least one shipment has been created.                  | `Delivered`               |
| **Delivered**  | **(Strict Validation)** All items delivered to customer. | _Terminal State_          |
| **Cancelled**  | Order was cancelled before fulfillment.                  | _Terminal State_          |

**Critical Validation Rule:**

> An Order CANNOT be marked as `Delivered` unless **ALL** associated Shipments are in a terminal state (`Delivered`, `Cancelled`, or `Returned`). This is enforced by a database trigger.

### 2.2 Shipment Status Lifecycle

The Shipment status tracks the physical movement of a package. We enforce a **strict transition flow** to ensure data integrity.

| Status               | Description                                | Allowed Next Status               |
| :------------------- | :----------------------------------------- | :-------------------------------- |
| **Pending**          | Shipment created, awaiting carrier pickup. | `Processing`, `Cancelled`         |
| **Processing**       | Being packed/labeled.                      | `Shipped`, `Cancelled`            |
| **Shipped**          | Handed over to carrier.                    | `In Transit`                      |
| **In Transit**       | Moving through carrier network.            | `Out for Delivery`, `Failed`      |
| **Out for Delivery** | On the final delivery truck.               | `Delivered`, `Failed`             |
| **Failed**           | Delivery attempt failed (e.g., no access). | `In Transit` (Retry), `Cancelled` |
| **Delivered**        | Successfully dropped off.                  | _Terminal State_                  |
| **Returned**         | Returned to sender.                        | _Terminal State_                  |
| **Cancelled**        | Shipment voided.                           | _Terminal State_                  |

## 3. Workflow Scenarios

### 3.1 Standard Fulfillment Flow

1. **Order Placed:** Order created with status `Pending`.
2. **Processing:** Admin reviews order and updates status to `Processing`.
3. **Create Shipment:**
   - Admin clicks "Create Shipment".
   - Selects items to include.
   - Enters carrier & tracking details.
   - **System Action:** Order status automatically updates to `Shipped` (if it was `Processing`).
4. **Shipment Progress:** Shipment status advances: `Shipped` -> `In Transit` -> `Out for Delivery`.
5. **Completion:**
   - Shipment marked as `Delivered`.
   - Admin manually updates Order status to `Delivered`.
   - **Validation:** System checks all shipments are complete before allowing this change.

### 3.2 Partial Fulfillment (Split Shipment)

1. **Order Placed:** Order contains 2 items (Item A, Item B).
2. **First Shipment:** Admin creates shipment for Item A. Order status -> `Shipped`.
3. **Second Shipment:** Admin creates shipment for Item B later.
4. **Completion:**
   - Shipment 1 marked `Delivered`.
   - Shipment 2 marked `Delivered`.
   - Only _after_ both are delivered can the Order be marked `Delivered`.

### 3.3 Cancellation

- **Before Shipment:** Order can be `Cancelled` directly.
- **After Shipment:**
  - Shipments must be cancelled first.
  - Once shipments are voided, the Order can be `Cancelled`.

## 4. Technical Implementation

### 4.1 Database Enforcements

- **Trigger:** `enforce_shipment_completion_trigger`
  - Runs on `orders` table updates.
  - Blocks update to `Delivered` if any related shipment is not `Delivered`, `Cancelled`, or `Returned`.

### 4.2 Frontend Controls

- **Shipment Status Dialog:** Restricts dropdown options based on the current status (e.g., cannot jump from `Pending` directly to `Delivered`).
- **Order Details:** The "Create Shipment" button is disabled if the order is already fully fulfilled or cancelled.

## 5. Troubleshooting "Stuck" States

If an Order or Shipment appears stuck:

1. **Order won't mark as Delivered:**

   - Check the `shipments` list for that order.
   - Are there any active shipments (e.g., stuck in `In Transit`)?
   - **Fix:** Update the status of the stuck shipment first.

2. **Shipment needs to be cancelled but option is missing:**
   - If a shipment is already `In Transit`, it typically cannot be cancelled in a standard flow.
   - **Fix:** Mark as `Failed` first, then `Cancelled`.
