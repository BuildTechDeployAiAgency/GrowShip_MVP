import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateForecast, compareForecasts, AlgorithmType } from "@/lib/forecasting/forecast-engine";
import { HistoricalDataPoint } from "@/lib/forecasting/exponential-smoothing";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      brand_id,
      sku,
      forecast_period_start,
      forecast_period_end,
      algorithm_version = "simple_moving_average",
      compare_algorithms = false,
    } = body;

    const finalBrandId = profile.role_name === "super_admin"
      ? (brand_id || profile.brand_id)
      : profile.brand_id;

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Get historical sales data from orders
    const { data: orders } = await supabase
      .from("orders")
      .select("order_date, items")
      .eq("brand_id", finalBrandId)
      .gte("order_date", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order("order_date", { ascending: true });

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: "Insufficient historical data for forecasting" },
        { status: 400 }
      );
    }

    // Extract SKU-level sales
    const skuSales: Record<string, { quantity: number; revenue: number; date: string }[]> = {};

    orders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemSku = item.sku;
          if (!skuSales[itemSku]) {
            skuSales[itemSku] = [];
          }
          skuSales[itemSku].push({
            quantity: item.quantity || 0,
            revenue: item.total || 0,
            date: order.order_date,
          });
        });
      }
    });

    // Calculate forecast period in months
    const startDate = new Date(forecast_period_start || new Date().toISOString());
    const endDate = new Date(forecast_period_end || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const monthsDiff = Math.max(1, Math.ceil(daysDiff / 30));

    // Generate forecasts using the forecast engine
    const forecasts = Object.entries(skuSales).map(([skuKey, sales]) => {
      if (sku && skuKey !== sku) return null;

      // Aggregate sales by month for historical data
      const monthlySales: Record<string, { quantity: number; revenue: number }> = {};
      sales.forEach((sale) => {
        const month = sale.date.substring(0, 7); // YYYY-MM
        if (!monthlySales[month]) {
          monthlySales[month] = { quantity: 0, revenue: 0 };
        }
        monthlySales[month].quantity += sale.quantity;
        monthlySales[month].revenue += sale.revenue;
      });

      // Convert to historical data points format
      const historicalData: HistoricalDataPoint[] = Object.entries(monthlySales)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          date: `${month}-01`, // First day of month
          quantity: data.quantity,
          revenue: data.revenue,
        }));

      if (historicalData.length === 0) return null;

      let forecastResult;
      let algorithmComparison: Record<string, any> | undefined;

      if (compare_algorithms) {
        // Compare all algorithms
        const comparisons = compareForecasts(historicalData, monthsDiff);
        algorithmComparison = comparisons;
        // Use the selected algorithm
        forecastResult = comparisons[algorithm_version as AlgorithmType] || comparisons.simple_moving_average;
      } else {
        // Use single algorithm
        forecastResult = generateForecast({
          historicalData,
          periodsAhead: monthsDiff,
          algorithm: algorithm_version as AlgorithmType,
        });
      }

      return {
        brand_id: finalBrandId,
        sku: skuKey,
        forecast_period_start: startDate.toISOString().split("T")[0],
        forecast_period_end: endDate.toISOString().split("T")[0],
        forecasted_quantity: forecastResult.forecasted_quantity,
        forecasted_revenue: forecastResult.forecasted_revenue,
        confidence_level: forecastResult.confidence_level,
        algorithm_version: forecastResult.algorithm_used,
        input_data_snapshot: {
          months_analyzed: historicalData.length,
          periods_ahead: monthsDiff,
          algorithm_metadata: forecastResult.algorithm_metadata,
          algorithm_comparison: algorithmComparison,
        },
        created_by: user.id,
      };
    }).filter((f): f is NonNullable<typeof f> => f !== null);

    if (forecasts.length === 0) {
      return NextResponse.json(
        { error: "No forecasts generated" },
        { status: 400 }
      );
    }

    // Insert forecasts
    const { data, error } = await supabase
      .from("demand_forecasts")
      .upsert(forecasts, {
        onConflict: "brand_id,sku,forecast_period_start,forecast_period_end",
      })
      .select();

    if (error) {
      console.error("Error creating forecasts:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ forecasts: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


