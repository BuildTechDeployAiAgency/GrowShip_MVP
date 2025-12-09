import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateCampaignRequest, CampaignFilters } from "@/types/marketing";

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

    // Parse query parameters for filtering
    const filters: CampaignFilters = {
      brandId: searchParams.get("brandId") || undefined,
      distributorId: searchParams.get("distributorId") || undefined,
      status: searchParams.get("status")?.split(",") as any,
      campaignType: searchParams.get("campaignType")?.split(",") as any,
      channel: searchParams.get("channel")?.split(",") as any,
      startDateFrom: searchParams.get("startDateFrom") || undefined,
      startDateTo: searchParams.get("startDateTo") || undefined,
      endDateFrom: searchParams.get("endDateFrom") || undefined,
      endDateTo: searchParams.get("endDateTo") || undefined,
      minBudget: searchParams.get("minBudget") ? parseFloat(searchParams.get("minBudget")!) : undefined,
      maxBudget: searchParams.get("maxBudget") ? parseFloat(searchParams.get("maxBudget")!) : undefined,
      minROI: searchParams.get("minROI") ? parseFloat(searchParams.get("minROI")!) : undefined,
      maxROI: searchParams.get("maxROI") ? parseFloat(searchParams.get("maxROI")!) : undefined,
      search: searchParams.get("search") || undefined,
    };

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    // Sorting
    const sortField = searchParams.get("sortField") || "created_at";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    // Build query with access control
    let query = supabase
      .from("marketing_campaigns")
      .select(`
        id,
        name,
        description,
        campaign_code,
        brand_id,
        distributor_id,
        region_id,
        country_code,
        campaign_type,
        channel,
        target_audience,
        total_budget,
        allocated_budget,
        spent_budget,
        remaining_budget,
        fund_source,
        brand_contribution,
        distributor_contribution,
        start_date,
        end_date,
        launch_date,
        status,
        approval_status,
        target_reach,
        target_impressions,
        target_leads,
        target_sales_amount,
        target_roi_percentage,
        actual_reach,
        actual_impressions,
        actual_leads,
        actual_sales_amount,
        actual_roi_percentage,
        total_revenue,
        attributed_orders,
        cost_per_acquisition,
        return_on_ad_spend,
        created_by,
        approved_by,
        approved_at,
        tags,
        external_campaign_id,
        created_at,
        updated_at
      `, { count: "exact" });

    // Apply access control
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_manager"].includes(profile.role_name);
    
    if (!isSuperAdmin) {
      if (isBrandAdmin) {
        // Brand admins can see all campaigns for their brand
        query = query.eq("brand_id", profile.brand_id);
      } else {
        // Distributors can only see campaigns assigned to them
        query = query.eq("distributor_id", profile.distributor_id);
      }
    }

    // Apply filters
    if (filters.brandId) {
      query = query.eq("brand_id", filters.brandId);
    }
    if (filters.distributorId) {
      query = query.eq("distributor_id", filters.distributorId);
    }
    if (filters.status && filters.status.length > 0) {
      query = query.in("status", filters.status);
    }
    if (filters.campaignType && filters.campaignType.length > 0) {
      query = query.in("campaign_type", filters.campaignType);
    }
    if (filters.channel && filters.channel.length > 0) {
      query = query.in("channel", filters.channel);
    }
    if (filters.startDateFrom) {
      query = query.gte("start_date", filters.startDateFrom);
    }
    if (filters.startDateTo) {
      query = query.lte("start_date", filters.startDateTo);
    }
    if (filters.endDateFrom) {
      query = query.gte("end_date", filters.endDateFrom);
    }
    if (filters.endDateTo) {
      query = query.lte("end_date", filters.endDateTo);
    }
    if (filters.minBudget !== undefined) {
      query = query.gte("total_budget", filters.minBudget);
    }
    if (filters.maxBudget !== undefined) {
      query = query.lte("total_budget", filters.maxBudget);
    }
    if (filters.minROI !== undefined) {
      query = query.gte("actual_roi_percentage", filters.minROI);
    }
    if (filters.maxROI !== undefined) {
      query = query.lte("actual_roi_percentage", filters.maxROI);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,campaign_code.ilike.%${filters.search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortField, { ascending: sortDirection === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: campaigns, error, count } = await query;

    if (error) {
      console.error("Error fetching campaigns:", error);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    return NextResponse.json({
      campaigns: campaigns || [],
      totalCount: count || 0,
      totalPages,
      currentPage: page,
      pageSize,
    });

  } catch (error: any) {
    console.error("Unexpected error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body: CreateCampaignRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.campaignType || !body.channel || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, campaignType, channel, startDate, endDate" },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Validate budget
    if (body.totalBudget < 0 || body.allocatedBudget < 0) {
      return NextResponse.json(
        { error: "Budget amounts cannot be negative" },
        { status: 400 }
      );
    }

    if (body.allocatedBudget > body.totalBudget) {
      return NextResponse.json(
        { error: "Allocated budget cannot exceed total budget" },
        { status: 400 }
      );
    }

    // Validate contributions
    const totalContribution = body.brandContribution + body.distributorContribution;
    if (totalContribution > body.totalBudget) {
      return NextResponse.json(
        { error: "Total contributions cannot exceed total budget" },
        { status: 400 }
      );
    }

    // Check access permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_manager"].includes(profile.role_name);
    
    if (!isSuperAdmin && !isBrandAdmin) {
      return NextResponse.json(
        { error: "Insufficient permissions to create campaigns" },
        { status: 403 }
      );
    }

    // For non-super admins, ensure brand_id matches their organization
    if (!isSuperAdmin) {
      if (body.brandId !== profile.brand_id) {
        return NextResponse.json(
          { error: "You can only create campaigns for your brand" },
          { status: 403 }
        );
      }
    }

    // Generate campaign code if not provided
    const campaignCode = body.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 20) + '_' + Date.now().toString().slice(-6);

    // Prepare campaign data
    const campaignData = {
      name: body.name,
      description: body.description,
      campaign_code: campaignCode,
      brand_id: body.brandId,
      distributor_id: body.distributorId,
      region_id: body.regionId,
      country_code: body.countryCode,
      campaign_type: body.campaignType,
      channel: body.channel,
      target_audience: body.targetAudience,
      total_budget: body.totalBudget,
      allocated_budget: body.allocatedBudget,
      spent_budget: 0,
      fund_source: body.fundSource,
      brand_contribution: body.brandContribution || 0,
      distributor_contribution: body.distributorContribution || 0,
      start_date: body.startDate,
      end_date: body.endDate,
      status: 'draft',
      approval_status: 'pending',
      target_reach: body.targetRoiPercentage,
      target_sales_amount: body.targetSalesAmount,
      actual_reach: 0,
      actual_impressions: 0,
      actual_leads: 0,
      actual_sales_amount: 0,
      actual_roi_percentage: 0,
      total_revenue: 0,
      attributed_orders: 0,
      created_by: user.id,
      tags: body.tags || [],
    };

    // Insert campaign
    const { data: campaign, error: insertError } = await supabase
      .from("marketing_campaigns")
      .insert(campaignData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating campaign:", insertError);
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json(campaign, { status: 201 });

  } catch (error: any) {
    console.error("Unexpected error creating campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}