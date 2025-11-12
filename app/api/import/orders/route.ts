import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseOrdersExcel, getFileStats } from "@/lib/excel/parser";
import { validateFileConstraints } from "@/lib/excel/validator";
import { generateFileHash } from "@/utils/idempotency";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/import/orders
 * Upload and parse Excel file, return preview of orders
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

    // Get user profile with role and contact info
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id, contact_name, company_name, email")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Invalid file type. Only .xlsx files are supported" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of 10MB (current: ${Math.round(file.size / 1024 / 1024)}MB)`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Get file statistics
    const stats = getFileStats(fileBuffer);

    // Check if user is distributor_admin and auto-populate distributor_id
    const isDistributorAdmin = profile.role_name?.startsWith("distributor_");
    const distributorId = isDistributorAdmin && profile.distributor_id 
      ? profile.distributor_id 
      : undefined;

    // Prepare auto-population data (distributor ID will be set during validation/confirmation)
    // For distributor_admin, auto-populate distributor_id from profile
    const autoPopulate = profile.brand_id ? {
      brandId: profile.brand_id,
      distributorId: distributorId,
      customerName: profile.contact_name || profile.company_name || undefined,
      customerEmail: profile.email || undefined,
    } : undefined;

    // Parse the Excel file
    let parseResult;
    try {
      console.log("[Import Upload] Parsing Excel file", {
        fileName: file.name,
        fileSize: file.size,
        userId: user.id,
        autoPopulate,
      });
      parseResult = await parseOrdersExcel(fileBuffer, autoPopulate);
      console.log("[Import Upload] File parsed successfully", {
        ordersCount: parseResult.orders.length,
        extractedDistributorId: parseResult.extractedDistributorId,
        distributorIdConsistent: parseResult.distributorIdConsistent,
        fileName: file.name,
      });
    } catch (parseError: any) {
      console.error("[Import Upload] Error parsing Excel file", {
        error: parseError,
        message: parseError.message,
        stack: parseError.stack,
        fileName: file.name,
        fileSize: file.size,
      });
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse Excel file: ${parseError.message}`,
        },
        { status: 400 }
      );
    }

    const orders = parseResult.orders;

    // Validate file constraints
    const constraintErrors = validateFileConstraints(fileBuffer.length, orders.length);
    if (constraintErrors.length > 0) {
      return NextResponse.json(
        {
          error: constraintErrors[0].message,
        },
        { status: 400 }
      );
    }

    // Generate file hash for idempotency
    const fileHash = await generateFileHash(fileBuffer);

    // Log brandId status for debugging
    console.log("[Import Upload] User profile info", {
      userId: user.id,
      roleName: profile.role_name,
      brandId: profile.brand_id,
      hasBrandId: !!profile.brand_id,
    });

    // Return parsed orders for preview
    // For distributor_admin, use their distributor_id if not extracted from sheet
    const finalDistributorId = parseResult.extractedDistributorId || distributorId;
    
    return NextResponse.json({
      success: true,
      data: {
        orders,
        totalCount: orders.length,
        fileHash,
        fileName: file.name,
        fileSize: stats.size,
        brandId: profile.brand_id,
        extractedDistributorId: parseResult.extractedDistributorId,
        distributorIdConsistent: parseResult.distributorIdConsistent,
        distributorId: finalDistributorId, // Include distributor_id for distributor_admin
      },
    });
  } catch (error: any) {
    console.error("[Import Upload] Fatal error in import orders API", {
      error: error,
      message: error.message,
      stack: error.stack,
      fileName: (error as any).fileName,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

