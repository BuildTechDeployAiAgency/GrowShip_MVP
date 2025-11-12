import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/forecasting
 * Retrieve existing forecasts with optional filters
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
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const brandId = searchParams.get("brand_id");
    const algorithm = searchParams.get("algorithm");

    const finalBrandId = profile.role_name === "super_admin"
      ? (brandId || profile.brand_id)
      : profile.brand_id;

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("demand_forecasts")
      .select("*")
      .eq("brand_id", finalBrandId)
      .order("forecast_period_start", { ascending: false });

    if (sku) {
      query = query.eq("sku", sku);
    }

    if (startDate) {
      query = query.gte("forecast_period_start", startDate);
    }

    if (endDate) {
      query = query.lte("forecast_period_end", endDate);
    }

    if (algorithm) {
      query = query.eq("algorithm_version", algorithm);
    }

    const { data: forecasts, error } = await query;

    if (error) {
      console.error("Error fetching forecasts:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get actual sales data for comparison
    const forecastsWithActuals = await Promise.all(
      (forecasts || []).map(async (forecast) => {
        // Get actual sales for the forecast period
        const { data: orders } = await supabase
          .from("orders")
          .select("order_date, items")
          .eq("brand_id", finalBrandId)
          .gte("order_date", forecast.forecast_period_start)
          .lte("order_date", forecast.forecast_period_end);

        let actualQuantity = 0;
        let actualRevenue = 0;

        if (orders) {
          orders.forEach((order) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                if (item.sku === forecast.sku) {
                  actualQuantity += item.quantity || 0;
                  actualRevenue += item.total || 0;
                }
              });
            }
          });
        }

        return {
          ...forecast,
          actual_quantity: actualQuantity,
          actual_revenue: actualRevenue,
          quantity_variance: forecast.forecasted_quantity > 0
            ? ((actualQuantity - forecast.forecasted_quantity) / forecast.forecasted_quantity) * 100
            : 0,
          revenue_variance: forecast.forecasted_revenue > 0
            ? ((actualRevenue - forecast.forecasted_revenue) / forecast.forecasted_revenue) * 100
            : 0,
        };
      })
    );

    return NextResponse.json({
      forecasts: forecastsWithActuals,
      total: forecastsWithActuals.length,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

