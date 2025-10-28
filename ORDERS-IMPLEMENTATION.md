# Orders Entity Implementation Guide

## Overview
This document describes the complete implementation of the Orders entity for the GrowShip platform. The implementation follows the existing architecture patterns and includes backend models, frontend types, database schema, and API routes.

---

## 📁 Files Created

### 1. Backend Models (Python/Pydantic)
**File:** `/workspace/Backend/app/models/schemas.py`

Added comprehensive order schemas including:
- `OrderItem` - Line item details (product, quantity, pricing)
- `OrderCustomer` - Customer information
- `OrderShipping` - Shipping and delivery details
- `OrderBase` - Base order model
- `OrderCreate` - Order creation schema
- `OrderUpdate` - Order update schema
- `Order` - Complete order with database fields
- `OrderListResponse` - Paginated list response
- `OrderSummaryStats` - Analytics and statistics
- `OrderFilterRequest` - Advanced filtering

### 2. Frontend Types (TypeScript)
**File:** `/workspace/types/orders.ts`

Complete TypeScript interfaces for frontend:
- Type definitions: `OrderStatus`, `PaymentStatus`, `CustomerType`
- `OrderItem` interface
- `OrderCustomer` interface
- `OrderShipping` interface
- `Order` interface (main entity)
- `OrderCreateInput` and `OrderUpdateInput`
- `OrderListResponse` and `OrderFilterParams`
- `OrderSummaryStats` for analytics
- `OrderTableRow` for table displays
- Supabase `Database` type extension

### 3. Database Migration (SQL)
**File:** `/workspace/Backend/migrations/create_orders_table.sql`

Comprehensive database setup including:
- Custom ENUM types for status fields
- `orders` table with all fields
- Multiple indexes for performance
- Full-text search support
- Row Level Security (RLS) policies
- Materialized view for analytics
- Audit triggers for `updated_at`
- Detailed comments and documentation

### 4. API Routes (FastAPI)
**File:** `/workspace/Backend/app/routes/order_routes.py`

Complete REST API implementation:
- `GET /api/v1/orders/` - List orders with filters
- `GET /api/v1/orders/{order_id}` - Get single order
- `POST /api/v1/orders/` - Create new order
- `PATCH /api/v1/orders/{order_id}` - Update order
- `DELETE /api/v1/orders/{order_id}` - Cancel order (soft delete)
- `GET /api/v1/orders/stats/summary` - Get statistics
- `POST /api/v1/orders/filter` - Advanced filtering

### 5. Main Application Update
**File:** `/workspace/Backend/app/main.py`

Updated to include order routes in the FastAPI application.

---

## 🗄️ Database Schema

### Orders Table Structure

```sql
orders (
  id UUID PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Relationships
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  
  -- Customer (flattened for better queries)
  customer_id VARCHAR(100),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_type customer_type,
  
  -- Items (JSONB array)
  items JSONB NOT NULL,
  
  -- Shipping (flattened fields)
  shipping_address_line1 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_country VARCHAR(100),
  ... (more shipping fields),
  
  -- Financial
  subtotal DECIMAL(15, 2) NOT NULL,
  discount_total DECIMAL(15, 2),
  tax_total DECIMAL(15, 2),
  shipping_cost DECIMAL(15, 2),
  total_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Status
  payment_status payment_status DEFAULT 'pending',
  order_status order_status DEFAULT 'pending',
  
  -- Additional
  notes TEXT,
  tags TEXT[],
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
)
```

### Indexes Created
- Primary ID and order number lookups
- User and organization filtering
- Customer searches
- Date range queries
- Status filtering
- Full-text search on order_number, customer_name, notes
- JSONB indexes on items and tags

### Row Level Security (RLS)
- Users can only view/modify orders from their organization
- Only admins can delete orders
- Based on `user_memberships` table

### Analytics View
Materialized view `orders_analytics_view` provides:
- Monthly aggregations
- Revenue and order counts by status
- Unique customer counts
- Organization-level metrics

---

## 🔧 API Endpoints

### Base URL: `/api/v1/orders`

