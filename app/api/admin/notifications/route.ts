/**
 * ============================================================================
 * ADMIN NOTIFICATION TYPES API
 * ============================================================================
 * Endpoints for managing the notification registry (notification_types table)
 * 
 * GET: Fetch all notification types with their categories
 * POST: Create a new notification type (rarely needed)
 * 
 * Access: Super Admin only
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Helper to check super admin access
async function checkSuperAdminAccess(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role_name, user_status")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role_name !== "super_admin" || profile.user_status !== "approved") {
    return { authorized: false, error: "Super admin access required", status: 403 };
  }

  return { authorized: true, userId: user.id };
}

/**
 * GET /api/admin/notifications
 * Fetch all notification types grouped by category
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const accessCheck = await checkSuperAdminAccess(supabase);
    
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    // Get all notification types
    const { data: types, error } = await supabase
      .from("notification_types")
      .select(`
        id,
        key,
        name,
        category,
        description,
        default_priority,
        default_action_required,
        supported_roles,
        module,
        trigger_location,
        is_active,
        created_at,
        updated_at
      `)
      .order("category")
      .order("name");

    if (error) {
      console.error("[GET /api/admin/notifications] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by category
    const byCategory = types?.reduce((acc, type) => {
      const category = type.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(type);
      return acc;
    }, {} as Record<string, typeof types>);

    return NextResponse.json({
      types,
      byCategory,
      totalCount: types?.length || 0,
    });
  } catch (error) {
    console.error("[GET /api/admin/notifications] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/notifications
 * Create a new notification type
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const accessCheck = await checkSuperAdminAccess(supabase);
    
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const body = await request.json();
    const {
      key,
      name,
      category,
      description,
      default_priority,
      default_action_required,
      supported_roles,
      module,
      trigger_location,
    } = body;

    // Validate required fields
    if (!key || !name || !category) {
      return NextResponse.json(
        { error: "Missing required fields: key, name, category" },
        { status: 400 }
      );
    }

    // Insert new notification type
    const { data, error } = await supabase
      .from("notification_types")
      .insert({
        key,
        name,
        category,
        description,
        default_priority: default_priority || "medium",
        default_action_required: default_action_required || false,
        supported_roles: supported_roles || ["brand_admin", "super_admin"],
        module,
        trigger_location,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/admin/notifications] Error:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "Notification type key already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification_type: data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/notifications] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/notifications
 * Update a notification type
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const accessCheck = await checkSuperAdminAccess(supabase);
    
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing notification type id" }, { status: 400 });
    }

    // Update notification type
    const { data, error } = await supabase
      .from("notification_types")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/admin/notifications] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification_type: data });
  } catch (error) {
    console.error("[PATCH /api/admin/notifications] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
