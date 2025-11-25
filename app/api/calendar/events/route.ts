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

    // Get user's profile with role and relationships
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("brand_id, distributor_id, role_name, role_type")
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
    const distributorId = searchParams.get("distributor_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });

    // Apply role-based filtering
    if (profile.role_name === "super_admin") {
      // Super admins can see everything - no brand filter
    } else if (profile.role_type === "distributor" && profile.distributor_id) {
      // Distributors can only see events for their distributor or their brand
      query = query.or(`distributor_id.eq.${profile.distributor_id},brand_id.eq.${profile.brand_id}`);
    } else if (profile.brand_id) {
      // Brand users can see all events for their brand
      query = query.eq("brand_id", profile.brand_id);
    } else {
      // No access if no brand or distributor
      return NextResponse.json({ events: [] });
    }

    // Apply date filters
    if (startDate) {
      query = query.gte("event_date", startDate);
    }

    if (endDate) {
      query = query.lte("event_date", endDate);
    }

    // Apply event type filter
    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    // Apply distributor filter (only for brand users)
    if (distributorId && profile.role_type !== "distributor") {
      query = query.eq("distributor_id", distributorId);
    }

    // Apply status filter
    if (status) {
      query = query.eq("status", status);
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
      .select("brand_id, distributor_id, role_name")
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
      distributor_id,
      event_type,
      title,
      description,
      event_date,
      event_time,
      related_entity_type,
      related_entity_id,
      is_all_day = true,
      status = "upcoming",
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
      distributor_id: distributor_id || null,
      event_type,
      title,
      description: description || null,
      event_date,
      event_time: event_time || null,
      related_entity_type: related_entity_type || null,
      related_entity_id: related_entity_id || null,
      is_all_day,
      status,
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
    const { id, status, event_date, event_time, title, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Event id is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "done") {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user.id;
      } else if (status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = user.id;
      }
    }
    if (event_date) updateData.event_date = event_date;
    if (event_time !== undefined) updateData.event_time = event_time;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    // Verify user has permission to update this event
    let query = supabase
      .from("calendar_events")
      .update(updateData)
      .eq("id", id);

    // Apply brand filter unless super admin
    if (profile.role_name !== "super_admin") {
      query = query.eq("brand_id", profile.brand_id);
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error("Error updating calendar event:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Event not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Event id is required" },
        { status: 400 }
      );
    }

    // Verify user has permission to delete this event
    let query = supabase
      .from("calendar_events")
      .delete()
      .eq("id", id);

    // Apply brand filter unless super admin
    if (profile.role_name !== "super_admin") {
      query = query.eq("brand_id", profile.brand_id);
    }

    const { error } = await query;

    if (error) {
      console.error("Error deleting calendar event:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