#### 1. List Orders
```http
GET /api/v1/orders/?user_id={uuid}&organization_id={uuid}&limit=50&offset=0
```

Query Parameters:
- `user_id` (required) - User UUID
- `organization_id` (required) - Organization UUID
- `limit` (optional, default: 50) - Page size
- `offset` (optional, default: 0) - Skip records
- `order_status` (optional) - Filter by status
- `payment_status` (optional) - Filter by payment status
- `customer_id` (optional) - Filter by customer
- `date_from`, `date_to` (optional) - Date range
- `search` (optional) - Search in order number/customer name

Response:
```json
{
  "data": [Order],
  "total": 100,
  "offset": 0,
  "limit": 50
}
```

#### 2. Get Single Order
```http
GET /api/v1/orders/{order_id}?user_id={uuid}&organization_id={uuid}
```

Response: Order object

#### 3. Create Order
```http
POST /api/v1/orders/
```

Body: OrderCreate schema

Response: Created Order object

#### 4. Update Order
```http
PATCH /api/v1/orders/{order_id}?user_id={uuid}&organization_id={uuid}
```

Body: OrderUpdate schema (partial update)

Response: Updated Order object

#### 5. Cancel Order
```http
DELETE /api/v1/orders/{order_id}?user_id={uuid}&organization_id={uuid}
```

Response:
```json
{
  "message": "Order cancelled successfully",
  "order_id": "uuid"
}
```

#### 6. Get Statistics
```http
GET /api/v1/orders/stats/summary?organization_id={uuid}
```

Optional filters: `date_from`, `date_to`

Response: OrderSummaryStats with analytics

#### 7. Advanced Filter
```http
POST /api/v1/orders/filter?user_id={uuid}&organization_id={uuid}
```

Body: OrderFilterRequest with multiple filter criteria

Response: OrderListResponse with filtered results

---

## 💻 Usage Examples

### Backend (Python)

#### Create an Order
```python
from app.models.schemas import OrderCreate, OrderCustomer, OrderItem

order = OrderCreate(
    order_number="ORD-2025-001",
    order_date="2025-10-28T10:00:00Z",
    user_id="user-uuid",
    organization_id="org-uuid",
    customer=OrderCustomer(
        customer_name="Acme Corp",
        customer_email="contact@acme.com",
        customer_type="wholesale"
    ),
    items=[
        OrderItem(
            product_name="Widget A",
            product_sku="WDG-A-001",
            quantity=10,
            unit_price=25.00,
            line_total=250.00
        )
    ],
    subtotal=250.00,
    tax_total=20.00,
    shipping_cost=15.00,
    total_amount=285.00
)

# POST to /api/v1/orders/
```

### Frontend (TypeScript)

#### Fetch Orders
```typescript
import { Order, OrderListResponse } from '@/types/orders';

async function fetchOrders(
  userId: string,
  organizationId: string,
  page: number = 0,
  limit: number = 50
): Promise<OrderListResponse> {
  const response = await fetch(
    `/api/v1/orders/?user_id=${userId}&organization_id=${organizationId}&limit=${limit}&offset=${page * limit}`
  );
  return response.json();
}
```

#### Create Order
```typescript
import { OrderCreateInput } from '@/types/orders';

async function createOrder(order: OrderCreateInput): Promise<Order> {
  const response = await fetch('/api/v1/orders/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  return response.json();
}
```

#### Update Order Status
```typescript
import { OrderUpdateInput } from '@/types/orders';

async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const update: OrderUpdateInput = { order_status: status };
  
  const response = await fetch(
    `/api/v1/orders/${orderId}?user_id=${userId}&organization_id=${orgId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    }
  );
  return response.json();
}
```

---

## 🔐 Security Features

1. **Row Level Security (RLS)**
   - Organization-based access control
   - Role-based delete permissions
   - Automatic filtering by user membership

2. **Audit Trail**
   - `created_at`, `updated_at` timestamps
   - `created_by`, `updated_by` user tracking
   - Automatic timestamp updates via trigger

3. **Data Validation**
   - Pydantic models validate input
   - Database constraints on amounts
   - Required fields enforcement

4. **Soft Deletes**
   - Orders are cancelled, not deleted
   - Preserves data integrity
   - Maintains audit history

---

## 📊 Order Status Flow

### Order Status
```
pending → confirmed → processing → shipped → delivered
                                      ↓
                                  cancelled
