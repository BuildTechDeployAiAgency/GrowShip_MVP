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
      .select("role_name, brand_id")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Allow both brand_admin and super_admin to invite customers
    const canInvite =
      profile?.role_name === "brand_admin" ||
      profile?.role_name === "super_admin";

    if (!canInvite) {
      return NextResponse.json(
        {
          error:
            "You don't have permission to invite customers. Only brand administrators and super administrators can send invitations.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      email,
      company_name,
      contact_name,
      phone,
      message,
      role,
    } = body;

    if (!email || !company_name || !contact_name) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: email, company_name, and contact_name are required",
        },
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
    let finalBrandId = inviterProfile?.brand_id;

    // Super admins must have a brand_id (they should select one in UI)
    // For now, if super admin doesn't have brand_id, we'll use their profile's brand_id
    if (!finalBrandId && profile?.role_name === "super_admin") {
      // Super admin should select brand in UI, but fallback to their brand_id if exists
      finalBrandId = profile.brand_id;
    }

    if (!finalBrandId) {
      return NextResponse.json(
        {
          error:
            "Unable to determine brand association. Please contact support.",
        },
        { status: 400 }
      );
    }

    // Get brand organization type to determine customer role
    const { data: brandData, error: brandError } = await supabase
      .from("brands")
      .select("organization_type")
      .eq("id", finalBrandId)
      .single();

    if (brandError) {
      console.error("Error fetching brand:", brandError);
      return NextResponse.json(
        { error: "Failed to verify brand information" },
        { status: 500 }
      );
    }

    // Determine customer role_name based on brand organization type
    // Default to "brand_customer" if organization_type is brand
    let customerRoleName = "brand_customer";
    if (brandData?.organization_type === "distributor") {
      customerRoleName = "distributor_customer";
    } else if (brandData?.organization_type === "manufacturer") {
      customerRoleName = "manufacturer_customer";
    }

    // Override if role is explicitly provided (e.g., from UI)
    const finalRoleName = role && role !== "customer" ? role : customerRoleName;
    const roleType =
      finalRoleName === "super_admin"
        ? "super_admin"
        : finalRoleName.split("_")[0];

    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "Customer already exists" },
        { status: 409 }
      );
    }

    const adminSupabase = createAdminClient();

    console.log("Attempting to invite customer:", {
      email,
      company_name,
      contact_name,
      role: finalRoleName,
      brand_id: finalBrandId,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/invite`,
    });

    const { data: inviteData, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(email, {
        data: {
          role: finalRoleName,
          invited_by: user.id,
          brand_id: finalBrandId,
          company_name,
          contact_name,
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
          role_name: finalRoleName,
          role_type: roleType,
          email: email,
          company_name: company_name,
          contact_name: contact_name,
          phone: phone || null,
          is_profile_complete: false,
          user_status: "pending",
          brand_id: finalBrandId,
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        return NextResponse.json(
          { error: "Failed to create customer profile" },
          { status: 500 }
        );
      }

      console.log("Customer profile created successfully");

      // Create user membership - this is critical for brand association
      const { error: membershipError } = await adminSupabase
        .from("user_memberships")
        .insert({
          user_id: inviteData.user.id,
          brand_id: finalBrandId,
          role_name: finalRoleName,
          is_active: true,
        });

      if (membershipError) {
        console.error("Membership creation error:", membershipError);
        // Log the error but don't fail - the user profile has brand_id
        // Super admins can still see and manage this customer
        return NextResponse.json(
          {
            success: true,
            message:
              "Invitation sent successfully but membership creation had issues. Customer will need super admin assistance.",
            userId: inviteData.user?.id,
            warning: "Membership creation failed - please verify customer access",
          },
          { status: 200 }
        );
      }

      console.log("Customer membership created successfully");
    }

    return NextResponse.json({
      success: true,
      message: "Customer invitation sent successfully",
      userId: inviteData.user?.id,
    });
  } catch (error) {
    console.error("Invite customer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
