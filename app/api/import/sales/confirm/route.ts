import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ParsedSalesRow, ValidationError, ImportSummary } from "@/types/import";

/**
 * POST /api/import/sales/confirm
 * Import validated sales data into the database
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
    const {
      salesRows,
      distributorId,
      fileHash,
      fileName,
      brandId,
    }: {
      salesRows: ParsedSalesRow[];
      distributorId: string;
      fileHash: string;
      fileName: string;
      brandId: string;
    } = body;

    // Validate required parameters
    if (!salesRows || !Array.isArray(salesRows) || salesRows.length === 0) {
      return NextResponse.json(
        { error: "No sales data to import" },
        { status: 400 }
      );
    }

    if (!distributorId || !fileHash || !fileName || !brandId) {
      return NextResponse.json(
        { error: "Missing required parameters (distributorId, fileHash, fileName, brandId)" },
        { status: 400 }
      );
    }

    if (brandId !== profile.brand_id) {
      return NextResponse.json(
        { error: "Brand ID mismatch" },
        { status: 403 }
      );
    }

    console.log(`[Sales Import] Starting import of ${salesRows.length} sales rows for brand ${brandId}, distributor ${distributorId}`);

    // Validate distributor access
    const isDistributorUser = profile.role_name?.startsWith("distributor_");
    if (isDistributorUser && profile.distributor_id !== distributorId) {
      return NextResponse.json(
        { error: "You can only import sales data for your assigned distributor" },
        { status: 403 }
      );
    }

    // Create import log entry
    const { data: importLog, error: logError } = await supabase
      .from("import_logs")
      .insert({
        user_id: user.id,
        brand_id: brandId,
        distributor_id: distributorId,
        import_type: "sales",
        file_name: fileName,
        file_hash: fileHash,
        total_rows: salesRows.length,
        successful_rows: 0,
        failed_rows: 0,
        status: "processing",
      })
      .select()
      .single();

    if (logError || !importLog) {
      console.error("[Sales Import] Error creating import log:", logError);
      return NextResponse.json(
        { error: "Failed to create import log" },
        { status: 500 }
      );
    }

    console.log(`[Sales Import] Created import log: ${importLog.id}`);

    // Process sales rows in batches
    const BATCH_SIZE = 50;
    const errors: ValidationError[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < salesRows.length; i += BATCH_SIZE) {
      const batch = salesRows.slice(i, i + BATCH_SIZE);
      
      console.log(`[Sales Import] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (rows ${i + 1}-${Math.min(i + BATCH_SIZE, salesRows.length)})`);

      // Transform sales rows to database format
      const salesDataRecords = batch.map((row) => ({
        brand_id: brandId,
        distributor_id: distributorId,
        sku: row.sku,
        product_name: row.product_name,
        category: row.category,
        retailer_name: row.retailer_name,
        territory: row.territory,
        territory_country: row.territory_country,
        sales_date: row.sales_date,
        reporting_month: row.reporting_month,
        sales_channel: row.sales_channel?.toLowerCase() || null,
        total_sales: row.total_sales,
        units_sold: row.units_sold,
        gross_revenue_local: row.gross_revenue_local,
        marketing_spend: row.marketing_spend,
        currency: row.currency || "USD",
        target_revenue: row.target_revenue,
        notes: row.notes,
        import_timestamp: new Date().toISOString(),
      }));

      // Insert batch into sales_data table
      const { data: insertedData, error: insertError } = await supabase
        .from("sales_data")
        .insert(salesDataRecords)
        .select("id");

      if (insertError) {
        console.error(`[Sales Import] Batch insert error:`, insertError);
        
        // Record errors for this batch
        batch.forEach((row) => {
          errors.push({
            row: row.row,
            message: insertError.message || "Failed to insert sales data",
            code: insertError.code || "INSERT_ERROR",
          });
          failCount++;
        });
      } else {
        successCount += batch.length;
        console.log(`[Sales Import] Successfully inserted batch of ${batch.length} rows`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Sales Import] Import completed in ${duration}ms. Success: ${successCount}, Failed: ${failCount}`);

    // Update import log with results
    const finalStatus = failCount === 0 ? "completed" : (successCount > 0 ? "partial" : "failed");
    
    await supabase
      .from("import_logs")
      .update({
        successful_rows: successCount,
        failed_rows: failCount,
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error_details: errors.length > 0 ? errors : null,
      })
      .eq("id", importLog.id);

    // Prepare summary
    const summary: ImportSummary = {
      total: salesRows.length,
      successful: successCount,
      failed: failCount,
      importLogId: importLog.id,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json({
      success: failCount < salesRows.length, // Success if at least some rows imported
      data: summary,
    });
  } catch (error: any) {
    console.error("[Sales Import] Unexpected error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to import sales data",
      },
      { status: 500 }
    );
  }
}