```

### Payment Status
```
pending → paid
    ↓
  failed → refunded
    ↓
partially_paid → paid
```

---

## 🚀 Next Steps

### Frontend Implementation

1. **Create Order Components**
   ```
   /components/orders/
   ├── orders-list.tsx         # Main orders table
   ├── order-details.tsx       # Single order view
   ├── create-order-dialog.tsx # Order creation form
   ├── order-status-badge.tsx  # Status display
   └── order-filters.tsx       # Filter UI
   ```

2. **Create Order Pages**
   ```
   /app/orders/
   ├── page.tsx              # Orders list page
   └── [id]/page.tsx         # Order details page
   ```

3. **Create Custom Hooks**
   ```
   /hooks/
   ├── use-orders.ts         # Fetch and manage orders
   ├── use-order-stats.ts    # Analytics and statistics
   └── use-order-filters.ts  # Filter management
   ```

4. **Add to Navigation**
   - Add "Orders" menu item to sidebar
   - Configure permissions in database
   - Update menu permissions table

### Backend Enhancements

1. **Order Notifications**
   - Email notifications for status changes
   - Webhook support for integrations

2. **Export Functionality**
   - CSV/Excel export of orders
   - PDF invoice generation

3. **Bulk Operations**
   - Bulk status updates
   - Bulk order imports

4. **Advanced Analytics**
   - Revenue forecasting
   - Customer lifetime value
   - Product performance reports

### Database Optimizations

1. **Scheduled Jobs**
   - Auto-refresh materialized views
   - Archive old orders
   - Clean up cancelled orders

2. **Partitioning**
   - Partition by date for large datasets
   - Improve query performance

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create order via API
- [ ] List orders with pagination
- [ ] Filter orders by status
- [ ] Search orders by customer/order number
- [ ] Update order status
- [ ] Add/update shipping information
- [ ] Get order statistics
- [ ] Cancel order
- [ ] Test RLS policies with different users
- [ ] Test with large order items array

### Integration Tests

Consider adding:
- Order CRUD operations
- Filter and search functionality
- Statistics calculation
- Permission checks
- Data validation

---

## 📝 Notes

1. **Data Storage Strategy**
   - Customer info is flattened for better query performance
   - Order items stored as JSONB for flexibility
   - Shipping info flattened but can be grouped
   - Tags array for categorization

2. **Performance Considerations**
   - Multiple indexes created for common queries
   - Materialized view for analytics (refresh manually or scheduled)
   - JSONB GIN indexes for items and tags
   - Full-text search index for text fields

3. **Scalability**
   - Organization-based partitioning possible
   - Archive strategy for old orders
   - Materialized view can be refreshed incrementally

4. **Flexibility**
   - JSONB allows schema evolution
   - Tags array for custom categorization
   - Notes field for additional information
   - Extensible customer and shipping structures

---

## 📚 Related Documentation

- [Architecture and Data Flows](./Architecture-and-Data-Flows.md)
- [Codebase Analysis](./CODEBASE-ANALYSIS.md)
- [Setup Guide](./SETUP.md)

---

## 🤝 Contributing

When extending the orders functionality:

1. Follow the existing patterns in sales implementation
2. Update this documentation
3. Add tests for new features
4. Update TypeScript types and Pydantic models
5. Consider RLS policies for new fields
6. Add appropriate indexes for new query patterns

---

## ✅ Implementation Complete

All core order functionality has been implemented:
- ✅ Backend Pydantic models
- ✅ Frontend TypeScript interfaces
- ✅ Database schema with migrations
- ✅ REST API endpoints
- ✅ Security policies (RLS)
- ✅ Analytics support
- ✅ Comprehensive documentation

**Status:** Ready for frontend UI implementation and testing.
