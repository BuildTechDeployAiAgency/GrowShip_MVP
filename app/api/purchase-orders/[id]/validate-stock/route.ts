import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStockForMultipleSKUs, validateLineStock } from "@/lib/inventory/stock-checker";

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const poId = params.id;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("brand_id, po_status")
      .eq("id", poId)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Get all line items for this PO
    const { data: lines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select("id, sku, requested_qty, product_id")
      .eq("purchase_order_id", poId);

    if (linesError) {
      return NextResponse.json(
        { error: "Failed to fetch PO lines" },
        { status: 500 }
      );
    }

    if (!lines || lines.length === 0) {
      return NextResponse.json({
        validations: [],
        summary: {
          total_lines: 0,
          sufficient: 0,
          partial: 0,
          insufficient: 0,
        },
      });
    }

    // Get stock levels for all SKUs
    const skus = lines.map((line) => line.sku);
    const stockMap = await getStockForMultipleSKUs(skus, po.brand_id);

    // Validate each line
    const validations = lines.map((line) => {
      const stockInfo = stockMap.get(line.sku);
      const availableStock = stockInfo?.quantity_in_stock ?? 0;

      return validateLineStock(
        line.id,
        line.sku,
        line.requested_qty,
        availableStock
      );
    });

    // Calculate summary
    const summary = {
      total_lines: validations.length,
      sufficient: validations.filter((v) => v.stock_status === "sufficient")
        .length,
      partial: validations.filter((v) => v.stock_status === "partial").length,
      insufficient: validations.filter((v) => v.stock_status === "insufficient")
        .length,
      can_approve_all:
        validations.filter((v) => v.stock_status === "sufficient").length ===
        validations.length,
    };

    // Update available_stock cache in database
    for (const validation of validations) {
      await supabase
        .from("purchase_order_lines")
        .update({ available_stock: validation.available_stock })
        .eq("id", validation.line_id);
    }

    return NextResponse.json({
      validations,
      summary,
    });
  } catch (error) {
    console.error("Error validating stock:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

