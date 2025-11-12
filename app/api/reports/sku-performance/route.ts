import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/reports/sku-performance
 * Get SKU performance report data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("brand_id, role_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sku = searchParams.get("sku");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const brandId = searchParams.get("brand_id");

    const finalBrandId = profile.role_name === "super_admin"
      ? (brandId || profile.brand_id)
      : profile.brand_id;

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Use admin client to call RPC function
    const adminSupabase = createAdminClient();

    const { data: reportData, error: reportError } = await adminSupabase.rpc(
      "get_sku_performance_report",
      {
        p_brand_id: finalBrandId,
        p_sku: sku || null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      }
    );

    if (reportError) {
      console.error("Error fetching SKU performance report:", reportError);
      return NextResponse.json(
        { error: reportError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: reportData || [],
      total: reportData?.length || 0,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

