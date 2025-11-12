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

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching notification preferences:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences: data || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      notification_type,
      email_enabled = true,
      in_app_enabled = true,
      frequency = "immediate",
    } = body;

    if (!notification_type) {
      return NextResponse.json(
        { error: "notification_type is required" },
        { status: 400 }
      );
    }

    const preferenceData = {
      user_id: user.id,
      notification_type,
      email_enabled,
      in_app_enabled,
      frequency,
    };

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(preferenceData, {
        onConflict: "user_id,notification_type",
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving notification preference:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ preference: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notification_type, email_enabled, in_app_enabled, frequency } = body;

    if (!notification_type) {
      return NextResponse.json(
        { error: "notification_type is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (email_enabled !== undefined) updateData.email_enabled = email_enabled;
    if (in_app_enabled !== undefined) updateData.in_app_enabled = in_app_enabled;
    if (frequency !== undefined) updateData.frequency = frequency;

    const { data, error } = await supabase
      .from("notification_preferences")
      .update(updateData)
      .eq("user_id", user.id)
      .eq("notification_type", notification_type)
      .select()
      .single();

    if (error) {
      console.error("Error updating notification preference:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ preference: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


