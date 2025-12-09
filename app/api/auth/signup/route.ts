import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, email, role, brandId } = body;

    if (!userId || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: userId, email, and role are required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Check if profile already exists
    const { data: existingProfile } = await adminSupabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile) {
      // Profile already exists, return success
      return NextResponse.json({
        success: true,
        message: "User profile already exists",
        profile: existingProfile,
      });
    }

    // Determine role_name and role_type
    const roleName = (role + "_admin") as string;
    const roleType = role as string;

    console.log("Creating user profile via API:", {
      userId,
      email,
      roleName,
      roleType,
      brandId,
    });

    // Create user profile using admin client (bypasses RLS)
    const { data: newProfile, error: profileError } = await adminSupabase
      .from("user_profiles")
      .insert({
        user_id: userId,
        role_name: roleName,
        role_type: roleType,
        company_name: "",
        contact_name: "",
        email: email,
        is_profile_complete: false,
        user_status: "approved",
        brand_id: brandId || null,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return NextResponse.json(
        { error: "Failed to create user profile", details: profileError },
        { status: 500 }
      );
    }

    console.log("User profile created successfully:", newProfile?.id);

    // Create user membership if brandId is provided
    if (brandId) {
      const { error: membershipError } = await adminSupabase
        .from("user_memberships")
        .insert({
          user_id: userId,
          brand_id: brandId,
          role_name: roleName,
          is_active: true,
        });

      if (membershipError) {
        console.error("Membership creation error:", membershipError);
        // Don't fail - the user profile was created successfully
        // Membership can be added later by admin
        return NextResponse.json({
          success: true,
          message: "User profile created but membership creation had issues",
          profile: newProfile,
          warning: "Membership creation failed - please verify user access",
        });
      }

      console.log("User membership created successfully");
    }

    return NextResponse.json({
      success: true,
      message: "User profile created successfully",
      profile: newProfile,
    });
  } catch (error) {
    console.error("Signup profile creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
