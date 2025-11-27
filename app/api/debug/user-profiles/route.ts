import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DEBUG ENDPOINT - Check user_profiles data to diagnose notification issues
 * This endpoint is temporary and should be removed after debugging
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all super admins
    const { data: superAdmins, error: saError } = await supabase
      .from("user_profiles")
      .select("user_id, role_name, user_status, email, contact_name")
      .eq("role_name", "super_admin");

    // Get all brand admins/managers for brand 5f563ab7-a6b1-4a8c-af25-2d19d656f26e
    const { data: brandUsers, error: buError } = await supabase
      .from("user_profiles")
      .select("user_id, role_name, user_status, email, contact_name, brand_id")
      .eq("brand_id", "5f563ab7-a6b1-4a8c-af25-2d19d656f26e")
      .in("role_name", ["brand_admin", "brand_manager"]);

    // Get current user's profile
    const { data: currentUser, error: cuError } = await supabase
      .from("user_profiles")
      .select("user_id, role_name, user_status, email, contact_name, brand_id")
      .eq("user_id", user.id)
      .single();

    // Get distinct user_status values
    const { data: distinctStatuses, error: dsError } = await supabase
      .from("user_profiles")
      .select("user_status")
      .limit(100);

    const uniqueStatuses = [...new Set(distinctStatuses?.map(d => d.user_status) || [])];

    return NextResponse.json({
      currentAuthUser: {
        id: user.id,
        email: user.email,
      },
      currentUserProfile: currentUser,
      currentUserProfileError: cuError?.message,
      superAdmins: superAdmins || [],
      superAdminsError: saError?.message,
      brandUsers: brandUsers || [],
      brandUsersError: buError?.message,
      distinctUserStatusValues: uniqueStatuses,
      distinctStatusesError: dsError?.message,
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

