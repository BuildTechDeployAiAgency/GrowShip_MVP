import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  
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
  const supabase = await createClient();
  
  // Get all users for the brand
  const { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("brand_id", brandId)
    .eq("status", "approved");

  if (usersError) {
    console.error("Error fetching brand users:", usersError);
    throw usersError;
  }

  if (!users || users.length === 0) {
    return;
  }

  // Create notifications for all users
  const notifications = users.map((user) => ({
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
  }));

  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    console.error("Error creating brand notifications:", error);
    throw error;
  }
}


