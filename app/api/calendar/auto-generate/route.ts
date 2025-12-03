import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarEvents } from "@/lib/calendar/event-generator";
import { checkComplianceAlerts, checkCalendarEventAlerts } from "@/lib/notifications/compliance-alerts";

/**
 * POST /api/calendar/auto-generate
 * Trigger auto-generation of calendar events from invoices, POs, shipments, campaigns, and reports
 * Also checks for upcoming events and creates notifications for compliance and other calendar events
 */
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

    const body = await request.json().catch(() => ({}));
    const { brand_id, event_types } = body as {
      brand_id?: string;
      event_types?: Array<any>;
    };

    const finalBrandId = profile.role_name === "super_admin"
      ? (brand_id || profile.brand_id)
      : profile.brand_id;

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Sync calendar events
    const result = await syncCalendarEvents(finalBrandId, event_types);

    // Check for upcoming events and create notifications
    // This ensures users are alerted about compliance reviews, PO deliveries, etc.
    const complianceAlerts = await checkComplianceAlerts(finalBrandId);
    const calendarAlerts = await checkCalendarEventAlerts(finalBrandId);
    const totalNotifications = complianceAlerts.notificationsCreated + calendarAlerts.notificationsCreated;

    return NextResponse.json({
      success: true,
      data: {
        created: result.created,
        updated: result.updated,
        cancelled: result.cancelled,
        total: result.created + result.updated,
        notificationsSent: totalNotifications,
      },
    });
  } catch (error: any) {
    console.error("Error auto-generating calendar events:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
