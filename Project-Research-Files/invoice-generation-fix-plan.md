# Invoice Generation Role-Based Access Control Implementation Plan

## Summary of Findings

After analyzing the codebase, I found that:

1. The 'Generate Invoice' button in the orders list (`components/orders/orders-list.tsx`) exists but has no functionality implemented
2. There is no dedicated API endpoint for generating invoices from orders
3. The existing invoice functionality is handled through the InvoiceFormDialog component
4. Role-based access control is already implemented for other features (e.g., editing orders, creating shipments)
5. The system uses `profile?.role_name?.startsWith("distributor_")` to identify distributor admin users

## Solution Architecture

### 1. Backend API Endpoint

Create a new API endpoint at `app/api/orders/[id]/generate-invoice/route.ts` that:

- Validates user authentication and role
- Checks if the user has permission to generate invoices (not distributor_admin)
- Fetches order details and creates an invoice record
- Returns the generated invoice data

### 2. Frontend Implementation

Modify the orders list component to:

- Add conditional rendering for the Generate Invoice button based on user role
- Implement the invoice generation functionality
- Handle success/error states appropriately

## Detailed Implementation

### API Endpoint Code

```typescript
// app/api/orders/[id]/generate-invoice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Invoice, PaymentStatus } from "@/hooks/use-invoices";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  console.log("=======================================================");
  console.log(`[INVOICE API] POST request received for order: ${id}`);
  console.log("=======================================================");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role and permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    const isSuperAdmin = profile?.role_name === "super_admin";
    const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");

    // DENY access to distributor_admin users
    if (isDistributorAdmin) {
      return NextResponse.json(
        { error: "Distributor users cannot generate invoices" },
        { status: 403 }
      );
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Permission checks for non-super admin users
    if (!isSuperAdmin && order.brand_id !== profile?.brand_id) {
      return NextResponse.json(
        { error: "You do not have access to this order" },
        { status: 403 }
      );
    }

    // Check if invoice already exists for this order
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("order_id", id)
      .single();

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Invoice already exists for this order" },
        { status: 409 }
      );
    }

    // Create invoice from order data
    const invoiceData: Partial<Invoice> = {
      order_id: order.id,
      user_id: user.id,
      brand_id: order.brand_id,
      distributor_id: order.distributor_id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_address: [
        order.shipping_address_line1,
        order.shipping_address_line2,
        order.shipping_city,
        order.shipping_state,
        order.shipping_zip_code,
        order.shipping_country,
      ]
        .filter(Boolean)
        .join(", "),
      subtotal: order.subtotal,
      tax_total: order.tax_total || 0,
      discount_total: order.discount_total || 0,
      total_amount: order.total_amount,
      currency: order.currency || "USD",
      payment_status: "pending" as PaymentStatus,
      invoice_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      notes: `Generated from order ${order.order_number}`,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: newInvoice, error: createError } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating invoice:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to generate invoice" },
        { status: 500 }
      );
    }

    console.log(
      `[INVOICE API] Invoice generated successfully: ${newInvoice.id}`
    );
    return NextResponse.json(newInvoice);
  } catch (error: any) {
    console.error("Unexpected error generating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Frontend Implementation

#### 1. Update orders-list.tsx

```typescript
// In components/orders/orders-list.tsx, modify the Generate Invoice menu item:

<DropdownMenuItem
  onClick={() => handleGenerateInvoice(order)}
  disabled={isDistributorAdmin}
  className={isDistributorAdmin ? "opacity-50 cursor-not-allowed" : ""}
>
  <FileText className="mr-2 h-4 w-4" />
  Generate Invoice
</DropdownMenuItem>
```

#### 2. Add invoice generation handler

```typescript
// Add this function to the OrdersList component:

const handleGenerateInvoice = async (order: Order) => {
  if (isDistributorAdmin) {
    toast.info("Distributor users cannot generate invoices.");
    return;
  }

  try {
    const response = await fetch(`/api/orders/${order.id}/generate-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate invoice");
    }

    const invoice = await response.json();
    toast.success(`Invoice ${invoice.invoice_number} generated successfully!`);

    // Optional: Navigate to invoice details or show a success dialog
    // router.push(`/invoices/${invoice.id}`);
  } catch (err: any) {
    console.error("Error generating invoice:", err);
    toast.error(err.message || "Failed to generate invoice");
  }
};
```

#### 3. Add conditional rendering to order details

```typescript
// In components/orders/order-details.tsx, add invoice generation button:

{
  canManageOrders && (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleGenerateInvoice(order)}
      disabled={isDistributorAdmin}
      title={
        isDistributorAdmin
          ? "Distributor users cannot generate invoices"
          : "Generate invoice from this order"
      }
    >
      <FileText className="mr-2 h-4 w-4" />
      Generate Invoice
    </Button>
  );
}
```

## Testing Strategy

### 1. Frontend Testing

- Test with different user roles:
  - `super_admin`: Should see and use Generate Invoice button
  - `brand_admin`: Should see and use Generate Invoice button
  - `distributor_admin`: Should NOT see Generate Invoice button or see it disabled
- Test the invoice generation flow end-to-end
- Test error handling (existing invoice, order not found, etc.)

### 2. Backend Testing

- Test API endpoint with different authentication scenarios:
  - Unauthenticated request: Should return 401
  - distributor_admin role: Should return 403
  - Valid roles: Should create invoice successfully
- Test edge cases:
  - Order already has invoice: Should return 409
  - Order from different brand: Should return 403 for non-super admin

### 3. Integration Testing

- Test complete flow from order list to invoice creation
- Verify invoice data matches order data
- Test database constraints and relationships

## Security Considerations

1. **Role Validation**: The API endpoint explicitly checks for distributor_admin role and denies access
2. **Row Level Security**: Ensure RLS policies are in place for invoices table
3. **Input Validation**: Validate order existence and user permissions before invoice creation
4. **Audit Trail**: Include created_by and updated_by fields for tracking

## Recommendations

1. **Add Invoice Management UI**: Consider adding a dedicated invoices page to view and manage generated invoices
2. **Invoice Templates**: Implement customizable invoice templates for different brands
3. **Batch Invoice Generation**: Add functionality to generate invoices for multiple orders at once
4. **Email Notifications**: Send invoice notifications to customers when invoices are generated
5. **Audit Logging**: Implement comprehensive audit logging for invoice generation activities

## Implementation Steps

1. Create the API endpoint with role validation
2. Update the orders list component with invoice generation functionality
3. Add conditional rendering based on user role
4. Test with different user roles
5. Update documentation and add user guidance
6. Deploy and monitor for any issues

This implementation ensures that distributor_admin users cannot generate invoices while maintaining the functionality for users with higher privileges.
