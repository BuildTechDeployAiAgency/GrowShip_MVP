import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { UserRoleName, UserRole } from "@/types/auth";

const deriveRoleType = (roleName?: UserRoleName | null): UserRole | undefined => {
  if (!roleName) return undefined;
  if (roleName === "super_admin") {
    return "super_admin";
  }
  const [prefix] = roleName.split("_");
  return prefix as UserRole;
};

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actingProfile, error: actingProfileError } = await supabase
      .from("user_profiles")
      .select("role_name")
      .eq("user_id", user.id)
      .single();

    if (actingProfileError || actingProfile?.role_name !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, updates } = await request.json();

    if (!userId || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Invalid payload. Expecting userId and updates." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const roleName = (updates.role_name ?? updates.roleName) as
      | UserRoleName
      | undefined;
    const roleType = deriveRoleType(roleName);

    const profileUpdates: Record<string, any> = {
      contact_name: updates.contact_name ?? updates.contactName ?? undefined,
      company_name: updates.company_name ?? updates.companyName ?? undefined,
      role_name: roleName,
      role_type: roleType,
      brand_id: updates.brand_id ?? updates.brandId ?? undefined,
      phone: updates.phone,
      address: updates.address,
      city: updates.city,
      state: updates.state,
      zip_code: updates.zipCode ?? updates.zip_code,
      country: updates.country,
      website: updates.website,
      description: updates.description,
      is_profile_complete:
        typeof updates.is_profile_complete === "boolean"
          ? updates.is_profile_complete
          : typeof updates.isProfileComplete === "boolean"
          ? updates.isProfileComplete
          : undefined,
      updated_at: new Date().toISOString(),
    };

    Object.keys(profileUpdates).forEach((key) => {
      if (profileUpdates[key] === undefined) {
        delete profileUpdates[key];
      }
    });

    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await adminSupabase
        .from("user_profiles")
        .update(profileUpdates)
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }
    }

    const brandId =
      updates.brand_id ?? updates.brandId ?? profileUpdates.brand_id ?? null;

    if (brandId !== undefined) {
      const { data: existingMembership } = await adminSupabase
        .from("user_memberships")
        .select("id, brand_id, role_name")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (brandId) {
        if (existingMembership) {
          const { error: membershipUpdateError } = await adminSupabase
            .from("user_memberships")
            .update({
              brand_id: brandId,
              role_name: roleName ?? existingMembership.role_name ?? undefined,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingMembership.id);

          if (membershipUpdateError) {
            throw membershipUpdateError;
          }
        } else {
          const { error: membershipInsertError } = await adminSupabase
            .from("user_memberships")
            .insert({
              user_id: userId,
              brand_id: brandId,
              role_name: roleName ?? "brand_admin",
              is_active: true,
            });

          if (membershipInsertError) {
            throw membershipInsertError;
          }
        }
      } else if (existingMembership) {
        const { error: deactivateError } = await adminSupabase
          .from("user_memberships")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingMembership.id);

        if (deactivateError) {
          throw deactivateError;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Manage user API error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
