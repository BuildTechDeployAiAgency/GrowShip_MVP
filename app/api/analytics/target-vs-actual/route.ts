import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Get user's brand_id
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
    const periodType = searchParams.get("period_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let query = supabase
      .from("target_vs_actual_view")
      .select("*")
      .order("target_period", { ascending: false });

    // Apply brand filter (unless super admin)
    if (profile.role_name !== "super_admin" && profile.brand_id) {
      query = query.eq("brand_id", profile.brand_id);
    }

    if (sku) {
      query = query.eq("sku", sku);
    }

    if (periodType) {
      query = query.eq("period_type", periodType);
    }

    if (startDate) {
      query = query.gte("target_period", startDate);
    }

    if (endDate) {
      query = query.lte("target_period", endDate);
    }

    const { data, error } = await query;

    if (error) {
      // Check if view doesn't exist
      const isViewNotFound = 
        error.code === "42P01" || 
        error.message?.includes("does not exist") ||
        error.message?.includes("relation") && error.message?.includes("does not exist");

      if (isViewNotFound) {
        console.warn("View 'target_vs_actual_view' not found. Returning empty data.");
        return NextResponse.json({
          data: [],
          summary: {
            total_targets: 0,
            over_performing_skus: 0,
            under_performing_skus: 0,
          },
          _warning: "View not available"
        });
      }

      console.error("Error fetching target vs actual data:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Calculate variance and categorize performance
    const enrichedData = (data || []).map((item: any) => {
      const quantityVariance = item.quantity_variance_percent || 0;
      const revenueVariance = item.revenue_variance_percent || 0;

      return {
        ...item,
        quantity_variance_percent: quantityVariance,
        revenue_variance_percent: revenueVariance,
        quantity_performance: quantityVariance >= 0 ? "over" : "under",
        revenue_performance: revenueVariance >= 0 ? "over" : "under",
      };
    });

    return NextResponse.json({
      data: enrichedData,
      summary: {
        total_targets: enrichedData.length,
        over_performing_skus: enrichedData.filter(
          (item: any) => item.quantity_variance_percent > 0 || item.revenue_variance_percent > 0
        ).length,
        under_performing_skus: enrichedData.filter(
          (item: any) => item.quantity_variance_percent < 0 || item.revenue_variance_percent < 0
        ).length,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


