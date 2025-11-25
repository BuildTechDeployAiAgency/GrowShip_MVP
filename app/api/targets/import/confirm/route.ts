import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ParsedTarget } from "@/types/import";
import { createImportLog, updateImportLog } from "@/utils/import-log";
import { validateTargets } from "@/lib/excel/target-validator";

/**
 * POST /api/targets/import/confirm
 * Execute the import of validated targets
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
    const { targets, fileHash, fileName, brandId } = body as {
      targets: ParsedTarget[];
      fileHash: string;
      fileName: string;
      brandId: string;
    };

    console.log("[Target Import Confirm] Starting import", {
      targetsCount: targets?.length || 0,
      brandId,
      fileName,
      userId: user.id,
    });

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      console.error("[Target Import Confirm] No targets provided", { targets });
      return NextResponse.json(
        { error: "No valid targets to import" },
        { status: 400 }
      );
    }

    if (!brandId) {
      console.error("[Target Import Confirm] Missing brand ID");
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
      importType: "orders", // Reuse orders type, could add "targets" later
      fileName,
      fileHash,
      totalRows: targets.length,
      metadata: {
        importType: "targets",
      },
    });

    if (logResult.error) {
      console.error("[Target Import Confirm] Failed to create import log", {
        error: logResult.error,
      });
      return NextResponse.json(
        { error: "Failed to create import log" },
        { status: 500 }
      );
    }

    importLogId = logResult.id!;

    // Update log status to processing
    await updateImportLog(importLogId, {
      status: "processing",
    });

    // Validate targets
    const validationResult = await validateTargets(targets, brandId);

    if (!validationResult.valid) {
      console.log("[Target Import Confirm] Validation failed", {
        errorsCount: validationResult.errors.length,
        validCount: validationResult.validTargets?.length || 0,
        invalidCount: validationResult.invalidTargets?.length || 0,
      });

      // Update import log with validation errors
      await updateImportLog(importLogId, {
        status: "failed",
        failedRows: validationResult.invalidTargets?.length || 0,
        successfulRows: 0,
        errorDetails: validationResult.errors,
      });

      return NextResponse.json({
        success: false,
        error: "Validation failed",
        data: {
          validation: validationResult,
        },
      });
    }

    const validTargets = validationResult.validTargets || [];

    if (validTargets.length === 0) {
      await updateImportLog(importLogId, {
        status: "failed",
        failedRows: targets.length,
        successfulRows: 0,
        errorDetails: validationResult.errors,
      });

      return NextResponse.json({
        success: false,
        error: "No valid targets to import",
        data: {
          validation: validationResult,
        },
      });
    }

    // Use admin client for bulk insert
    const adminSupabase = createAdminClient();

    // Prepare targets for upsert
    const targetsToInsert = validTargets.map((target) => ({
      brand_id: brandId,
      sku: target.sku,
      target_period: target.target_period,
      period_type: target.period_type,
      target_quantity: target.target_quantity || null,
      target_revenue: target.target_revenue || null,
      created_by: user.id,
    }));

    // Bulk upsert targets (using unique constraint on brand_id, sku, target_period, period_type)
    const { data: insertedTargets, error: insertError } = await adminSupabase
      .from("sales_targets")
      .upsert(targetsToInsert, {
        onConflict: "brand_id,sku,target_period,period_type",
      })
      .select();

    if (insertError) {
      console.error("[Target Import Confirm] Failed to insert targets", {
        error: insertError,
        message: insertError.message,
      });

      await updateImportLog(importLogId, {
        status: "failed",
        failedRows: validTargets.length,
        successfulRows: 0,
        errorDetails: [
          {
            row: 0,
            message: `Database error: ${insertError.message}`,
            code: "DATABASE_ERROR",
          },
        ],
      });

      return NextResponse.json(
        {
          success: false,
          error: `Failed to import targets: ${insertError.message}`,
        },
        { status: 500 }
      );
    }

    // Refresh materialized view
    await adminSupabase.rpc("refresh_target_vs_actual_view");

    // Update import log with success
    const failedCount = validationResult.invalidTargets?.length || 0;
    await updateImportLog(importLogId, {
      status: failedCount > 0 ? "partial" : "completed",
      successfulRows: insertedTargets?.length || 0,
      failedRows: failedCount,
      errorDetails: failedCount > 0 ? validationResult.errors : undefined,
    });

    console.log("[Target Import Confirm] Import completed successfully", {
      importedCount: insertedTargets?.length || 0,
      failedCount,
      importLogId,
    });

    return NextResponse.json({
      success: true,
      data: {
        total: targets.length,
        successful: insertedTargets?.length || 0,
        failed: failedCount,
        importLogId,
        errors: failedCount > 0 ? validationResult.errors : undefined,
      },
    });
  } catch (error: any) {
    console.error("[Target Import Confirm] Fatal error", {
      error: error,
      message: error.message,
      stack: error.stack,
      importLogId,
    });

    // Update import log if it exists
    if (importLogId) {
      await updateImportLog(importLogId, {
        status: "failed",
        errorDetails: [
          {
            row: 0,
            message: error.message || "Unknown error",
            code: "FATAL_ERROR",
          },
        ],
      });
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

