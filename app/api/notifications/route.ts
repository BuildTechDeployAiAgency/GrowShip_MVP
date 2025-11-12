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

    const searchParams = request.nextUrl.searchParams;
    const isRead = searchParams.get("is_read");
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const actionRequired = searchParams.get("action_required");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (isRead !== null) {
      query = query.eq("is_read", isRead === "true");
    }

    if (type) {
      query = query.eq("type", type);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (actionRequired === "true") {
      query = query.eq("action_required", true);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
    });
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
      user_id,
      type,
      title,
      message,
      brand_id,
      related_entity_type,
      related_entity_id,
      priority = "medium",
      action_required = false,
      action_url,
      expires_at,
    } = body;

    const notificationData = {
      user_id: user_id || user.id,
      type,
      title,
      message,
      brand_id: brand_id || null,
      related_entity_type: related_entity_type || null,
      related_entity_id: related_entity_id || null,
      priority,
      action_required,
      action_url: action_url || null,
      expires_at: expires_at || null,
      is_read: false,
    };

    const { data, error } = await supabase
      .from("notifications")
      .insert(notificationData)
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ notification: data }, { status: 201 });
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
    const { notification_id, is_read } = body;

    if (!notification_id) {
      return NextResponse.json(
        { error: "notification_id is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (is_read !== undefined) {
      updateData.is_read = is_read;
    }

    const { data, error } = await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", notification_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating notification:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ notification: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


