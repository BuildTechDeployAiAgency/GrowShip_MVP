/**
 * ============================================================================
 * ADMIN NOTIFICATION ROLE SETTINGS API
 * ============================================================================
 * Endpoints for managing notification role settings
 * 
 * GET: Fetch the full notification × role matrix with settings
 * PUT: Update settings for a specific notification type and role
 * POST: Bulk update settings
 * 
 * Access: Super Admin only
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NotificationDispatcher } from "@/lib/notifications/dispatcher";

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

// All configurable roles
const ALL_ROLES = [
  "brand_admin",
  "brand_manager",
  "brand_logistics",
  "brand_reviewer",
  "distributor_admin",
  "super_admin",
  // Future roles (placeholders)
  // "manufacturer_user",
];

/**
 * GET /api/admin/notifications/settings
 * Fetch the full notification × role matrix
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const accessCheck = await checkSuperAdminAccess(supabase);
    
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    // Get all notification types
    const { data: types, error: typesError } = await supabase
      .from("notification_types")
      .select("id, key, name, category, description, default_priority, default_action_required, supported_roles, is_active")
      .eq("is_active", true)
      .order("category")
      .order("name");

    if (typesError) {
      console.error("[GET /api/admin/notifications/settings] Error fetching types:", typesError);
      return NextResponse.json({ error: typesError.message }, { status: 500 });
    }

    // Get all role settings
    const { data: settings, error: settingsError } = await supabase
      .from("notification_role_settings")
      .select("id, notification_type_id, role, is_enabled, frequency, channels, updated_at");

    if (settingsError) {
      console.error("[GET /api/admin/notifications/settings] Error fetching settings:", settingsError);
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    // Build settings map for quick lookup
    const settingsMap = new Map<string, typeof settings[0]>();
    settings?.forEach(s => {
      settingsMap.set(`${s.notification_type_id}_${s.role}`, s);
    });

    // Build the matrix
    const matrix = types?.map(type => {
      const roleSettings = ALL_ROLES.filter(role => 
        type.supported_roles?.includes(role)
      ).map(role => {
        const key = `${type.id}_${role}`;
        const existing = settingsMap.get(key);
        
        return {
          role,
          setting_id: existing?.id || null,
          is_enabled: existing?.is_enabled ?? true, // Default enabled
          frequency: existing?.frequency || "instant",
          channels: existing?.channels || ["in_app"],
          updated_at: existing?.updated_at || null,
        };
      });

      return {
        notification_type_id: type.id,
        key: type.key,
        name: type.name,
        category: type.category,
        description: type.description,
        default_priority: type.default_priority,
        default_action_required: type.default_action_required,
        supported_roles: type.supported_roles,
        role_settings: roleSettings,
      };
    });

    // Group by category
    const byCategory = matrix?.reduce((acc, item) => {
      const category = item.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof matrix>);

    return NextResponse.json({
      matrix,
      byCategory,
      availableRoles: ALL_ROLES,
      totalTypes: types?.length || 0,
    });
  } catch (error) {
    console.error("[GET /api/admin/notifications/settings] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/notifications/settings
 * Update settings for a specific notification type and role
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const accessCheck = await checkSuperAdminAccess(supabase);
    
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const body = await request.json();
    const {
      notification_type_id,
      role,
      is_enabled,
      frequency,
      channels,
    } = body;

    // Validate required fields
    if (!notification_type_id || !role) {
      return NextResponse.json(
        { error: "Missing required fields: notification_type_id, role" },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ["instant", "hourly_digest", "daily_digest", "weekly_digest"];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Invalid frequency. Must be one of: ${validFrequencies.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate channels
    const validChannels = ["in_app", "email", "sms"];
    if (channels && !Array.isArray(channels)) {
      return NextResponse.json({ error: "Channels must be an array" }, { status: 400 });
    }

    // Upsert the setting
    const { data, error } = await supabase
      .from("notification_role_settings")
      .upsert({
        notification_type_id,
        role,
        is_enabled: is_enabled ?? true,
        frequency: frequency || "instant",
        channels: channels || ["in_app"],
        updated_by: accessCheck.userId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "notification_type_id,role",
      })
      .select()
      .single();

    if (error) {
      console.error("[PUT /api/admin/notifications/settings] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear the dispatcher cache so changes take effect immediately
    NotificationDispatcher.clearCache();

    return NextResponse.json({ setting: data });
  } catch (error) {
    console.error("[PUT /api/admin/notifications/settings] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/notifications/settings
 * Bulk update multiple settings at once
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const accessCheck = await checkSuperAdminAccess(supabase);
    
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: "Missing required field: settings (array)" },
        { status: 400 }
      );
    }

    // Validate all settings
    for (const setting of settings) {
      if (!setting.notification_type_id || !setting.role) {
        return NextResponse.json(
          { error: "Each setting must have notification_type_id and role" },
          { status: 400 }
        );
      }
    }

    // Prepare upsert data
    const upsertData = settings.map(s => ({
      notification_type_id: s.notification_type_id,
      role: s.role,
      is_enabled: s.is_enabled ?? true,
      frequency: s.frequency || "instant",
      channels: s.channels || ["in_app"],
      updated_by: accessCheck.userId,
      updated_at: new Date().toISOString(),
    }));

    // Bulk upsert
    const { data, error } = await supabase
      .from("notification_role_settings")
      .upsert(upsertData, {
        onConflict: "notification_type_id,role",
      })
      .select();

    if (error) {
      console.error("[POST /api/admin/notifications/settings] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear the dispatcher cache
    NotificationDispatcher.clearCache();

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      settings: data,
    });
  } catch (error) {
    console.error("[POST /api/admin/notifications/settings] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/notifications/settings
 * Reset a setting to default (delete the override)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const accessCheck = await checkSuperAdminAccess(supabase);
    
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const settingId = searchParams.get("id");
    const notificationTypeId = searchParams.get("notification_type_id");
    const role = searchParams.get("role");

    if (!settingId && (!notificationTypeId || !role)) {
      return NextResponse.json(
        { error: "Provide either id or notification_type_id and role" },
        { status: 400 }
      );
    }

    let query = supabase.from("notification_role_settings").delete();

    if (settingId) {
      query = query.eq("id", settingId);
    } else {
      query = query.eq("notification_type_id", notificationTypeId).eq("role", role);
    }

    const { error } = await query;

    if (error) {
      console.error("[DELETE /api/admin/notifications/settings] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear the dispatcher cache
    NotificationDispatcher.clearCache();

    return NextResponse.json({ success: true, message: "Setting reset to default" });
  } catch (error) {
    console.error("[DELETE /api/admin/notifications/settings] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
