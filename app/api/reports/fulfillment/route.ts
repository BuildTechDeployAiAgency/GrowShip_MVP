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

    if (!profile || (!profile.brand_id && profile.role_name !== "super_admin")) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const brandId = profile.role_name === "super_admin"
      ? request.nextUrl.searchParams.get("brand_id") || profile.brand_id
      : profile.brand_id;

    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    const startDate = request.nextUrl.searchParams.get("start_date");
    const endDate = request.nextUrl.searchParams.get("end_date");

    const { data, error } = await supabase.rpc("get_order_fulfillment_metrics", {
      p_brand_id: brandId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      // Check if RPC function doesn't exist
      const isFunctionNotFound = 
        error.code === "P0004" || 
        error.message?.includes("Could not find the function") ||
        error.message?.includes("does not exist") ||
        error.code === "42883";

      if (isFunctionNotFound) {
        console.warn("RPC function 'get_order_fulfillment_metrics' not found. Returning empty metrics.");
        return NextResponse.json({ 
          metrics: {
            total_orders: 0,
            orders_shipped: 0,
            orders_delivered: 0,
            orders_pending: 0,
            orders_cancelled: 0,
            fulfillment_rate: 0,
            delivery_rate: 0,
            avg_delivery_days: 0,
          },
          _warning: "Function not available"
        });
      }

      console.error("Error fetching fulfillment metrics:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ metrics: data?.[0] || null });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


