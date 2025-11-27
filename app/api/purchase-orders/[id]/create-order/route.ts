import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateNewOrderWithPO } from "@/lib/orders/workflow-engine";

/**
 * POST /api/purchase-orders/[id]/create-order
 * Create an order from an approved purchase order
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const purchaseOrderId = id;

    // Get purchase order details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("*, purchase_order_lines(*)")
      .eq("id", purchaseOrderId)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Validate user has access to this PO
    const isSuperAdmin = profile.role_name === "super_admin";
    if (!isSuperAdmin) {
      // Brand admin check
      if (
        !profile.distributor_id &&
        profile.brand_id !== po.brand_id
      ) {
        return NextResponse.json(
          { error: "You do not have access to this purchase order" },
          { status: 403 }
        );
      }

      // Distributor admin check
      if (
        profile.distributor_id &&
        (profile.brand_id !== po.brand_id ||
          profile.distributor_id !== po.distributor_id)
      ) {
        return NextResponse.json(
          { error: "You do not have access to this purchase order" },
          { status: 403 }
        );
      }
    }

    // Validate PO status
    if (po.po_status !== "approved" && po.po_status !== "ordered") {
      return NextResponse.json(
        {
          error: `Purchase order must be approved or ordered to create an order. Current status: ${po.po_status}`,
        },
        { status: 400 }
      );
    }

    // Parse request body (optional customization)
    const body = await request.json().catch(() => ({}));
    const {
      customer_name,
      customer_email,
      customer_phone,
      notes,
      shipping_address,
    } = body;

    // Prepare order data from PO
    const orderData: any = {
      brand_id: po.brand_id,
      distributor_id: po.distributor_id,
      purchase_order_id: purchaseOrderId,
      user_id: user.id,
      order_number: `ORD-${Date.now()}`,
      order_date: new Date().toISOString(),
      order_status: "draft",
      payment_status: "pending",
      currency: po.currency || "USD",
      created_by: user.id,
      updated_by: user.id,
    };

    // Customer info (from request or PO)
    orderData.customer_name = customer_name || po.supplier_name;
    orderData.customer_email = customer_email || po.supplier_email;
    orderData.customer_phone = customer_phone || po.supplier_phone;

    // Shipping address
    if (shipping_address) {
      orderData.shipping_address_line1 = shipping_address.line1;
      orderData.shipping_address_line2 = shipping_address.line2;
      orderData.shipping_city = shipping_address.city;
      orderData.shipping_state = shipping_address.state;
      orderData.shipping_zip_code = shipping_address.zip_code;
      orderData.shipping_country = shipping_address.country;
    }

    // Convert PO items to order items
    let items: any[] = [];
    let subtotal = 0;

    if (po.purchase_order_lines && po.purchase_order_lines.length > 0) {
      // Use normalized line items
      items = po.purchase_order_lines.map((line: any) => ({
        sku: line.sku,
        name: line.product_name || line.sku,
        quantity: line.quantity,
        price: line.unit_price,
        total: line.quantity * line.unit_price,
      }));
      subtotal = po.purchase_order_lines.reduce(
        (sum: number, line: any) => sum + line.quantity * line.unit_price,
        0
      );
    } else if (po.items && Array.isArray(po.items)) {
      // Fallback to JSONB items
      items = po.items;
      subtotal = po.subtotal || 0;
    }

    orderData.items = items;
    orderData.subtotal = subtotal;
    orderData.tax_total = po.tax_total || 0;
    orderData.shipping_cost = po.shipping_cost || 0;
    orderData.total_amount =
      subtotal + (po.tax_total || 0) + (po.shipping_cost || 0);

    if (notes) {
      orderData.notes = notes;
    }

    // Validate order data
    const validation = await validateNewOrderWithPO(orderData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      );
    }

    // Create the order
    const { data: newOrder, error: createError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating order:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order_lines from purchase_order_lines
    if (po.purchase_order_lines && po.purchase_order_lines.length > 0) {
      const orderLines = po.purchase_order_lines.map((line: any) => ({
        order_id: newOrder.id,
        product_id: line.product_id,
        sku: line.sku,
        product_name: line.product_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        currency: line.currency || po.currency || "USD",
        notes: line.notes,
      }));

      const { error: linesError } = await supabase
        .from("order_lines")
        .insert(orderLines);

      if (linesError) {
        console.error("Error creating order lines:", linesError);
        // Don't fail the entire operation, but log the error
      }
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: "Order created successfully from purchase order",
    });
  } catch (error: any) {
    console.error("Error in create-order endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

