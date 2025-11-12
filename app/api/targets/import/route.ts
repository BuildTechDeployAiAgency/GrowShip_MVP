import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseTargetsExcel } from "@/lib/excel/target-parser";
import { validateTargetFileConstraints } from "@/lib/excel/target-validator";
import { generateFileHash } from "@/utils/idempotency";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/targets/import
 * Upload and parse Excel file, return preview of targets
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

    // Parse the Excel file
    let parseResult;
    try {
      console.log("[Target Import Upload] Parsing Excel file", {
        fileName: file.name,
        fileSize: file.size,
        userId: user.id,
      });
      parseResult = await parseTargetsExcel(fileBuffer);
      console.log("[Target Import Upload] File parsed successfully", {
        targetsCount: parseResult.targets.length,
        fileName: file.name,
      });
    } catch (parseError: any) {
      console.error("[Target Import Upload] Error parsing Excel file", {
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

    const targets = parseResult.targets;

    // Validate file constraints
    const constraintErrors = validateTargetFileConstraints(fileBuffer.length, targets.length);
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

    // Return parsed targets for preview
    return NextResponse.json({
      success: true,
      data: {
        targets,
        totalCount: targets.length,
        fileHash,
        fileName: file.name,
        fileSize: fileBuffer.length,
        brandId: profile.brand_id,
      },
    });
  } catch (error: any) {
    console.error("[Target Import Upload] Fatal error in import targets API", {
      error: error,
      message: error.message,
      stack: error.stack,
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

