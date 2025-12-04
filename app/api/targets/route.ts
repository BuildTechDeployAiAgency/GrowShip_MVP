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
      .select("brand_id, role_name, distributor_id")
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
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    // New filters
    const distributorId = searchParams.get("distributor_id");
    const targetScope = searchParams.get("target_scope");
    const territory = searchParams.get("territory");
    const country = searchParams.get("country");

    // Select targets with joined distributor name
    let query = supabase
      .from("sales_targets")
      .select(`
        *,
        distributors:distributor_id (name)
      `, { count: "exact" })
      .order("target_period", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply brand filter (unless super admin)
    if (profile.role_name !== "super_admin" && profile.brand_id) {
      query = query.eq("brand_id", profile.brand_id);
    }

    // SKU filter - search in SKU or target_name
    if (sku) {
      query = query.or(`sku.ilike.%${sku}%,target_name.ilike.%${sku}%`);
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

    // New filters
    if (distributorId) {
      query = query.eq("distributor_id", distributorId);
    }

    if (targetScope) {
      query = query.eq("target_scope", targetScope);
    }

    if (territory) {
      query = query.eq("territory", territory);
    }

    if (country) {
      query = query.eq("country", country);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching targets:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Transform data to include distributor_name
    const targets = (data || []).map((target: any) => ({
      ...target,
      distributor_name: target.distributors?.name || null,
      distributors: undefined, // Remove the nested object
    }));

    return NextResponse.json({
      targets,
      total: count || 0,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
      target_period,
      period_type = "monthly",
      target_quantity,
      target_revenue,
      // New fields
      target_scope = "sku",
      target_name,
      distributor_id,
      country,
      territory,
      campaign_id,
      currency = "USD",
      notes,
    } = body;

    // Validate required fields based on target_scope
    if (!target_period) {
      return NextResponse.json(
        { error: "target_period is required" },
        { status: 400 }
      );
    }

    if (!target_quantity && !target_revenue) {
      return NextResponse.json(
        { error: "At least one of target_quantity or target_revenue is required" },
        { status: 400 }
      );
    }

    // Scope-specific validation
    if (target_scope === "sku" && !sku) {
      return NextResponse.json(
        { error: "SKU is required for SKU-level targets" },
        { status: 400 }
      );
    }

    if (target_scope === "distributor" && !distributor_id) {
      return NextResponse.json(
        { error: "Distributor is required for distributor-level targets" },
        { status: 400 }
      );
    }

    if (target_scope === "campaign" && !campaign_id) {
      return NextResponse.json(
        { error: "Campaign ID is required for campaign targets" },
        { status: 400 }
      );
    }

    // Validate brand_id
    const finalBrandId = profile.role_name === "super_admin" 
      ? (brand_id || profile.brand_id)
      : profile.brand_id;

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Verify SKU exists only if SKU is provided
    if (sku) {
      const { data: product } = await supabase
        .from("products")
        .select("sku")
        .eq("sku", sku)
        .eq("brand_id", finalBrandId)
        .single();

      if (!product) {
        return NextResponse.json(
          { error: `Product with SKU ${sku} not found` },
          { status: 404 }
        );
      }
    }

    // Verify distributor exists if provided
    if (distributor_id) {
      const { data: distributor } = await supabase
        .from("distributors")
        .select("id")
        .eq("id", distributor_id)
        .single();

      if (!distributor) {
        return NextResponse.json(
          { error: "Distributor not found" },
          { status: 404 }
        );
      }
    }

    const targetData = {
      brand_id: finalBrandId,
      sku: sku || null,
      target_period,
      period_type,
      target_quantity: target_quantity || null,
      target_revenue: target_revenue || null,
      // New fields
      target_scope,
      target_name: target_name || null,
      distributor_id: distributor_id || null,
      country: country || null,
      territory: territory || null,
      campaign_id: campaign_id || null,
      currency: currency || "USD",
      notes: notes || null,
      created_by: user.id,
    };

    // Insert without upsert since we have a more complex unique constraint now
    const { data, error } = await supabase
      .from("sales_targets")
      .insert(targetData)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A target with these parameters already exists" },
          { status: 409 }
        );
      }
      console.error("Error creating target:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Refresh materialized view
    try {
      await supabase.rpc("refresh_target_vs_actual_view");
    } catch (refreshError) {
      console.warn("Could not refresh target_vs_actual_view:", refreshError);
    }

    return NextResponse.json({ target: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


