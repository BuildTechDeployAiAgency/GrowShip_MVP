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
    const type = searchParams.get("type") || "orders";
    const brandId = searchParams.get("brandId") || profile.brand_id;
    const distributorId = searchParams.get("distributorId") || undefined;

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

    // Generate template
    const buffer = await generateOrderTemplate({
      brandId: brandId!,
      distributorId,
      includeInstructions: true,
      includeSampleData: true,
    });

    // Get filename
    const filename = getTemplateFilename(type);

    // Return file
    return new NextResponse(buffer, {
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

