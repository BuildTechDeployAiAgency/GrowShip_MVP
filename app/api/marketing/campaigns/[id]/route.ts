import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UpdateCampaignRequest } from "@/types/marketing";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

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
      `)
      .eq("id", id);

    // Apply access control
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_manager"].includes(profile.role_name);
    
    if (!isSuperAdmin) {
      if (isBrandAdmin) {
        query = query.eq("brand_id", profile.brand_id);
      } else {
        query = query.eq("distributor_id", profile.distributor_id);
      }
    }

    const { data: campaign, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      console.error("Error fetching campaign:", error);
      return NextResponse.json(
        { error: "Failed to fetch campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json(campaign);

  } catch (error: any) {
    console.error("Unexpected error fetching campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

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

    const body: UpdateCampaignRequest = await request.json();

    // Get existing campaign for validation and access control
    const { data: existingCampaign, error: fetchError } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Failed to fetch campaign" },
        { status: 500 }
      );
    }

    // Check access permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_manager"].includes(profile.role_name);
    const hasAccess = isSuperAdmin || 
                     (isBrandAdmin && existingCampaign.brand_id === profile.brand_id) ||
                     existingCampaign.distributor_id === profile.distributor_id;
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions to update this campaign" },
        { status: 403 }
      );
    }

    // Validate dates if provided
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        );
      }
    }

    // Validate budget if provided
    if (body.totalBudget !== undefined) {
      if (body.totalBudget < 0) {
        return NextResponse.json(
          { error: "Total budget cannot be negative" },
          { status: 400 }
        );
      }
    }

    if (body.allocatedBudget !== undefined) {
      if (body.allocatedBudget < 0) {
        return NextResponse.json(
          { error: "Allocated budget cannot be negative" },
          { status: 400 }
        );
      }
      
      const totalBudget = body.totalBudget ?? existingCampaign.total_budget;
      if (body.allocatedBudget > totalBudget) {
        return NextResponse.json(
          { error: "Allocated budget cannot exceed total budget" },
          { status: 400 }
        );
      }
    }

    // Validate contributions if provided
    if (body.brandContribution !== undefined || body.distributorContribution !== undefined) {
      const brandContrib = body.brandContribution ?? existingCampaign.brand_contribution ?? 0;
      const distContrib = body.distributorContribution ?? existingCampaign.distributor_contribution ?? 0;
      const totalBudget = body.totalBudget ?? existingCampaign.total_budget;
      
      if (brandContrib + distContrib > totalBudget) {
        return NextResponse.json(
          { error: "Total contributions cannot exceed total budget" },
          { status: 400 }
        );
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {};
    
    const allowedFields = [
      'name', 'description', 'campaign_type', 'channel', 'target_audience',
      'total_budget', 'allocated_budget', 'fund_source', 'brand_contribution',
      'distributor_contribution', 'start_date', 'end_date', 'launch_date',
      'status', 'approval_status', 'target_reach', 'target_impressions',
      'target_leads', 'target_sales_amount', 'target_roi_percentage',
      'actual_reach', 'actual_impressions', 'actual_leads', 'actual_sales_amount',
      'tags', 'external_campaign_id'
    ];

    // Map frontend field names to database field names
    const fieldMapping: { [key: string]: string } = {
      campaignType: 'campaign_type',
      totalBudget: 'total_budget',
      allocatedBudget: 'allocated_budget',
      fundSource: 'fund_source',
      brandContribution: 'brand_contribution',
      distributorContribution: 'distributor_contribution',
      startDate: 'start_date',
      endDate: 'end_date',
      launchDate: 'launch_date',
      approvalStatus: 'approval_status',
      targetAudience: 'target_audience',
      targetReach: 'target_reach',
      targetImpressions: 'target_impressions',
      targetLeads: 'target_leads',
      targetSalesAmount: 'target_sales_amount',
      targetRoiPercentage: 'target_roi_percentage',
      actualReach: 'actual_reach',
      actualImpressions: 'actual_impressions',
      actualLeads: 'actual_leads',
      actualSalesAmount: 'actual_sales_amount',
      externalCampaignId: 'external_campaign_id',
    };

    Object.keys(body).forEach(key => {
      if (key === 'id') return; // Skip ID field
      
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField)) {
        updateData[dbField] = body[key as keyof UpdateCampaignRequest];
      }
    });

    // Handle approval workflow
    if (body.approvalStatus === 'approved' && !existingCampaign.approved_by) {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    // Update campaign
    const { data: campaign, error: updateError } = await supabase
      .from("marketing_campaigns")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating campaign:", updateError);
      return NextResponse.json(
        { error: "Failed to update campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json(campaign);

  } catch (error: any) {
    console.error("Unexpected error updating campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

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

    // Get existing campaign for validation and access control
    const { data: existingCampaign, error: fetchError } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Failed to fetch campaign" },
        { status: 500 }
      );
    }

    // Check access permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_manager"].includes(profile.role_name);
    const hasAccess = isSuperAdmin || 
                     (isBrandAdmin && existingCampaign.brand_id === profile.brand_id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete this campaign" },
        { status: 403 }
      );
    }

    // Check if campaign can be deleted (only if draft or cancelled)
    if (!["draft", "cancelled"].includes(existingCampaign.status)) {
      return NextResponse.json(
        { error: "Only draft or cancelled campaigns can be deleted" },
        { status: 400 }
      );
    }

    // Delete campaign (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("marketing_campaigns")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting campaign:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Campaign deleted successfully" });

  } catch (error: any) {
    console.error("Unexpected error deleting campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}