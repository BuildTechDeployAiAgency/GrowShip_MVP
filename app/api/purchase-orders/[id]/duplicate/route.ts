import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const originalPoId = id;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the original PO
    const { data: originalPO, error: poError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", originalPoId)
      .single();

    if (poError || !originalPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Fetch the original PO lines
    const { data: originalLines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select("*")
      .eq("purchase_order_id", originalPoId);

    if (linesError) {
      console.error("Error fetching PO lines:", linesError);
      return NextResponse.json(
        { error: "Failed to fetch purchase order lines" },
        { status: 500 }
      );
    }

    const toNumber = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    // Calculate requested qty totals for the duplicate
    const totalRequestedQty =
      originalLines?.reduce((sum, line) => {
        const requested = Number(line.requested_qty ?? line.quantity ?? 0);
        return sum + (Number.isFinite(requested) ? requested : 0);
      }, 0) ?? 0;

    const subtotal =
      originalLines?.reduce((sum, line) => {
        const requested = Number(line.requested_qty ?? line.quantity ?? 0);
        const unitPrice = Number(line.unit_price ?? 0);
        return sum + (Number.isFinite(requested * unitPrice) ? requested * unitPrice : 0);
      }, 0)
      ?? originalPO.items?.reduce((sum: number, item: any) => {
        const qty = toNumber(item.quantity ?? item.requested_qty);
        const unitPrice = toNumber(item.unit_price ?? item.price);
        return sum + qty * unitPrice;
      }, 0)
      ?? Number(originalPO.subtotal ?? 0);

    const taxTotal = toNumber(originalPO.tax_total);
    const shippingCost = toNumber(originalPO.shipping_cost);
    const totalAmount = subtotal + taxTotal + shippingCost;

    // Create new PO with reset fields
    const newPOData = {
      // Copied fields
      supplier_name: originalPO.supplier_name,
      supplier_email: originalPO.supplier_email,
      supplier_phone: originalPO.supplier_phone,
      distributor_id: originalPO.distributor_id,
      brand_id: originalPO.brand_id,
      user_id: user.id,
      items: originalPO.items,
      subtotal,
      tax_total: taxTotal,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      currency: originalPO.currency,
      expected_delivery_date: originalPO.expected_delivery_date,
      notes: originalPO.notes,
      tags: originalPO.tags,
      
      // Reset fields
      po_number: `PO-${Date.now()}`,
      po_date: new Date().toISOString(),
      po_status: "draft",
      payment_status: "pending",
      submitted_at: null,
      approved_at: null,
      approved_by: null,
      rejection_reason: null,
      actual_delivery_date: null,
      created_by: user.id,
      updated_by: user.id,
    };

    // Insert new PO
    const { data: newPO, error: createPOError } = await supabase
      .from("purchase_orders")
      .insert(newPOData)
      .select()
      .single();

    if (createPOError || !newPO) {
      console.error("Error creating duplicate PO:", createPOError);
      return NextResponse.json(
        { error: createPOError?.message || "Failed to create duplicate purchase order" },
        { status: 500 }
      );
    }

    // Copy PO lines with new IDs
    if (originalLines && originalLines.length > 0) {
      const newLines = originalLines.map((line) => ({
        purchase_order_id: newPO.id,
        product_id: line.product_id,
        sku: line.sku,
        product_name: line.product_name,
        requested_qty: line.requested_qty ?? line.quantity ?? 0,
        approved_qty: 0, // Reset to 0 for new draft
        backorder_qty: 0, // Reset to 0 for new draft
        rejected_qty: 0, // Reset to 0 for new draft
        unit_price: line.unit_price,
        currency: line.currency,
        line_status: "pending", // Reset to pending
        available_stock: line.available_stock,
        override_applied: false, // Reset override
        override_by: null,
        override_reason: null,
        override_at: null,
        line_notes: line.line_notes,
        notes: line.notes,
      }));

      const { error: createLinesError } = await supabase
        .from("purchase_order_lines")
        .insert(newLines);

      if (createLinesError) {
        console.error("Error creating duplicate PO lines:", createLinesError);
        // Rollback: delete the created PO
        await supabase.from("purchase_orders").delete().eq("id", newPO.id);
        return NextResponse.json(
          { error: createLinesError.message || "Failed to create duplicate purchase order lines" },
          { status: 500 }
        );
      }
    }

    // Fetch the complete new PO with lines
    const { data: completeNewPO, error: fetchError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        purchase_order_lines(*)
      `)
      .eq("id", newPO.id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete new PO:", fetchError);
    }

    return NextResponse.json({
      success: true,
      purchaseOrder: completeNewPO || newPO,
      message: "Purchase order duplicated successfully",
    });
  } catch (error) {
    console.error("Error duplicating purchase order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
