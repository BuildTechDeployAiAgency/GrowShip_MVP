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

    // Get user profile with role
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

    // Parse the Excel file
    let orders;
    try {
      orders = await parseOrdersExcel(fileBuffer);
    } catch (parseError: any) {
      console.error("Error parsing Excel file:", parseError);
      return NextResponse.json(
        {
          error: `Failed to parse Excel file: ${parseError.message}`,
        },
        { status: 400 }
      );
    }

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

    // Return parsed orders for preview
    return NextResponse.json({
      success: true,
      data: {
        orders,
        totalCount: orders.length,
        fileHash,
        fileName: file.name,
        fileSize: stats.size,
        brandId: profile.brand_id,
      },
    });
  } catch (error: any) {
    console.error("Error in import orders API:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

