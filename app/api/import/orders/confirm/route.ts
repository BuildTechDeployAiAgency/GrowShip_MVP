import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ParsedOrder } from "@/types/import";
import { createImportLog, updateImportLog } from "@/utils/import-log";
import { calculateOrderTotals } from "@/lib/excel/validator";

/**
 * Generate order number in format ORD-{DistributorCode}-{00000}
 * Fetches the next sequence number for the distributor
 * Returns the distributor code and starting sequence number
 */
async function getOrderNumberConfig(
  adminSupabase: ReturnType<typeof createAdminClient>,
  distributorId: string
): Promise<{ distributorCode: string; nextSequence: number }> {
  // Fetch distributor to get code
  const { data: distributor, error: distributorError } = await adminSupabase
    .from("distributors")
    .select("code")
    .eq("id", distributorId)
    .single();

  if (distributorError || !distributor) {
    throw new Error(`Failed to fetch distributor: ${distributorError?.message || "Distributor not found"}`);
  }

  // Get distributor code or use fallback (first 4 chars of distributor ID)
  const distributorCode = distributor.code || distributorId.substring(0, 4).toUpperCase();

  // Query existing orders for this distributor to find the highest sequence number
  const { data: existingOrders, error: ordersError } = await adminSupabase
    .from("orders")
    .select("order_number")
    .eq("distributor_id", distributorId)
    .like("order_number", `ORD-${distributorCode}-%`)
    .order("order_number", { ascending: false })
    .limit(1);

  if (ordersError) {
    console.warn("[Generate Order Number] Error fetching existing orders, starting at 1", {
      error: ordersError.message,
    });
  }

  // Extract sequence number from existing orders
  let nextSequence = 1;
  if (existingOrders && existingOrders.length > 0) {
    const lastOrderNumber = existingOrders[0].order_number;
    const match = lastOrderNumber.match(new RegExp(`ORD-${distributorCode}-(\\d+)`));
    if (match && match[1]) {
      const lastSequence = parseInt(match[1], 10);
      nextSequence = lastSequence + 1;
    }
  }

  return { distributorCode, nextSequence };
}

/**
 * Format order number from distributor code and sequence
 */
function formatOrderNumber(distributorCode: string, sequence: number): string {
  const sequenceStr = String(sequence).padStart(5, "0");
  return `ORD-${distributorCode}-${sequenceStr}`;
}

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
      .select("role_name, brand_id, distributor_id")
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

    console.log("[Import Confirm] Starting import", {
      ordersCount: orders?.length || 0,
      distributorId,
      brandId,
      fileName,
      userId: user.id,
    });

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      console.error("[Import Confirm] No orders provided", { orders });
      return NextResponse.json(
        { error: "No valid orders to import" },
        { status: 400 }
      );
    }

    if (!distributorId) {
      console.error("[Import Confirm] Missing distributor ID");
      return NextResponse.json(
        { error: "Distributor ID is required" },
        { status: 400 }
      );
    }

    if (!brandId) {
      console.error("[Import Confirm] Missing brand ID");
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // Validate permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isDistributorUser = profile.role_name?.startsWith("distributor_");
    
    if (!isSuperAdmin && profile.brand_id !== brandId) {
      return NextResponse.json(
        { error: "You do not have access to this brand" },
        { status: 403 }
      );
    }

    // For distributor_admin users, validate they can only import for their own distributor
    if (isDistributorUser && profile.distributor_id) {
      if (distributorId !== profile.distributor_id) {
        return NextResponse.json(
          { error: "You can only import orders for your assigned distributor" },
          { status: 403 }
        );
      }
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
      console.error("[Import Confirm] Failed to create import log", {
        error: logResult.error,
        userId: user.id,
        brandId,
      });
      return NextResponse.json(
        { error: "Failed to create import log" },
        { status: 500 }
      );
    }

    importLogId = logResult.id;
    console.log("[Import Confirm] Import log created", { importLogId });

    // Use admin client for inserting orders
    const adminSupabase = createAdminClient();

    // Import orders in batches
    const batchSize = 50;
    let successfulRows = 0;
    let failedRows = 0;
    const errors: any[] = [];
    const startTime = Date.now();

    console.log("[Import Confirm] Starting batch import", {
      totalOrders: orders.length,
      batchSize,
      totalBatches: Math.ceil(orders.length / batchSize),
    });

    // Fetch distributor code and starting sequence number once before processing batches
    const { distributorCode, nextSequence: startingSequence } = await getOrderNumberConfig(adminSupabase, distributorId);
    let currentSequence = startingSequence;

    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`[Import Confirm] Processing batch ${batchNumber}`, {
        batchNumber,
        batchSize: batch.length,
        startIndex: i,
        currentSequence,
      });
      
      try {
        // Prepare orders for insertion with sequential order numbers
        const ordersToInsert = batch.map((order, index) => {
          const totals = calculateOrderTotals(order);
          
          // Generate order number in format ORD-{DistributorCode}-{00000}
          // Increment sequence for each order
          const orderNumber = formatOrderNumber(distributorCode, currentSequence + index);
          
          return {
            order_number: orderNumber,
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
          console.error(`[Import Confirm] Error inserting batch ${batchNumber}`, {
            batchNumber,
            error: insertError,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
            rows: batch.map((o) => o.row),
          });
          failedRows += batch.length;
          errors.push({
            batch: batchNumber,
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            rows: batch.map((o) => o.row),
          });
        } else {
          successfulRows += insertedOrders?.length || 0;
          // Update sequence counter for next batch
          currentSequence += batch.length;
          console.log(`[Import Confirm] Batch ${batchNumber} inserted successfully`, {
            batchNumber,
            insertedCount: insertedOrders?.length || 0,
            nextSequence: currentSequence,
          });
        }
      } catch (batchError: any) {
        console.error(`[Import Confirm] Exception processing batch ${batchNumber}`, {
          batchNumber,
          error: batchError,
          message: batchError.message,
          stack: batchError.stack,
        });
        failedRows += batch.length;
        errors.push({
          batch: batchNumber,
          error: batchError.message || "Unknown error processing batch",
          rows: batch.map((o) => o.row),
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log("[Import Confirm] Batch import completed", {
      totalOrders: orders.length,
      successfulRows,
      failedRows,
      duration: `${duration}ms`,
      errorsCount: errors.length,
    });

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
    console.error("[Import Confirm] Fatal error in confirm import API", {
      error: error,
      message: error.message,
      stack: error.stack,
      importLogId,
      userId: user?.id,
    });

    // Update import log with failure if we have an ID
    if (importLogId) {
      try {
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
      } catch (logError) {
        console.error("[Import Confirm] Failed to update import log", {
          logError,
          importLogId,
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

