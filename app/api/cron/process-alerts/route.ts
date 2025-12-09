import { NextRequest, NextResponse } from "next/server";
import { checkInventoryAlerts } from "@/lib/notifications/inventory-alerts";
import { checkPaymentDueAlerts } from "@/lib/notifications/payment-alerts";
import { checkCalendarEventAlerts, checkComplianceAlerts } from "@/lib/notifications/compliance-alerts";
import { syncCalendarEvents } from "@/lib/calendar/event-generator";
import { createClient } from "@/lib/supabase/server";

/**
 * Verify cron secret for security
 * Returns null if authorized, or a NextResponse error if not
 */
function verifyCronAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET must be configured in production
  if (!cronSecret) {
    console.error("[CRON] CRON_SECRET environment variable not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Verify the authorization header matches
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[CRON] Unauthorized access attempt");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null; // Authorized
}

/**
 * POST /api/cron/process-alerts
 * 
 * Automated background job to:
 * - Check inventory levels and create alerts (including predictive stock-out risk)
 * - Check upcoming invoice payments
 * - Check upcoming calendar events (shipments, PO arrivals, etc.)
 * - Sync calendar events for reminders
 * 
 * Can be triggered by:
 * - Vercel Cron (vercel.json)
 * - External schedulers with valid CRON_SECRET
 * 
 * Security: Requires Bearer token matching CRON_SECRET environment variable
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret - REQUIRED for security
    const authError = verifyCronAuth(request);
    if (authError) {
      return authError;
    }

    const startTime = Date.now();
    const results: {
      inventory_alerts: { success: boolean; brands_checked: number; error: string | null };
      payment_alerts: { success: boolean; alerts_created: number; error: string | null };
      calendar_sync: { success: boolean; brands_synced: number; error: string | null };
      calendar_event_alerts: { success: boolean; notifications_created: number; error: string | null };
      compliance_alerts: { success: boolean; notifications_created: number; error: string | null };
    } = {
      inventory_alerts: { success: false, brands_checked: 0, error: null },
      payment_alerts: { success: false, alerts_created: 0, error: null },
      calendar_sync: { success: false, brands_synced: 0, error: null },
      calendar_event_alerts: { success: false, notifications_created: 0, error: null },
      compliance_alerts: { success: false, notifications_created: 0, error: null },
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

    // 4. Check Calendar Event Alerts (Shipments, PO Arrivals, etc.)
    console.log(`[CRON] Checking calendar event alerts for ${brands?.length || 0} brands...`);
    if (brands && brands.length > 0) {
      for (const brand of brands) {
        try {
          const result = await checkCalendarEventAlerts(brand.id);
          results.calendar_event_alerts.notifications_created += result.notificationsCreated;
        } catch (error: any) {
          console.error(`Error checking calendar event alerts for brand ${brand.id}:`, error);
          results.calendar_event_alerts.error = error.message;
        }
      }
      results.calendar_event_alerts.success = true;
    }

    // 5. Check Compliance Alerts (Monthly Distributor Reports)
    console.log(`[CRON] Checking compliance alerts for ${brands?.length || 0} brands...`);
    if (brands && brands.length > 0) {
      for (const brand of brands) {
        try {
          const result = await checkComplianceAlerts(brand.id);
          results.compliance_alerts.notifications_created += result.notificationsCreated;
        } catch (error: any) {
          console.error(`Error checking compliance alerts for brand ${brand.id}:`, error);
          results.compliance_alerts.error = error.message;
        }
      }
      results.compliance_alerts.success = true;
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
 * Health check endpoint (unauthenticated) or trigger cron job (authenticated)
 * 
 * - Without auth header: Returns basic health status
 * - With valid auth header: Triggers the full cron job processing
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  // If no auth header, return basic health check (safe, limited info)
  if (!authHeader) {
    return NextResponse.json({
      status: "ready",
      endpoint: "/api/cron/process-alerts",
      message: "Use POST with Authorization header to trigger alert processing",
    });
  }

  // If auth header provided, verify it and run the cron job
  const authError = verifyCronAuth(request);
  if (authError) {
    return authError;
  }

  // Create a synthetic request to reuse POST logic
  // For now, just indicate that GET with auth should use POST
  return NextResponse.json({
    status: "authenticated",
    message: "Use POST method to trigger alert processing",
    hint: "Vercel Cron should be configured to use POST method",
  });
}

