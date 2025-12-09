/**
 * ============================================================================
 * COMPLIANCE & CALENDAR ALERTS NOTIFICATION SERVICE
 * ============================================================================
 * Creates notifications for compliance reviews and calendar events using the
 * role-based NotificationDispatcher.
 * 
 * Notification Types:
 *   - compliance_review_due: Monthly distributor compliance review deadlines
 *   - payment_due_reminder: Payment due calendar reminders
 *   - po_approval_due: PO approval deadline reminders
 *   - shipment_arrival_reminder: Shipment arrival reminders
 *   - backorder_review_reminder: Backorder review reminders
 *   - custom_event_reminder: Generic calendar event reminders
 */

import { createAdminClient } from "@/lib/supabase/server";
import { NotificationDispatcher } from "./dispatcher";

/**
 * Check for upcoming compliance review calendar events and create notifications
 * This ensures users are alerted about monthly distributor reports due
 */
export async function checkComplianceAlerts(brandId: string): Promise<{
  notificationsCreated: number;
}> {
  const supabase = createAdminClient();
  let notificationsCreated = 0;

  // Get upcoming compliance_review events within the next 3 days
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const today = new Date().toISOString().split("T")[0];
  const threeDaysOut = threeDaysFromNow.toISOString().split("T")[0];

  const { data: complianceEvents, error: eventsError } = await supabase
    .from("calendar_events")
    .select("id, title, description, event_date, distributor_id, related_entity_id")
    .eq("brand_id", brandId)
    .eq("event_type", "compliance_review")
    .eq("status", "upcoming")
    .gte("event_date", today)
    .lte("event_date", threeDaysOut);

  if (eventsError) {
    console.error("[checkComplianceAlerts] Error fetching events:", eventsError);
    return { notificationsCreated: 0 };
  }

  if (!complianceEvents || complianceEvents.length === 0) {
    return { notificationsCreated: 0 };
  }

  // For each compliance event, check if a notification was already sent recently
  for (const event of complianceEvents) {
    // Check for existing notifications for this event in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: existingNotification } = await supabase
      .from("notifications")
      .select("id")
      .eq("related_entity_type", "calendar_event")
      .eq("related_entity_id", event.id)
      .gte("created_at", oneDayAgo.toISOString())
      .limit(1)
      .maybeSingle();

    // Skip if notification was already sent recently
    if (existingNotification) {
      continue;
    }

    // Calculate days until due
    const eventDate = new Date(event.event_date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    let priority: "low" | "medium" | "high" | "urgent";
    let urgencyText: string;
    
    if (daysUntilDue === 0) {
      priority = "urgent";
      urgencyText = "Due Today";
    } else if (daysUntilDue === 1) {
      priority = "high";
      urgencyText = "Due Tomorrow";
    } else {
      priority = "medium";
      urgencyText = `Due in ${daysUntilDue} Days`;
    }

    // Dispatch using role-based system
    const result = await NotificationDispatcher.dispatch(
      "compliance_review_due",
      {
        title: `Compliance Review ${urgencyText}`,
        message: event.title + (event.description ? `: ${event.description}` : ""),
        brandId,
        relatedEntityType: "calendar_event",
        relatedEntityId: event.id,
        priority,
        actionRequired: true,
        actionUrl: `/calendar`,
      }
    );

    if (result.success) {
      notificationsCreated += result.notificationsSent;
    } else {
      console.error("[checkComplianceAlerts] Error:", result.error);
    }
  }

  console.log(`[checkComplianceAlerts] Brand ${brandId}: Created ${notificationsCreated} compliance notifications`);
  return { notificationsCreated };
}

/**
 * Check for all types of upcoming calendar events and create reminder notifications
 * This includes PO deliveries, shipment arrivals, payment due dates, etc.
 */
export async function checkCalendarEventAlerts(brandId: string): Promise<{
  notificationsCreated: number;
}> {
  const supabase = createAdminClient();
  let notificationsCreated = 0;

  // Get upcoming events within the next 3 days (excluding compliance_review which is handled separately)
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const today = new Date().toISOString().split("T")[0];
  const threeDaysOut = threeDaysFromNow.toISOString().split("T")[0];

  const { data: upcomingEvents, error: eventsError } = await supabase
    .from("calendar_events")
    .select("id, title, description, event_date, event_type, distributor_id, related_entity_type, related_entity_id")
    .eq("brand_id", brandId)
    .eq("status", "upcoming")
    .neq("event_type", "compliance_review")
    .gte("event_date", today)
    .lte("event_date", threeDaysOut);

  if (eventsError) {
    console.error("[checkCalendarEventAlerts] Error fetching events:", eventsError);
    return { notificationsCreated: 0 };
  }

  if (!upcomingEvents || upcomingEvents.length === 0) {
    return { notificationsCreated: 0 };
  }

  // For each event, check if a notification was already sent recently
  for (const event of upcomingEvents) {
    // Check for existing notifications for this event in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: existingNotification } = await supabase
      .from("notifications")
      .select("id")
      .eq("related_entity_type", "calendar_event")
      .eq("related_entity_id", event.id)
      .gte("created_at", oneDayAgo.toISOString())
      .limit(1)
      .maybeSingle();

    // Skip if notification was already sent recently
    if (existingNotification) {
      continue;
    }

    // Calculate days until due
    const eventDate = new Date(event.event_date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    // Map event type to notification type key
    let typeKey: string;
    let priority: "low" | "medium" | "high" | "urgent";
    let actionUrl = "/calendar";

    switch (event.event_type) {
      case "payment_due":
        typeKey = "payment_due_reminder";
        priority = daysUntilDue === 0 ? "urgent" : daysUntilDue === 1 ? "high" : "medium";
        if (event.related_entity_id) {
          actionUrl = `/invoices?highlight=${event.related_entity_id}`;
        }
        break;
      case "po_approval_due":
        typeKey = "po_approval_due";
        priority = daysUntilDue === 0 ? "high" : "medium";
        if (event.related_entity_id) {
          actionUrl = `/purchase-orders/${event.related_entity_id}`;
        }
        break;
      case "shipment_arrival":
      case "delivery_milestone":
        typeKey = "shipment_arrival_reminder";
        priority = daysUntilDue === 0 ? "medium" : "low";
        if (event.related_entity_id && event.related_entity_type === "po") {
          actionUrl = `/purchase-orders/${event.related_entity_id}`;
        } else if (event.related_entity_id && event.related_entity_type === "shipment") {
          actionUrl = `/shipments?highlight=${event.related_entity_id}`;
        }
        break;
      case "backorder_review":
        typeKey = "backorder_review_reminder";
        priority = "medium";
        if (event.related_entity_id) {
          actionUrl = `/purchase-orders/${event.related_entity_id}`;
        }
        break;
      default:
        typeKey = "custom_event_reminder";
        priority = "low";
    }

    // Dispatch using role-based system
    const result = await NotificationDispatcher.dispatch(
      typeKey,
      {
        title: event.title,
        message: event.description || `Event scheduled for ${event.event_date}`,
        brandId,
        distributorId: event.distributor_id || undefined,
        relatedEntityType: "calendar_event",
        relatedEntityId: event.id,
        priority,
        actionRequired: daysUntilDue <= 1,
        actionUrl,
      }
    );

    if (result.success) {
      notificationsCreated += result.notificationsSent;
    } else {
      console.error(`[checkCalendarEventAlerts] Error for event ${event.id}:`, result.error);
    }
  }

  console.log(`[checkCalendarEventAlerts] Brand ${brandId}: Created ${notificationsCreated} calendar notifications`);
  return { notificationsCreated };
}
