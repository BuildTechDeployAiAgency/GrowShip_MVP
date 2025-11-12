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

    // Get user's brand_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("brand_id, role_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const eventType = searchParams.get("event_type");

    let query = supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });

    // Apply brand filter (unless super admin)
    if (profile.role_name !== "super_admin" && profile.brand_id) {
      query = query.eq("brand_id", profile.brand_id);
    }

    if (startDate) {
      query = query.gte("event_date", startDate);
    }

    if (endDate) {
      query = query.lte("event_date", endDate);
    }

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching calendar events:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: data || [] });
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

    // Get user's brand_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("brand_id, role_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      brand_id,
      event_type,
      title,
      description,
      event_date,
      event_time,
      related_entity_type,
      related_entity_id,
      is_all_day = true,
    } = body;

    if (!event_type || !title || !event_date) {
      return NextResponse.json(
        { error: "event_type, title, and event_date are required" },
        { status: 400 }
      );
    }

    const finalBrandId = profile.role_name === "super_admin"
      ? (brand_id || profile.brand_id)
      : profile.brand_id;

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    const eventData = {
      brand_id: finalBrandId,
      event_type,
      title,
      description: description || null,
      event_date,
      event_time: event_time || null,
      related_entity_type: related_entity_type || null,
      related_entity_id: related_entity_id || null,
      is_all_day,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("calendar_events")
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error("Error creating calendar event:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


