import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ParsedProduct, ImportSummary, ValidationError } from "@/types/import";

/**
 * POST /api/import/products/confirm
 * Perform bulk upsert of validated products into the database
 */
export async function POST(request: NextRequest) {
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

    // Check if user is super admin
    if (profile.role_name !== "super_admin") {
      return NextResponse.json(
        { error: "Only Super Admins can import products" },
        { status: 403 }
      );
    }

    if (!profile.brand_id) {
      return NextResponse.json(
        { error: "Brand ID not found in profile" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { products, fileHash, fileName } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Invalid request: products array is required" },
        { status: 400 }
      );
    }

    if (!fileHash || !fileName) {
      return NextResponse.json(
        { error: "Invalid request: fileHash and fileName are required" },
        { status: 400 }
      );
    }

    // Check for duplicate import using file hash
    const { data: existingImport } = await supabase
      .from("import_logs")
      .select("id, status")
      .eq("file_hash", fileHash)
      .eq("brand_id", profile.brand_id)
      .eq("import_type", "products")
      .single();

    if (existingImport && existingImport.status === "completed") {
      return NextResponse.json(
        { error: "This file has already been imported successfully" },
        { status: 409 }
      );
    }

    // Create import log entry
    const { data: importLog, error: importLogError } = await supabase
      .from("import_logs")
      .insert({
        user_id: user.id,
        brand_id: profile.brand_id,
        import_type: "products",
        file_name: fileName,
        file_hash: fileHash,
        total_rows: products.length,
        status: "processing",
      })
      .select()
      .single();

    if (importLogError || !importLog) {
      console.error("Error creating import log:", importLogError);
      return NextResponse.json(
        { error: "Failed to create import log" },
        { status: 500 }
      );
    }

    // Track successful and failed imports
    let successCount = 0;
    let failCount = 0;
    const errors: ValidationError[] = [];

    // Prepare products for upsert
    const productsToInsert = (products as ParsedProduct[]).map((product) => ({
      brand_id: profile.brand_id,
      sku: product.sku,
      product_name: product.product_name,
      description: product.description || null,
      product_category: product.product_category || null,
      unit_price: product.unit_price,
      cost_price: product.cost_price || null,
      currency: product.currency || "USD",
      quantity_in_stock: product.quantity_in_stock || 0,
      reorder_level: product.reorder_level || 0,
      reorder_quantity: product.reorder_quantity || 0,
      barcode: product.barcode || null,
      product_image_url: product.product_image_url || null,
      weight: product.weight || null,
      weight_unit: product.weight_unit || "kg",
      status: product.status || "active",
      tags: product.tags || null,
      supplier_sku: product.supplier_sku || null,
      notes: product.notes || null,
      created_by: user.id,
      updated_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Perform bulk upsert using upsert with onConflict
    const { data: insertedProducts, error: insertError } = await supabase
      .from("products")
      .upsert(productsToInsert, {
        onConflict: "sku",
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error("Error inserting products:", insertError);
      
      // Update import log as failed
      await supabase
        .from("import_logs")
        .update({
          status: "failed",
          failed_rows: products.length,
          error_details: [
            {
              row: 0,
              message: `Database error: ${insertError.message}`,
              code: "DB_INSERT_ERROR",
            },
          ],
          completed_at: new Date().toISOString(),
        })
        .eq("id", importLog.id);

      return NextResponse.json(
        { error: `Failed to import products: ${insertError.message}` },
        { status: 500 }
      );
    }

    successCount = insertedProducts?.length || products.length;
    failCount = products.length - successCount;

    // Update import log with results
    const finalStatus = failCount === 0 ? "completed" : failCount === products.length ? "failed" : "partial";

    await supabase
      .from("import_logs")
      .update({
        status: finalStatus,
        successful_rows: successCount,
        failed_rows: failCount,
        error_details: errors.length > 0 ? errors : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importLog.id);

    // Prepare summary
    const summary: ImportSummary = {
      total: products.length,
      successful: successCount,
      failed: failCount,
      importLogId: importLog.id,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("Error confirming products import:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

