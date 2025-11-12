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

    const daysAhead = parseInt(request.nextUrl.searchParams.get("days_ahead") || "30");

    const { data, error } = await supabase.rpc("get_upcoming_shipments", {
      p_brand_id: brandId,
      p_days_ahead: daysAhead,
    });

    if (error) {
      console.error("Error fetching upcoming shipments:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ shipments: data || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


