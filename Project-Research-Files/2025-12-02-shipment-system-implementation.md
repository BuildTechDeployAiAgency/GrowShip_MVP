# Shipment System Implementation Documentation

**Date**: December 2, 2025  
**Author**: GrowShip MVP Team  
**Status**: Complete

---

## Overview

This document describes the complete implementation of the Order Shipment Creation system in GrowShip MVP. The system enables creating shipments from orders, tracking shipment status, automatically updating inventory, and notifying relevant stakeholders.

---

## System Architecture

### Data Flow

```
Order (approved PO) 
    ↓
Create Shipment (atomic transaction)
    ├── Insert shipments record
    ├── Insert shipment_items records
    ├── Decrement products.quantity_in_stock
    ├── Decrement products.allocated_stock
    ├── Create inventory_transactions
    ├── Update order_lines.shipped_quantity
    ├── Update orders.fulfilment_status
    └── Create notifications
    ↓
Shipment Status Updates
    ├── pending → processing → shipped → delivered
    ├── Notifications on each transition
    └── Order status updated when all shipments delivered
```

### Database Schema

#### shipments Table
```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number VARCHAR(50) NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  distributor_id UUID REFERENCES distributors(id),
  brand_id UUID NOT NULL REFERENCES brands(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  carrier VARCHAR(100),
  tracking_number VARCHAR(200),
  shipping_method VARCHAR(100),
  shipping_cost NUMERIC(10,2),
  -- Address fields
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_zip_code VARCHAR(20),
  shipping_country VARCHAR(100),
  -- Dates
  shipped_date TIMESTAMPTZ,
  estimated_delivery_date DATE,
  delivered_date TIMESTAMPTZ,
  -- Totals
  total_items_shipped INTEGER DEFAULT 0,
  total_value NUMERIC(10,2) DEFAULT 0,
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  -- Audit
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### shipment_items Table
```sql
CREATE TABLE shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  order_line_id UUID REFERENCES order_lines(id),
  product_id UUID REFERENCES products(id),
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255),
  quantity_shipped NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) DEFAULT 0,
  cost_price NUMERIC(10,2) DEFAULT 0,
  total_value NUMERIC(10,2) GENERATED ALWAYS AS (quantity_shipped * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Status Lifecycle

| Current Status | Valid Transitions |
|----------------|-------------------|
| pending | processing, cancelled |
| processing | shipped, cancelled |
| shipped | delivered |
| delivered | (terminal) |
| cancelled | (terminal) |

---

## API Reference

### Create Shipment (RPC)

**Function**: `create_shipment_transaction`

**Parameters**:
- `p_order_id` (UUID): Order to ship from
- `p_carrier` (VARCHAR): Carrier name (optional)
- `p_tracking_number` (VARCHAR): Tracking number (optional)
- `p_shipping_method` (VARCHAR): Shipping method (optional)
- `p_notes` (TEXT): Notes (optional)
- `p_items` (JSONB): Array of items to ship
- `p_user_id` (UUID): User creating the shipment

**Item Structure**:
```json
{
  "order_line_id": "uuid",
  "product_id": "uuid",
  "sku": "string",
  "product_name": "string",
  "quantity_to_ship": 10,
  "unit_price": 25.00
}
```

**Returns**:
```json
{
  "success": true,
  "shipment_id": "uuid",
  "shipment_number": "SHIP-20251202-1234",
  "total_items": 10,
  "total_value": 250.00,
  "fulfilment_status": "partial"
}
```

### Update Shipment Status (RPC)

**Function**: `update_shipment_status`

**Parameters**:
- `p_shipment_id` (UUID): Shipment to update
- `p_new_status` (VARCHAR): New status
- `p_user_id` (UUID): User making the update
- `p_notes` (TEXT): Notes (optional)

**Returns**:
```json
{
  "success": true,
  "shipment_id": "uuid",
  "new_status": "shipped"
}
```

### REST API

#### Update Shipment Status
```
PATCH /api/shipments/{id}/status
Body: { "status": "shipped", "notes": "Shipped via FedEx" }
```

---

## UI Components

### CreateShipmentDialog
- Shows order items with ordered/shipped/remaining quantities
- Displays available inventory for each item
- Allows selecting items and quantities to ship
- Validates against remaining quantity and inventory
- Captures carrier and tracking information

### ShipmentsList
- Displays all shipments with filtering
- Status badges with icons
- Quick actions (view, update status, track, delete)
- Supports filtering by order (for Order Details page)

### ShipmentDetails
- Full shipment information display
- Status timeline visualization
- Items shipped table
- Related order and distributor information
- Status update functionality

### ShipmentStatusDialog
- Shows valid status transitions
- Allows adding notes with status change
- Visual transition preview

---

## Inventory Integration

When a shipment is created:

1. **Products table updated**:
   - `quantity_in_stock` decremented by shipped quantity
   - `allocated_stock` decremented (releases allocation)

2. **Inventory transaction created**:
   - `transaction_type`: 'SHIPMENT'
   - `source_type`: 'shipment'
   - `source_id`: shipment ID
   - Full audit trail with before/after quantities

---

## Notification System

### Notification Types
- `shipment_created`: When shipment is created
- `shipment_status_update`: When status changes
- `shipment_delivered`: When delivered

### Recipients
- Brand admins
- Brand managers
- Brand logistics
- Distributor admins (if shipment has distributor_id)

### Notification Fields
```json
{
  "type": "shipping",
  "title": "Shipment Created",
  "message": "Shipment SHIP-20251202-1234 has been created for order ORD-001",
  "related_entity_type": "shipment",
  "related_entity_id": "uuid",
  "action_url": "/orders/{order_id}",
  "priority": "medium"
}
```

---

## Row Level Security

### shipments Table
- Brand users can view/manage shipments for their brand
- Distributor admins can view shipments for their distributor
- Super admins have full access

### shipment_items Table
- Access controlled through parent shipment's brand_id
- Same visibility rules as shipments

---

## Performance Considerations

### Indexes Created
- `idx_shipments_order_id`
- `idx_shipments_brand_id`
- `idx_shipments_distributor_id`
- `idx_shipments_status`
- `idx_shipments_shipped_date`
- `idx_shipments_tracking_number`
- `idx_shipment_items_shipment_id`
- `idx_shipment_items_product_id`
- `idx_shipment_items_sku`
- `idx_order_lines_shipped_quantity`
- `idx_orders_fulfilment_status`

### Query Optimization
- Shipments list uses pagination
- Order details fetches shipments with items in single query
- Status updates use optimistic UI updates

---

## Future Enhancements

1. **Carrier API Integration**
   - Real-time tracking from FedEx, UPS, USPS, DHL
   - Automatic status updates from carrier webhooks

2. **Bulk Shipment Creation**
   - Create multiple shipments from Excel import
   - Batch processing for high-volume operations

3. **Shipping Labels**
   - Generate shipping labels from within the app
   - Print packing slips

4. **Returns Management**
   - RMA (Return Merchandise Authorization) workflow
   - Return shipment tracking
   - Inventory adjustment on return receipt

5. **Analytics**
   - Shipping cost analysis
   - Carrier performance comparison
   - Delivery time trends

