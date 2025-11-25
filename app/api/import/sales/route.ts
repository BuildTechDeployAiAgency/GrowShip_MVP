import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSalesExcel, getSalesFileStats } from "@/lib/excel/sales-parser";
import { createHash } from "crypto";

/**
 * POST /api/import/sales
 * Upload and parse sales data Excel file
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
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    if (!profile.brand_id) {
      return NextResponse.json(
        { error: "Brand ID not found. Please ensure your account is associated with a brand." },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate file hash for tracking
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // Get file statistics
    const fileStats = getSalesFileStats(buffer);

    console.log(`[Sales Import] Parsing file: ${file.name} (${fileStats.sizeMB}MB, hash: ${fileHash.substring(0, 8)}...)`);

    // Parse Excel file
    const isDistributorUser = profile.role_name?.startsWith("distributor_");
    const autoPopulateData = {
      brandId: profile.brand_id,
      distributorId: isDistributorUser ? profile.distributor_id : undefined,
    };

    const parseResult = await parseSalesExcel(buffer, autoPopulateData);

    console.log(`[Sales Import] Parsed ${parseResult.salesRows.length} sales rows`);
    console.log(`[Sales Import] Extracted distributor ID: ${parseResult.extractedDistributorId || "none"}`);
    console.log(`[Sales Import] Distributor ID consistent: ${parseResult.distributorIdConsistent}`);

    // Return parsed data
    return NextResponse.json({
      success: true,
      data: {
        salesRows: parseResult.salesRows,
        totalCount: parseResult.salesRows.length,
        fileHash,
        fileName: file.name,
        fileSize: file.size,
        brandId: profile.brand_id,
        extractedDistributorId: parseResult.extractedDistributorId,
        distributorIdConsistent: parseResult.distributorIdConsistent,
      },
    });
  } catch (error: any) {
    console.error("[Sales Import] Parse error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to parse sales data file",
      },
      { status: 500 }
    );
  }
}

