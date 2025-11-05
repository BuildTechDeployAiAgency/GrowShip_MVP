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

    if (profileError || profile?.role_name !== "brand_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, role, message, brand_id } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
      brand_id,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/invite`,
    });

    const { data: inviteData, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(email, {
        data: {
          role: role,
          invited_by: user.id,
          brand_id: brand_id,
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
      const { error: profileError } = await adminSupabase
        .from("user_profiles")
        .insert({
          user_id: inviteData.user.id,
          role_name: role,
          role_type: role.split("_")[0],
          email: email,
          is_profile_complete: false,
          user_status: "pending",
          brand_id: brand_id,
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }

      // Create user membership if brand_id is provided
      if (brand_id) {
        const { error: membershipError } = await adminSupabase
          .from("user_memberships")
          .insert({
            user_id: inviteData.user.id,
            brand_id: brand_id,
            role_name: role,
            is_active: true,
          });

        if (membershipError) {
          console.error("Membership creation error:", membershipError);
          // Don't fail the entire invitation if membership creation fails
          // The user can still log in and we can create the membership later
        }
      }
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
