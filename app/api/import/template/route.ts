import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateOrderTemplate, getTemplateFilename } from "@/lib/excel/template-generator";

/**
 * GET /api/import/template
 * Generate and download Excel template
 * Query params: ?type=orders&brandId=xxx&distributorId=xxx
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
      .select("role_name, brand_id, distributor_id")
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
    const type = searchParams.get("type") || "orders";
    const brandId = searchParams.get("brandId") || profile.brand_id;
    
    // For distributor_admin, auto-populate distributorId from profile
    const isDistributorAdmin = profile.role_name?.startsWith("distributor_");
    const distributorId = searchParams.get("distributorId") || 
                         (isDistributorAdmin && profile.distributor_id ? profile.distributor_id : undefined);

    // Validate type
    if (type !== "orders") {
      return NextResponse.json(
        { error: "Invalid import type. Currently only 'orders' is supported" },
        { status: 400 }
      );
    }

    // Validate brand access
    const isSuperAdmin = profile.role_name === "super_admin";
    if (!isSuperAdmin && profile.brand_id !== brandId) {
      return NextResponse.json(
        { error: "You do not have access to this brand" },
        { status: 403 }
      );
    }

    // For distributor_admin, ensure they can only download template for their distributor
    if (isDistributorAdmin && profile.distributor_id && distributorId) {
      if (distributorId !== profile.distributor_id) {
        return NextResponse.json(
          { error: "You can only download templates for your assigned distributor" },
          { status: 403 }
        );
      }
    }

    // Generate template
    const buffer = await generateOrderTemplate({
      brandId: brandId!,
      distributorId,
      includeInstructions: true,
      includeSampleData: true,
    });

    // Get filename
    const filename = getTemplateFilename(type);

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
    console.error("Error generating template:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate template",
      },
      { status: 500 }
    );
  }
}
