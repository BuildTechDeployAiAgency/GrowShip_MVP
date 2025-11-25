import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseProductsExcel, getProductFileStats } from "@/lib/excel/product-parser";
import { validateProductFileConstraints } from "@/lib/excel/product-validator";
import { generateFileHash } from "@/utils/idempotency";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/import/products
 * Upload and parse Excel file, return preview of products
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

    // Get user profile with role and brand info
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
    const buffer = Buffer.from(arrayBuffer);

    // Validate file constraints
    const fileValidation = validateProductFileConstraints(file.size, file.name);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // Generate file hash for idempotency
    const fileHash = generateFileHash(buffer);

    // Parse Excel file
    try {
      const { products, errors } = await parseProductsExcel(buffer, profile.brand_id);
      const fileStats = getProductFileStats(buffer);

      // If no products were parsed but we have errors, return them
      if (products.length === 0 && errors.length > 0) {
        console.error("No products parsed, errors:", errors);
        return NextResponse.json(
          { 
            error: `Failed to parse any products. Issues found:\n${errors.join("\n")}`,
            success: false,
          },
          { status: 400 }
        );
      }

      // Log if we have partial success (some products, some errors)
      if (errors.length > 0) {
        console.warn(`Parsed ${products.length} products with ${errors.length} row errors:`, errors);
      }

      return NextResponse.json({
        success: true,
        data: {
          products,
          totalCount: products.length,
          fileHash,
          fileName: file.name,
          fileSize: fileStats.size,
          brandId: profile.brand_id,
          extractedDistributorId: undefined,
          distributorIdConsistent: true,
        },
      });
    } catch (parseError: any) {
      console.error("Error parsing products file:", parseError);
      return NextResponse.json(
        { error: `Failed to parse file: ${parseError.message}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error in products import upload:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

