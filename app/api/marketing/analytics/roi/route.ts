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
  // Try the RPC function first, fall back to direct query if it doesn't exist
  const { data, error } = await supabase.rpc("get_campaign_roi_summary", {
    p_campaign_id: params.campaignId,
    p_brand_id: params.brandId,
    p_distributor_id: params.distributorId,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
  });

  // If RPC function doesn't exist, implement fallback logic
  if (error && error.code === 'PGRST202') {
    console.log("ROI summary function not found, using fallback");
    return await getFallbackROISummary(supabase, params);
  }

  if (error) {
    console.error("Error fetching ROI summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch ROI summary" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

async function getFallbackROISummary(supabase: any, params: any) {
  try {
    let query = supabase
      .from("marketing_campaigns")
      .select(`
        id,
        name,
        total_budget,
        spent_budget,
        total_revenue,
        actual_roi_percentage,
        return_on_ad_spend,
        campaign_type,
        channel,
        status,
        start_date,
        end_date
      `);

    // Apply filters
    if (params.campaignId) {
      query = query.eq("id", params.campaignId);
    }
    if (params.brandId) {
      query = query.eq("brand_id", params.brandId);
    }
    if (params.distributorId) {
      query = query.eq("distributor_id", params.distributorId);
    }
    if (params.startDate) {
      query = query.gte("start_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("end_date", params.endDate);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to ROI summary format
    const roiSummary = campaigns?.map(campaign => ({
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalSpent: campaign.spent_budget || 0,
      totalRevenue: campaign.total_revenue || 0,
      roiPercentage: campaign.actual_roi_percentage || 0,
      roas: campaign.return_on_ad_spend || 0,
      campaignType: campaign.campaign_type,
      channel: campaign.channel,
      period: `${campaign.start_date} to ${campaign.end_date}`,
    })) || [];

    return NextResponse.json(roiSummary);
  } catch (error) {
    console.error("Error in fallback ROI summary:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
}

async function getChannelPerformance(supabase: any, params: any) {
  const { data, error } = await supabase.rpc("get_channel_performance_analysis", {
    p_brand_id: params.brandId,
    p_distributor_id: params.distributorId,
    p_date_from: params.startDate,
    p_date_to: params.endDate,
  });

  // If RPC function doesn't exist, implement fallback logic
  if (error && error.code === 'PGRST202') {
    console.log("Channel performance function not found, using fallback");
    return await getFallbackChannelPerformance(supabase, params);
  }

  if (error) {
    console.error("Error fetching channel performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel performance" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

async function getFallbackChannelPerformance(supabase: any, params: any) {
  try {
    let query = supabase
      .from("marketing_campaigns")
      .select(`
        channel,
        total_budget,
        spent_budget,
        total_revenue,
        actual_roi_percentage,
        return_on_ad_spend,
        status
      `);

    // Apply filters
    if (params.brandId) {
      query = query.eq("brand_id", params.brandId);
    }
    if (params.distributorId) {
      query = query.eq("distributor_id", params.distributorId);
    }
    if (params.startDate) {
      query = query.gte("start_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("end_date", params.endDate);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      throw error;
    }

    // Group by channel and calculate performance
    const channelMap = new Map();
    
    campaigns?.forEach(campaign => {
      if (!campaign.channel) return;
      
      const existing = channelMap.get(campaign.channel) || {
        channel: campaign.channel,
        campaignCount: 0,
        totalBudget: 0,
        totalSpent: 0,
        totalRevenue: 0,
        averageRoi: 0,
        averageRoas: 0,
        roiSum: 0,
        roasSum: 0,
        roiCount: 0,
        roasCount: 0,
      };
      
      existing.campaignCount += 1;
      existing.totalBudget += campaign.total_budget || 0;
      existing.totalSpent += campaign.spent_budget || 0;
      existing.totalRevenue += campaign.total_revenue || 0;
      
      if (campaign.actual_roi_percentage !== null && campaign.actual_roi_percentage !== undefined) {
        existing.roiSum += campaign.actual_roi_percentage;
        existing.roiCount += 1;
      }
      
      if (campaign.return_on_ad_spend !== null && campaign.return_on_ad_spend !== undefined) {
        existing.roasSum += campaign.return_on_ad_spend;
        existing.roasCount += 1;
      }
      
      channelMap.set(campaign.channel, existing);
    });

    // Calculate averages and format output
    const channelPerformance = Array.from(channelMap.values()).map(channel => ({
      channel: channel.channel,
      campaignCount: channel.campaignCount,
      totalBudget: channel.totalBudget,
      totalSpent: channel.totalSpent,
      totalRevenue: channel.totalRevenue,
      averageRoi: channel.roiCount > 0 ? channel.roiSum / channel.roiCount : 0,
      averageRoas: channel.roasCount > 0 ? channel.roasSum / channel.roasCount : 0,
      efficiency: channel.totalSpent > 0 ? (channel.totalRevenue / channel.totalSpent) : 0,
    }));

    return NextResponse.json(channelPerformance);
  } catch (error) {
    console.error("Error in fallback channel performance:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
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

  // If RPC function doesn't exist, implement fallback logic
  if (error && error.code === 'PGRST202') {
    console.log("Performance alerts function not found, using fallback");
    return await getFallbackPerformanceAlerts(supabase, params);
  }

  if (error) {
    console.error("Error fetching performance alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance alerts" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

async function getFallbackPerformanceAlerts(supabase: any, params: any) {
  try {
    let query = supabase
      .from("marketing_campaigns")
      .select(`
        id,
        name,
        total_budget,
        spent_budget,
        total_revenue,
        actual_roi_percentage,
        target_roi_percentage,
        status,
        end_date,
        start_date
      `)
      .in("status", ["active", "paused"]);

    // Apply filters
    if (params.brandId) {
      query = query.eq("brand_id", params.brandId);
    }
    if (params.distributorId) {
      query = query.eq("distributor_id", params.distributorId);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      throw error;
    }

    const alerts: any[] = [];
    const now = new Date();

    campaigns?.forEach(campaign => {
      const endDate = new Date(campaign.end_date);
      const startDate = new Date(campaign.start_date);
      const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const budgetUtilization = campaign.total_budget > 0 ? (campaign.spent_budget / campaign.total_budget) * 100 : 0;

      // Budget overspend alert
      if (budgetUtilization > 100) {
        alerts.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          alertType: "budget_overspend",
          alertMessage: `Campaign has exceeded budget by ${(budgetUtilization - 100).toFixed(1)}%`,
          alertSeverity: "critical",
          createdAt: now.toISOString(),
        });
      }
      // Budget warning
      else if (budgetUtilization > 85) {
        alerts.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          alertType: "budget_warning",
          alertMessage: `Campaign has used ${budgetUtilization.toFixed(1)}% of budget`,
          alertSeverity: "warning",
          createdAt: now.toISOString(),
        });
      }

      // ROI performance alert
      if (campaign.target_roi_percentage && campaign.actual_roi_percentage !== null) {
        if (campaign.actual_roi_percentage < campaign.target_roi_percentage * 0.5) {
          alerts.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: "low_roi",
            alertMessage: `ROI is significantly below target (${campaign.actual_roi_percentage.toFixed(1)}% vs ${campaign.target_roi_percentage}% target)`,
            alertSeverity: "critical",
            createdAt: now.toISOString(),
          });
        }
      }

      // Campaign ending soon
      if (daysUntilEnd <= 7 && daysUntilEnd > 0) {
        alerts.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          alertType: "campaign_ending",
          alertMessage: `Campaign ends in ${daysUntilEnd} day${daysUntilEnd !== 1 ? 's' : ''}`,
          alertSeverity: "info",
          createdAt: now.toISOString(),
        });
      }
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error in fallback performance alerts:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
}