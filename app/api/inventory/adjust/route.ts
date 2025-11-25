import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotificationsForBrand } from "@/lib/notifications/alert-generator";
import { evaluateStockThresholds } from "@/lib/inventory/alert-evaluator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("brand_id, role_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Only brand users and super admins can make adjustments
    if (profile.role_name === "distributor") {
      return NextResponse.json(
        { error: "Distributors cannot make inventory adjustments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      product_id,
      adjustment_type,
      quantity_change,
      reason,
      reference_number,
      notes,
    } = body;

    // Validate required fields
    if (!product_id || !adjustment_type || quantity_change === undefined || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: product_id, adjustment_type, quantity_change, reason" },
        { status: 400 }
      );
    }

    // Validate adjustment type
    const validAdjustmentTypes = ["manual", "stocktake", "correction", "damaged", "return"];
    if (!validAdjustmentTypes.includes(adjustment_type)) {
      return NextResponse.json(
        { error: `Invalid adjustment_type. Must be one of: ${validAdjustmentTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this product's brand
    if (profile.role_name !== "super_admin" && profile.brand_id !== product.brand_id) {
      return NextResponse.json(
        { error: "You do not have permission to adjust this product" },
        { status: 403 }
      );
    }

    // Calculate new stock levels
    const quantityBefore = product.quantity_in_stock || 0;
    const quantityAfter = quantityBefore + quantity_change;

    // Check for negative stock (we allow it based on user decision)
    if (quantityAfter < 0) {
      console.warn(`Adjustment would result in negative stock for product ${product_id}: ${quantityAfter}`);
      // We allow negative stock but log a warning
    }

    // Create transaction
    const transactionType = adjustment_type === "stocktake" 
      ? "STOCKTAKE_ADJUSTMENT" 
      : "MANUAL_ADJUSTMENT";

    const { data: transaction, error: transactionError } = await supabase
      .from("inventory_transactions")
      .insert({
        product_id,
        sku: product.sku,
        product_name: product.product_name,
        transaction_type: transactionType,
        transaction_date: new Date().toISOString(),
        source_type: adjustment_type,
        source_id: null,
        reference_number: reference_number || `ADJ-${Date.now()}`,
        quantity_change,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        allocated_before: product.allocated_stock || 0,
        allocated_after: product.allocated_stock || 0,
        inbound_before: product.inbound_stock || 0,
        inbound_after: product.inbound_stock || 0,
        status: "completed",
        notes: `${reason}${notes ? ` - ${notes}` : ""}`,
        brand_id: product.brand_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Failed to create transaction:", transactionError);
      return NextResponse.json(
        { error: "Failed to create inventory transaction" },
        { status: 500 }
      );
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from("products")
      .update({
        quantity_in_stock: quantityAfter,
        last_stock_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", product_id);

    if (updateError) {
      console.error("Failed to update product stock:", updateError);
      return NextResponse.json(
        { error: "Failed to update product stock" },
        { status: 500 }
      );
    }

    // Evaluate thresholds and create alerts if needed
    await evaluateStockThresholds(product_id);

    // Create notification
    const adjustmentDescription = quantity_change > 0 
      ? `increased by ${quantity_change}` 
      : `decreased by ${Math.abs(quantity_change)}`;

    await createNotificationsForBrand(
      {
        type: "info",
        title: "Manual Stock Adjustment",
        message: `${product.product_name} (${product.sku}) stock ${adjustmentDescription} to ${quantityAfter} units. Reason: ${reason}`,
        related_entity_type: "inventory",
        related_entity_id: product_id,
        priority: "low",
        action_required: false,
        action_url: `/products/${product_id}`,
      },
      product.brand_id
    );

    return NextResponse.json({
      success: true,
      transaction,
      product: {
        id: product_id,
        sku: product.sku,
        product_name: product.product_name,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
      },
    });
  } catch (error) {
    console.error("Unexpected error in adjust endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

