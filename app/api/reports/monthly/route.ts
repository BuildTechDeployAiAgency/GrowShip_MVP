import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/reports/monthly
 * Fetch monthly distributor reports with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get("brand_id") || profile.brand_id;
    const distributorId = searchParams.get("distributor_id");
    const month = searchParams.get("month");
    const purchaseOrderId = searchParams.get("purchase_order_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("monthly_distributor_reports")
      .select("*, distributors(name), brands(name)", { count: "exact" });

    // Apply access control
    const isSuperAdmin = profile.role_name === "super_admin";
    if (!isSuperAdmin) {
      if (profile.distributor_id) {
        // Distributor admin: only their reports
        query = query.eq("distributor_id", profile.distributor_id);
        query = query.eq("brand_id", profile.brand_id);
      } else {
        // Brand admin: all reports for their brand
        query = query.eq("brand_id", profile.brand_id);
      }
    }

    // Apply filters
    if (brandId && isSuperAdmin) {
      query = query.eq("brand_id", brandId);
    }

    if (distributorId) {
      query = query.eq("distributor_id", distributorId);
    }

    if (month) {
      query = query.eq("report_month", month);
    }

    if (purchaseOrderId) {
      query = query.eq("purchase_order_id", purchaseOrderId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Order by month descending
    query = query.order("report_month", { ascending: false });

    const { data: reports, error: fetchError, count } = await query;

    if (fetchError) {
      console.error("Error fetching reports:", fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reports: reports || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Error in GET /api/reports/monthly:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

