import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Invoice, PaymentStatus } from "@/hooks/use-invoices";

/**
 * Generate a unique invoice number using timestamp
 * This matches the pattern used in hooks/use-invoices.ts
 */
function generateInvoiceNumber(): string {
  return `INV-${Date.now()}`;
}

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

    // Generate invoice number before creating invoice data
    const invoice_number = generateInvoiceNumber();
    
    // Validate invoice number generation
    if (!invoice_number) {
      console.error("[INVOICE API] Failed to generate invoice number");
      return NextResponse.json(
        { error: "Failed to generate invoice number" },
        { status: 500 }
      );
    }

    // Create invoice from order data
    const invoiceData: Partial<Invoice> = {
      invoice_number, // Add the required invoice_number field
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

    console.log(`[INVOICE API] Generated invoice number: ${invoice_number}`);

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

    console.log(`[INVOICE API] Invoice generated successfully: ${newInvoice.id}`);
    return NextResponse.json(newInvoice);
  } catch (error: any) {
    console.error("Unexpected error generating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}