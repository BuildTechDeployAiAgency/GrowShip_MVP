import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get relationship to check permissions
    const { data: relationship } = await supabase
      .from("brand_distributor_relationships")
      .select("brand_id, distributor_id")
      .eq("id", id)
      .single();

    if (!relationship) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const canViewHistory = 
      profile.role_name === "super_admin" || 
      (profile.role_name?.startsWith("brand_") && profile.brand_id === relationship.brand_id) ||
      (profile.role_name?.startsWith("distributor_") && profile.distributor_id === relationship.distributor_id);

    if (!canViewHistory) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Fetch relationship history
    const { data: history, error: historyError, count } = await supabase
      .from("brand_distributor_relationship_history")
      .select(`
        *,
        changed_by_profile:user_profiles!brand_distributor_relationship_history_changed_by_fkey (
          contact_name,
          email,
          role_name
        )
      `, { count: "exact" })
      .eq("relationship_id", id)
      .order("changed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (historyError) {
      console.error("Error fetching relationship history:", historyError);
      return NextResponse.json(
        { error: "Failed to fetch relationship history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      history: history || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error("Unexpected error in relationship history GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}