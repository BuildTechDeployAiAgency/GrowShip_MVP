# Invoice Generation Role-Based Access Control - Test Plan

## Overview

This document outlines the testing strategy for the implemented invoice generation functionality with role-based access control for distributor_admin users.

## Test Scenarios

### 1. Frontend Tests

#### 1.1 Orders List Component (`components/orders/orders-list.tsx`)

**Test Case 1: Super Admin User**

- Login as super_admin user
- Navigate to Orders page
- Verify "Generate Invoice" option is visible and enabled in the dropdown menu
- Click "Generate Invoice" on an order
- Verify success message appears: "Invoice INV-XXXXX generated successfully!"
- Verify invoice is created in the database

**Test Case 2: Brand Admin User**

- Login as brand_admin user
- Navigate to Orders page
- Verify "Generate Invoice" option is visible and enabled in the dropdown menu
- Click "Generate Invoice" on an order
- Verify success message appears
- Verify invoice is created in the database

**Test Case 3: Distributor Admin User**

- Login as distributor_admin user
- Navigate to Orders page
- Verify "Generate Invoice" option is visible but disabled in the dropdown menu
- Verify button has opacity-50 and cursor-not-allowed styling
- Attempt to click "Generate Invoice"
- Verify info message appears: "Distributor users cannot generate invoices."
- Verify no invoice is created

#### 1.2 Order Details Component (`components/orders/order-details.tsx`)

**Test Case 4: Super Admin User**

- Login as super_admin user
- Navigate to an order details page
- Verify "Generate Invoice" button is visible and enabled
- Click "Generate Invoice" button
- Verify success message appears
- Verify invoice is created

**Test Case 5: Distributor Admin User**

- Login as distributor_admin user
- Navigate to an order details page
- Verify "Generate Invoice" button is visible but disabled
- Hover over button to verify tooltip: "Distributor users cannot generate invoices"
- Attempt to click button
- Verify info message appears: "Distributor users cannot generate invoices."
- Verify no invoice is created

### 2. Backend API Tests

#### 2.1 Authentication Tests

**Test Case 6: Unauthenticated Request**

- Send POST request to `/api/orders/[id]/generate-invoice` without authentication
- Expected: 401 Unauthorized response

**Test Case 7: Invalid User**

- Send POST request with invalid/expired token
- Expected: 401 Unauthorized response

#### 2.2 Authorization Tests

**Test Case 8: Distributor Admin User**

- Authenticate as distributor_admin user
- Send POST request to generate invoice
- Expected: 403 Forbidden response with message "Distributor users cannot generate invoices"

**Test Case 9: Brand Admin User (Own Brand)**

- Authenticate as brand_admin user
- Send POST request for order from their brand
- Expected: 200 OK response with created invoice data

**Test Case 10: Brand Admin User (Different Brand)**

- Authenticate as brand_admin user
- Send POST request for order from different brand
- Expected: 403 Forbidden response with message "You do not have access to this order"

**Test Case 11: Super Admin User**

- Authenticate as super_admin user
- Send POST request for any order
- Expected: 200 OK response with created invoice data

#### 2.3 Business Logic Tests

**Test Case 12: Order Not Found**

- Send POST request for non-existent order ID
- Expected: 404 Not Found response

**Test Case 13: Duplicate Invoice Generation**

- Generate invoice for an order successfully
- Attempt to generate invoice again for same order
- Expected: 409 Conflict response with message "Invoice already exists for this order"

**Test Case 14: Invoice Data Validation**

- Generate invoice for an order with complete data
- Verify invoice data matches order data:
  - Customer name, email, address
  - Order amounts (subtotal, tax, discount, total)
  - Currency
  - Brand and distributor IDs
- Verify invoice number format: "INV-XXXXXXXX"
- Verify payment status is "pending"
- Verify due date is 30 days from creation

### 3. Integration Tests

#### 3.1 End-to-End Flow

**Test Case 15: Complete Invoice Generation Flow**

- Login as admin user
- Navigate to orders list
- Generate invoice from orders list
- Verify success notification
- Check that invoice appears in invoices list
- Navigate to invoice details
- Verify all order data is properly transferred

**Test Case 16: Error Handling Flow**

- Login as admin user
- Attempt to generate invoice for order that already has one
- Verify error message appears
- Verify user can continue using the application
- Verify no duplicate invoice is created

### 4. Database Tests

#### 4.1 Data Integrity

**Test Case 17: Invoice Record Creation**

- Generate invoice for an order
- Verify invoice record is created in invoices table
- Verify all required fields are populated
- Verify foreign key relationships (order_id, brand_id, user_id) are valid

**Test Case 18: Audit Trail**

- Generate invoice
- Verify created_by and updated_by fields contain user ID
- Verify created_at timestamp is correct
- Verify updated_at timestamp matches created_at

## Test Data Setup

### Required User Accounts

1. **Super Admin**: role_name = "super_admin"
2. **Brand Admin**: role_name = "brand_admin" with specific brand_id
3. **Distributor Admin**: role_name = "distributor_admin" with specific distributor_id

### Required Test Orders

1. Order without existing invoice
2. Order with existing invoice
3. Order from different brand
4. Order with incomplete data (edge case)

## Test Environment Setup

### Frontend Testing

- Use development environment with hot reload
- Enable React DevTools for component inspection
- Use browser dev tools for network request inspection
- Clear local storage between role changes

### Backend Testing

- Use Postman or similar API testing tool
- Test against development database
- Enable debug logging for detailed error analysis
- Use different authentication tokens for each role

## Success Criteria

### Functional Requirements

✅ Distributor admin users cannot generate invoices (both frontend and backend)
✅ Admin users can generate invoices successfully
✅ Invoice data is correctly populated from order data
✅ Proper error handling for all edge cases
✅ User feedback through toast notifications

### Security Requirements

✅ Role-based access control enforced at API level
✅ Authentication required for all invoice operations
✅ Brand-level access control for non-super admin users
✅ Input validation and sanitization

### User Experience Requirements

✅ Clear visual feedback for disabled buttons
✅ Informative error messages
✅ Success notifications with invoice number
✅ Consistent behavior across order list and detail pages

## Regression Tests

After implementation, verify existing functionality still works:

- Order creation/editing permissions
- Shipment creation permissions
- Order status updates
- Invoice management through existing forms

## Performance Considerations

- API response time should be under 2 seconds
- Frontend should remain responsive during invoice generation
- Database queries should be optimized with proper indexes
- No memory leaks in frontend components

## Browser Compatibility

Test functionality across:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Responsiveness

- Verify invoice generation buttons work on mobile devices
- Ensure dropdown menus are accessible on touch screens
- Verify toast notifications are visible on mobile
