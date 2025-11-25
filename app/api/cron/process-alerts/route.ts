import { NextRequest, NextResponse } from "next/server";
import { checkInventoryAlerts } from "@/lib/notifications/inventory-alerts";
import { checkPaymentDueAlerts } from "@/lib/notifications/payment-alerts";
import { syncCalendarEvents } from "@/lib/calendar/event-generator";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/cron/process-alerts
 * 
 * Automated background job to:
 * - Check inventory levels and create alerts
 * - Check upcoming invoice payments
 * - Sync calendar events for reminders
 * 
 * Can be triggered by:
 * - Vercel Cron (vercel.json)
 * - External schedulers
 * - Manual API call for testing
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    const results = {
      inventory_alerts: { success: false, brands_checked: 0, error: null },
      payment_alerts: { success: false, alerts_created: 0, error: null },
      calendar_sync: { success: false, brands_synced: 0, error: null },
    };

    // Get all active brands
    const supabase = await createClient();
    const { data: brands, error: brandsError } = await supabase
      .from("brands")
      .select("id, brand_name")
      .eq("status", "active");

    if (brandsError) {
      console.error("Error fetching brands:", brandsError);
      return NextResponse.json(
        { error: "Failed to fetch brands", details: brandsError.message },
        { status: 500 }
      );
    }

    // 1. Check Inventory Alerts for each brand
    console.log(`[CRON] Checking inventory alerts for ${brands?.length || 0} brands...`);
    if (brands && brands.length > 0) {
      for (const brand of brands) {
        try {
          await checkInventoryAlerts(brand.id);
          results.inventory_alerts.brands_checked++;
        } catch (error: any) {
          console.error(`Error checking inventory for brand ${brand.id}:`, error);
          results.inventory_alerts.error = error.message;
        }
      }
      results.inventory_alerts.success = true;
    }

    // 2. Check Payment Due Alerts (global check across all brands)
    console.log("[CRON] Checking payment due alerts...");
    try {
      await checkPaymentDueAlerts();
      results.payment_alerts.success = true;
    } catch (error: any) {
      console.error("Error checking payment alerts:", error);
      results.payment_alerts.error = error.message;
    }

    // 3. Sync Calendar Events for each brand
    console.log(`[CRON] Syncing calendar events for ${brands?.length || 0} brands...`);
    if (brands && brands.length > 0) {
      for (const brand of brands) {
        try {
          await syncCalendarEvents(brand.id);
          results.calendar_sync.brands_synced++;
        } catch (error: any) {
          console.error(`Error syncing calendar for brand ${brand.id}:`, error);
          results.calendar_sync.error = error.message;
        }
      }
      results.calendar_sync.success = true;
    }

    const duration = Date.now() - startTime;
    console.log(`[CRON] Alert processing completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("[CRON] Unexpected error processing alerts:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/process-alerts
 * 
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ready",
    endpoint: "/api/cron/process-alerts",
    message: "Use POST to trigger alert processing",
  });
}

