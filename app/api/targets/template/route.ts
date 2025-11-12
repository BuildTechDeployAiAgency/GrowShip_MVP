import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTargetTemplate, getTargetTemplateFilename } from "@/lib/excel/target-template-generator";

/**
 * GET /api/targets/template
 * Generate and download Excel template for targets
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get("brandId") || profile.brand_id;

    // Validate brand access
    const isSuperAdmin = profile.role_name === "super_admin";
    if (!isSuperAdmin && profile.brand_id !== brandId) {
      return NextResponse.json(
        { error: "You do not have access to this brand" },
        { status: 403 }
      );
    }

    // Generate template
    const buffer = await generateTargetTemplate({
      brandId: brandId!,
      includeInstructions: true,
      includeSampleData: true,
    });

    // Get filename
    const filename = getTargetTemplateFilename();

    // Return file using a Uint8Array to satisfy the Edge runtime type expectations
    const fileArray: Uint8Array =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    const underlyingBuffer = fileArray.buffer as ArrayBuffer;
    const payload =
      fileArray.byteOffset === 0 && fileArray.byteLength === underlyingBuffer.byteLength
        ? underlyingBuffer
        : underlyingBuffer.slice(
            fileArray.byteOffset,
            fileArray.byteOffset + fileArray.byteLength
          );

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating target template:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate template",
      },
      { status: 500 }
    );
  }
}

