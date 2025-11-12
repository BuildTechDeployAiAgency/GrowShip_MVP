import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Allow both brand_admin and super_admin to send invitations
    const canInvite = profile?.role_name === "brand_admin" || profile?.role_name === "super_admin";
    
    if (!canInvite) {
      return NextResponse.json({ 
        error: "You don't have permission to invite users. Only brand administrators and super administrators can send invitations." 
      }, { status: 403 });
    }

    const body = await request.json();
    const { email, role, message, brand_id } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email and role are required" },
        { status: 400 }
      );
    }

    // Get the inviter's profile to determine their brand
    const { data: inviterProfile } = await supabase
      .from("user_profiles")
      .select("brand_id, role_name")
      .eq("user_id", user.id)
      .single();

    // Determine which brand_id to use
    let finalBrandId = brand_id;
    
    // If no brand_id provided, use the inviter's brand (for brand admins)
    if (!finalBrandId && inviterProfile?.brand_id) {
      finalBrandId = inviterProfile.brand_id;
      console.log("Using inviter's brand_id:", finalBrandId);
    }

    // Super admins must explicitly specify a brand
    if (!finalBrandId && profile?.role_name === "super_admin") {
      return NextResponse.json(
        { error: "Missing required field: brand_id is required. Super admins must specify which brand this user belongs to." },
        { status: 400 }
      );
    }

    // Brand admins can only invite to their own brand
    if (profile?.role_name === "brand_admin" && brand_id && brand_id !== inviterProfile?.brand_id) {
      return NextResponse.json(
        { error: "Brand admins can only invite users to their own brand." },
        { status: 403 }
      );
    }

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "Unable to determine brand association. Please contact support." },
        { status: 400 }
      );
    }

    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const adminSupabase = createAdminClient();

    console.log("Attempting to invite user:", {
      email,
      role,
      brand_id: finalBrandId,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/invite`,
    });

    const { data: inviteData, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(email, {
        data: {
          role: role,
          invited_by: user.id,
          brand_id: finalBrandId,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/invite`,
      });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return NextResponse.json(
        { error: `Failed to send invitation: ${inviteError.message}` },
        { status: 500 }
      );
    }

    console.log("Invitation sent successfully:", inviteData.user?.id);

    if (inviteData.user) {
      const mappedRoleType =
        role === "super_admin" ? "super_admin" : role.split("_")[0];

      const { error: profileError } = await adminSupabase
        .from("user_profiles")
        .insert({
          user_id: inviteData.user.id,
          role_name: role,
          role_type: mappedRoleType,
          email: email,
          is_profile_complete: false,
          user_status: "pending",
          brand_id: finalBrandId,
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }

      console.log("User profile created successfully");

      // Create user membership - this is critical for brand association
      const { error: membershipError } = await adminSupabase
        .from("user_memberships")
        .insert({
          user_id: inviteData.user.id,
          brand_id: finalBrandId,
          role_name: role,
          is_active: true,
        });

      if (membershipError) {
        console.error("Membership creation error:", membershipError);
        // Log the error but don't fail - the user profile has brand_id
        // Super admins can still see and manage this user
        return NextResponse.json(
          { 
            success: true,
            message: "Invitation sent successfully but membership creation had issues. User will need super admin assistance.",
            userId: inviteData.user?.id,
            warning: "Membership creation failed - please verify user access"
          },
          { status: 200 }
        );
      }

      console.log("User membership created successfully");
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      userId: inviteData.user?.id,
    });
  } catch (error) {
    console.error("Invite user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
