import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ParsedOrder } from "@/types/import";
import { createImportLog, updateImportLog } from "@/utils/import-log";
import { calculateOrderTotals } from "@/lib/excel/validator";

/**
 * POST /api/import/orders/confirm
 * Execute the import of validated orders
 */
export async function POST(request: NextRequest) {
  let importLogId: string | null = null;

  try {
    // Authenticate user
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
      .select("role_name, brand_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { orders, distributorId, fileHash, fileName, brandId } = body as {
      orders: ParsedOrder[];
      distributorId: string;
      fileHash: string;
      fileName: string;
      brandId: string;
    };

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: "No valid orders to import" },
        { status: 400 }
      );
    }

    if (!distributorId) {
      return NextResponse.json(
        { error: "Distributor ID is required" },
        { status: 400 }
      );
    }

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // Validate permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    if (!isSuperAdmin && profile.brand_id !== brandId) {
      return NextResponse.json(
        { error: "You do not have access to this brand" },
        { status: 403 }
      );
    }

    // Create import log
    const logResult = await createImportLog({
      userId: user.id,
      brandId,
      distributorId,
      importType: "orders",
      fileName: fileName || "unknown.xlsx",
      fileHash: fileHash || "",
      totalRows: orders.length,
      metadata: {
        userAgent: request.headers.get("user-agent"),
        startTime: new Date().toISOString(),
      },
    });

    if (logResult.error) {
      return NextResponse.json(
        { error: "Failed to create import log" },
        { status: 500 }
      );
    }

    importLogId = logResult.id;

    // Use admin client for inserting orders
    const adminSupabase = createAdminClient();

    // Import orders in batches
    const batchSize = 50;
    let successfulRows = 0;
    let failedRows = 0;
    const errors: any[] = [];

    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      
      // Prepare orders for insertion
      const ordersToInsert = batch.map((order) => {
        const totals = calculateOrderTotals(order);
        
        return {
          order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          order_date: order.order_date,
          user_id: user.id,
          brand_id: brandId,
          distributor_id: distributorId,
          customer_name: order.customer_name,
          customer_email: order.customer_email || null,
          customer_phone: order.customer_phone || null,
          customer_type: order.customer_type || null,
          items: order.items.map((item) => ({
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
            tax_rate: item.tax_rate || 0,
            total: item.total || item.quantity * item.unit_price,
          })),
          shipping_address_line1: order.shipping_address_line1 || null,
          shipping_address_line2: order.shipping_address_line2 || null,
          shipping_city: order.shipping_city || null,
          shipping_state: order.shipping_state || null,
          shipping_zip_code: order.shipping_zip_code || null,
          shipping_country: order.shipping_country || null,
          shipping_method: order.shipping_method || null,
          shipping_cost: order.shipping_cost || 0,
          subtotal: totals.subtotal,
          discount_total: totals.discount_total,
          tax_total: totals.tax_total,
          total_amount: totals.total_amount,
          currency: "USD",
          payment_method: order.payment_method || null,
          payment_status: (order.payment_status as any) || "pending",
          order_status: "pending",
          notes: order.notes || null,
          created_by: user.id,
          updated_by: user.id,
        };
      });

      // Insert batch
      const { data: insertedOrders, error: insertError } = await adminSupabase
        .from("orders")
        .insert(ordersToInsert)
        .select("id");

      if (insertError) {
        console.error("Error inserting batch:", insertError);
        failedRows += batch.length;
        errors.push({
          batch: i / batchSize + 1,
          error: insertError.message,
          rows: batch.map((o) => o.row),
        });
      } else {
        successfulRows += insertedOrders.length;
      }
    }

    // Determine final status
    let status: "completed" | "failed" | "partial" = "completed";
    if (successfulRows === 0) {
      status = "failed";
    } else if (failedRows > 0) {
      status = "partial";
    }

    // Update import log with results
    await updateImportLog(importLogId, {
      successfulRows,
      failedRows,
      status,
      errorDetails: errors.length > 0 ? errors : undefined,
      metadata: {
        endTime: new Date().toISOString(),
        duration: Date.now() - new Date().getTime(),
      },
    });

    return NextResponse.json({
      success: successfulRows > 0,
      data: {
        total: orders.length,
        successful: successfulRows,
        failed: failedRows,
        importLogId,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error in confirm import API:", error);

    // Update import log with failure if we have an ID
    if (importLogId) {
      await updateImportLog(importLogId, {
        status: "failed",
        errorDetails: [
          {
            row: 0,
            message: error.message || "Internal server error",
            code: "IMPORT_ERROR",
          },
        ],
      });
    }

    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

