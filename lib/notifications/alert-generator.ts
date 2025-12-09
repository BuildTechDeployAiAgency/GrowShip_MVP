/**
 * ============================================================================
 * LEGACY ALERT GENERATOR
 * ============================================================================
 * 
 * @deprecated These functions are being replaced by the NotificationDispatcher.
 * 
 * Migration Status:
 * - po-alerts.ts: MIGRATED to NotificationDispatcher
 * - inventory-alerts.ts: MIGRATED to NotificationDispatcher
 * - payment-alerts.ts: MIGRATED to NotificationDispatcher
 * - compliance-alerts.ts: MIGRATED to NotificationDispatcher
 * 
 * Files still using legacy functions (need migration):
 * - lib/inventory/order-sync.ts (uses createNotificationsForBrand directly)
 * - lib/inventory/po-sync.ts (uses createNotificationsForBrand directly)
 * - app/api/inventory/adjust/route.ts (uses createNotificationsForBrand directly)
 * - app/api/inventory/bulk-adjust/route.ts (uses createNotificationsForBrand directly)
 * 
 * These legacy functions remain functional for backward compatibility.
 * New code should use:
 *   import { NotificationDispatcher } from "@/lib/notifications/dispatcher";
 *   await NotificationDispatcher.dispatch('type_key', payload, context);
 * 
 * See: lib/notifications/dispatcher.ts
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface AlertData {
  user_id: string;
  type: string;
  title: string;
  message: string;
  brand_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  action_required?: boolean;
  action_url?: string;
  expires_at?: string;
}

export async function createNotification(alert: AlertData): Promise<void> {
  // Use admin client to bypass RLS when creating notifications for other users
  const supabase = createAdminClient();
  
  // Check user's notification preferences
  const shouldCreate = await checkNotificationPreference(
    supabase,
    alert.user_id,
    alert.type
  );

  if (!shouldCreate) {
    console.log(`Notification skipped for user ${alert.user_id} based on preferences`);
    return;
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: alert.user_id,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    brand_id: alert.brand_id || null,
    related_entity_type: alert.related_entity_type || null,
    related_entity_id: alert.related_entity_id || null,
    priority: alert.priority || "medium",
    action_required: alert.action_required || false,
    action_url: alert.action_url || null,
    expires_at: alert.expires_at || null,
    is_read: false,
  });

  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

export async function createNotificationsForBrand(
  alert: Omit<AlertData, "user_id">,
  brandId: string
): Promise<void> {
  // Use admin client to bypass RLS when creating notifications for multiple users
  const supabase = createAdminClient();
  
  // Get all users for the brand
  const { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("brand_id", brandId)
    .eq("user_status", "approved");

  if (usersError) {
    console.error("Error fetching brand users:", usersError);
    throw usersError;
  }

  if (!users || users.length === 0) {
    return;
  }

  // Filter users based on notification preferences
  const filteredNotifications = [];
  for (const user of users) {
    const shouldCreate = await checkNotificationPreference(
      supabase,
      user.user_id,
      alert.type
    );

    if (shouldCreate) {
      filteredNotifications.push({
        user_id: user.user_id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        brand_id: brandId,
        related_entity_type: alert.related_entity_type || null,
        related_entity_id: alert.related_entity_id || null,
        priority: alert.priority || "medium",
        action_required: alert.action_required || false,
        action_url: alert.action_url || null,
        expires_at: alert.expires_at || null,
        is_read: false,
      });
    }
  }

  if (filteredNotifications.length === 0) {
    console.log(`No notifications created for brand ${brandId} - all users opted out`);
    return;
  }

  const { error } = await supabase.from("notifications").insert(filteredNotifications);

  if (error) {
    console.error("Error creating brand notifications:", error);
    throw error;
  }
}

/**
 * Check if a user wants to receive a specific notification type
 * Returns true if notification should be created (default true if no preference set)
 */
async function checkNotificationPreference(
  supabase: any,
  userId: string,
  notificationType: string
): Promise<boolean> {
  try {
    const { data: preference, error } = await supabase
      .from("notification_preferences")
      .select("in_app_enabled")
      .eq("user_id", userId)
      .eq("notification_type", notificationType)
      .maybeSingle();

    if (error) {
      console.error("Error fetching notification preference:", error);
      // Default to true on error
      return true;
    }

    // If no preference is set, default to true (send notification)
    if (!preference) {
      return true;
    }

    return preference.in_app_enabled !== false;
  } catch (error) {
    console.error("Error checking notification preference:", error);
    // Default to true on error
    return true;
  }
}


