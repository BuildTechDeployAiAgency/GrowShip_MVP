import { createAdminClient } from "@/lib/supabase/server";

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
    console.error("Error fetching compliance events:", eventsError);
    return { notificationsCreated: 0 };
  }

  if (!complianceEvents || complianceEvents.length === 0) {
    return { notificationsCreated: 0 };
  }

  // Get users who should receive compliance notifications (brand admins, super admins)
  const { data: brandUsers, error: brandUsersError } = await supabase
    .from("user_profiles")
    .select("user_id, role_name")
    .eq("brand_id", brandId)
    .eq("user_status", "approved")
    .in("role_name", ["brand_admin", "brand_manager", "brand_logistics"]);

  if (brandUsersError) {
    console.error("Error fetching brand users for compliance alerts:", brandUsersError);
  }

  // Get super admins
  const { data: superAdmins, error: superAdminsError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("role_name", "super_admin")
    .eq("user_status", "approved");

  if (superAdminsError) {
    console.error("Error fetching super admins for compliance alerts:", superAdminsError);
  }

  // Combine all recipients
  const allRecipients = new Set<string>();
  brandUsers?.forEach((u) => allRecipients.add(u.user_id));
  superAdmins?.forEach((u) => allRecipients.add(u.user_id));

  if (allRecipients.size === 0) {
    return { notificationsCreated: 0 };
  }

  // For each compliance event, check if a notification was already sent recently
  for (const event of complianceEvents) {
    // Check for existing notifications for this event in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: existingNotifications, error: existingError } = await supabase
      .from("notifications")
      .select("id")
      .eq("related_entity_type", "calendar_event")
      .eq("related_entity_id", event.id)
      .gte("created_at", oneDayAgo.toISOString())
      .limit(1);

    if (existingError) {
      console.error("Error checking existing compliance notifications:", existingError);
      continue;
    }

    // Skip if notification was already sent recently
    if (existingNotifications && existingNotifications.length > 0) {
      continue;
    }

    // Calculate days until due
    const eventDate = new Date(event.event_date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    let urgencyText = "";
    
    if (daysUntilDue === 0) {
      priority = "urgent";
      urgencyText = "due today";
    } else if (daysUntilDue === 1) {
      priority = "high";
      urgencyText = "due tomorrow";
    } else {
      priority = "medium";
      urgencyText = `due in ${daysUntilDue} days`;
    }

    // Create notifications for all recipients
    const notifications = Array.from(allRecipients).map((userId) => ({
      user_id: userId,
      type: "warning",
      title: `Compliance Review ${urgencyText.charAt(0).toUpperCase() + urgencyText.slice(1)}`,
      message: event.title + (event.description ? `: ${event.description}` : ""),
      brand_id: brandId,
      related_entity_type: "calendar_event",
      related_entity_id: event.id,
      priority,
      action_required: true,
      action_url: `/calendar`,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Error creating compliance notifications:", insertError);
    } else {
      notificationsCreated += notifications.length;
    }
  }

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
    console.error("Error fetching upcoming calendar events:", eventsError);
    return { notificationsCreated: 0 };
  }

  if (!upcomingEvents || upcomingEvents.length === 0) {
    return { notificationsCreated: 0 };
  }

  // Get users who should receive notifications
  const { data: brandUsers, error: brandUsersError } = await supabase
    .from("user_profiles")
    .select("user_id, role_name")
    .eq("brand_id", brandId)
    .eq("user_status", "approved")
    .in("role_name", ["brand_admin", "brand_manager", "brand_logistics"]);

  if (brandUsersError) {
    console.error("Error fetching brand users for calendar alerts:", brandUsersError);
  }

  // Get super admins
  const { data: superAdmins, error: superAdminsError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("role_name", "super_admin")
    .eq("user_status", "approved");

  if (superAdminsError) {
    console.error("Error fetching super admins for calendar alerts:", superAdminsError);
  }

  // Combine all recipients
  const allRecipients = new Set<string>();
  brandUsers?.forEach((u) => allRecipients.add(u.user_id));
  superAdmins?.forEach((u) => allRecipients.add(u.user_id));

  if (allRecipients.size === 0) {
    return { notificationsCreated: 0 };
  }

  // For each event, check if a notification was already sent recently
  for (const event of upcomingEvents) {
    // Check for existing notifications for this event in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: existingNotifications, error: existingError } = await supabase
      .from("notifications")
      .select("id")
      .eq("related_entity_type", "calendar_event")
      .eq("related_entity_id", event.id)
      .gte("created_at", oneDayAgo.toISOString())
      .limit(1);

    if (existingError) {
      console.error("Error checking existing calendar notifications:", existingError);
      continue;
    }

    // Skip if notification was already sent recently
    if (existingNotifications && existingNotifications.length > 0) {
      continue;
    }

    // Calculate days until due
    const eventDate = new Date(event.event_date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    // Determine notification type and priority based on event type
    let notificationType = "reminder";
    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    let actionUrl = "/calendar";

    switch (event.event_type) {
      case "payment_due":
        notificationType = "payment";
        priority = daysUntilDue === 0 ? "urgent" : daysUntilDue === 1 ? "high" : "medium";
        if (event.related_entity_id) {
          actionUrl = `/invoices?highlight=${event.related_entity_id}`;
        }
        break;
      case "po_approval_due":
        notificationType = "order";
        priority = daysUntilDue === 0 ? "high" : "medium";
        if (event.related_entity_id) {
          actionUrl = `/purchase-orders/${event.related_entity_id}`;
        }
        break;
      case "shipment_arrival":
      case "delivery_milestone":
        notificationType = "shipping";
        priority = daysUntilDue === 0 ? "medium" : "low";
        if (event.related_entity_id && event.related_entity_type === "po") {
          actionUrl = `/purchase-orders/${event.related_entity_id}`;
        } else if (event.related_entity_id && event.related_entity_type === "shipment") {
          actionUrl = `/shipments?highlight=${event.related_entity_id}`;
        }
        break;
      case "backorder_review":
        notificationType = "inventory";
        priority = "medium";
        if (event.related_entity_id) {
          actionUrl = `/purchase-orders/${event.related_entity_id}`;
        }
        break;
      default:
        notificationType = "reminder";
        priority = "low";
    }

    // Create notifications for all recipients
    const notifications = Array.from(allRecipients).map((userId) => ({
      user_id: userId,
      type: notificationType,
      title: event.title,
      message: event.description || `Event scheduled for ${event.event_date}`,
      brand_id: brandId,
      related_entity_type: "calendar_event",
      related_entity_id: event.id,
      priority,
      action_required: daysUntilDue <= 1,
      action_url: actionUrl,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Error creating calendar event notifications:", insertError);
    } else {
      notificationsCreated += notifications.length;
    }
  }

  return { notificationsCreated };
}
