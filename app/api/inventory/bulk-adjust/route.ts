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
      adjustments,
      adjustment_type,
      reference_number,
    } = body;

    // Validate required fields
    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { error: "adjustments array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!adjustment_type || !["stocktake", "correction"].includes(adjustment_type)) {
      return NextResponse.json(
        { error: "adjustment_type must be either 'stocktake' or 'correction'" },
        { status: 400 }
      );
    }

    const refNumber = reference_number || `BULK-ADJ-${Date.now()}`;
    const results: Array<{ success: boolean; product_id: string; error?: string }> = [];
    let successCount = 0;
    let brandId: string | null = null;

    // Process each adjustment
    for (const adjustment of adjustments) {
      const { product_id, quantity_change, notes } = adjustment;

      if (!product_id || quantity_change === undefined) {
        results.push({
          success: false,
          product_id: product_id || "unknown",
          error: "Missing product_id or quantity_change",
        });
        continue;
      }

      try {
        // Get product details
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", product_id)
          .single();

        if (productError || !product) {
          results.push({
            success: false,
            product_id,
            error: "Product not found",
          });
          continue;
        }

        // Verify user has access to this product's brand
        if (profile.role_name !== "super_admin" && profile.brand_id !== product.brand_id) {
          results.push({
            success: false,
            product_id,
            error: "Permission denied",
          });
          continue;
        }

        // Store brand_id for notification
        if (!brandId) {
          brandId = product.brand_id;
        }

        // Calculate new stock levels
        const quantityBefore = product.quantity_in_stock || 0;
        const quantityAfter = quantityBefore + quantity_change;

        // Create transaction
        const transactionType = adjustment_type === "stocktake" 
          ? "STOCKTAKE_ADJUSTMENT" 
          : "MANUAL_ADJUSTMENT";

        const { error: transactionError } = await supabase
          .from("inventory_transactions")
          .insert({
            product_id,
            sku: product.sku,
            product_name: product.product_name,
            transaction_type: transactionType,
            transaction_date: new Date().toISOString(),
            source_type: adjustment_type,
            source_id: null,
            reference_number: refNumber,
            quantity_change,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            allocated_before: product.allocated_stock || 0,
            allocated_after: product.allocated_stock || 0,
            inbound_before: product.inbound_stock || 0,
            inbound_after: product.inbound_stock || 0,
            status: "completed",
            notes: notes || `Bulk ${adjustment_type}`,
            brand_id: product.brand_id,
            created_by: user.id,
          });

        if (transactionError) {
          results.push({
            success: false,
            product_id,
            error: "Failed to create transaction",
          });
          continue;
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
          results.push({
            success: false,
            product_id,
            error: "Failed to update product stock",
          });
          continue;
        }

        // Evaluate thresholds (don't await to speed up bulk operation)
        evaluateStockThresholds(product_id);

        results.push({
          success: true,
          product_id,
        });
        successCount++;
      } catch (error) {
        console.error(`Error processing adjustment for product ${product_id}:`, error);
        results.push({
          success: false,
          product_id,
          error: String(error),
        });
      }
    }

    // Create summary notification
    if (brandId && successCount > 0) {
      await createNotificationsForBrand(
        {
          type: "info",
          title: "Bulk Stock Adjustment",
          message: `${successCount} product(s) adjusted via ${adjustment_type}. Reference: ${refNumber}`,
          related_entity_type: "inventory",
          related_entity_id: null,
          priority: "low",
          action_required: false,
          action_url: `/inventory/transactions?reference_number=${refNumber}`,
        },
        brandId
      );
    }

    return NextResponse.json({
      success: true,
      reference_number: refNumber,
      total: adjustments.length,
      successful: successCount,
      failed: adjustments.length - successCount,
      results,
    });
  } catch (error) {
    console.error("Unexpected error in bulk-adjust endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

