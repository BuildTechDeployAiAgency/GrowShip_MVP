import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actingProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name")
      .eq("user_id", user.id)
      .single();

    if (profileError || actingProfile?.role_name !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: targetProfile, error: targetProfileError } =
      await adminSupabase
        .from("user_profiles")
        .select("email")
        .eq("user_id", userId)
        .single();

    if (targetProfileError || !targetProfile?.email) {
      return NextResponse.json(
        { error: "Unable to locate target user profile" },
        { status: 404 }
      );
    }

    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
      : undefined;

    const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(
      targetProfile.email,
      redirectTo ? { redirectTo } : undefined
    );

    if (resetError) {
      throw resetError;
    }

    return NextResponse.json({
      success: true,
      message: "Password reset email sent successfully.",
    });
  } catch (error: any) {
    console.error("Password reset API error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

