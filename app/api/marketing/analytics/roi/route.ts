import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for access control
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Parse query parameters
    const campaignId = searchParams.get("campaignId");
    const brandId = searchParams.get("brandId");
    const distributorId = searchParams.get("distributorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const analysisType = searchParams.get("type") || "summary"; // summary, channel, distributor, trend

    // Apply access control for parameters
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_manager"].includes(profile.role_name);
    
    let effectiveBrandId = brandId;
    let effectiveDistributorId = distributorId;

    if (!isSuperAdmin) {
      if (isBrandAdmin) {
        effectiveBrandId = profile.brand_id;
      } else {
        effectiveDistributorId = profile.distributor_id;
      }
    }

    switch (analysisType) {
      case "summary":
        return await getCampaignROISummary(supabase, {
          campaignId,
          brandId: effectiveBrandId,
          distributorId: effectiveDistributorId,
          startDate,
          endDate,
        });

      case "channel":
        return await getChannelPerformance(supabase, {
          brandId: effectiveBrandId,
          distributorId: effectiveDistributorId,
          startDate,
          endDate,
        });

      case "distributor":
        return await getDistributorPerformance(supabase, {
          brandId: effectiveBrandId,
          periodMonths: parseInt(searchParams.get("periodMonths") || "12"),
        });

      case "trend":
        return await getROITrend(supabase, {
          brandId: effectiveBrandId,
          distributorId: effectiveDistributorId,
          periodMonths: parseInt(searchParams.get("periodMonths") || "12"),
          granularity: searchParams.get("granularity") || "monthly",
        });

      case "alerts":
        return await getPerformanceAlerts(supabase, {
          brandId: effectiveBrandId,
          distributorId: effectiveDistributorId,
        });

      default:
        return NextResponse.json(
          { error: "Invalid analysis type. Use: summary, channel, distributor, trend, or alerts" },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error("Unexpected error in ROI analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getCampaignROISummary(supabase: any, params: any) {
  const { data, error } = await supabase.rpc("get_campaign_roi_summary", {
    p_campaign_id: params.campaignId,
    p_brand_id: params.brandId,
    p_distributor_id: params.distributorId,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
  });

  if (error) {
    console.error("Error fetching ROI summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch ROI summary" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

async function getChannelPerformance(supabase: any, params: any) {
  const { data, error } = await supabase.rpc("get_channel_performance_analysis", {
    p_brand_id: params.brandId,
    p_distributor_id: params.distributorId,
    p_date_from: params.startDate,
    p_date_to: params.endDate,
  });

  if (error) {
    console.error("Error fetching channel performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel performance" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

async function getDistributorPerformance(supabase: any, params: any) {
  const { data, error } = await supabase.rpc("get_distributor_campaign_performance", {
    p_brand_id: params.brandId,
    p_period_months: params.periodMonths,
  });

  if (error) {
    console.error("Error fetching distributor performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch distributor performance" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

async function getROITrend(supabase: any, params: any) {
  const { data, error } = await supabase.rpc("get_roi_trend_analysis", {
    p_brand_id: params.brandId,
    p_distributor_id: params.distributorId,
    p_period_months: params.periodMonths,
    p_granularity: params.granularity,
  });

  if (error) {
    console.error("Error fetching ROI trend:", error);
    return NextResponse.json(
      { error: "Failed to fetch ROI trend" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

async function getPerformanceAlerts(supabase: any, params: any) {
  const { data, error } = await supabase.rpc("get_campaign_performance_alerts", {
    p_brand_id: params.brandId,
    p_distributor_id: params.distributorId,
  });

  if (error) {
    console.error("Error fetching performance alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance alerts" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}