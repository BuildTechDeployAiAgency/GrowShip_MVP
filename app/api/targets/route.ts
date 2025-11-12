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
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("sales_targets")
      .select("*", { count: "exact" })
      .order("target_period", { ascending: false })
      .range(offset, offset + limit - 1);

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

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching targets:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      targets: data || [],
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
    } = body;

    if (!sku || !target_period) {
      return NextResponse.json(
        { error: "sku and target_period are required" },
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

    // Verify SKU exists
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

    const targetData = {
      brand_id: finalBrandId,
      sku,
      target_period,
      period_type,
      target_quantity: target_quantity || null,
      target_revenue: target_revenue || null,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("sales_targets")
      .upsert(targetData, {
        onConflict: "brand_id,sku,target_period,period_type",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating target:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Refresh materialized view
    await supabase.rpc("refresh_target_vs_actual_view");

    return NextResponse.json({ target: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


