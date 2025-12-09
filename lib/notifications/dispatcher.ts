/**
 * ============================================================================
 * NOTIFICATION DISPATCHER
 * ============================================================================
 * Centralized service for sending role-based notifications.
 * Replaces hardcoded notification logic with database-driven configuration.
 * 
 * Usage:
 *   await NotificationDispatcher.dispatch('po_created', {
 *     title: 'New Purchase Order Created',
 *     message: `PO ${poNumber} has been created`,
 *     brandId: 'uuid',
 *     relatedEntityType: 'po',
 *     relatedEntityId: poId,
 *     actionUrl: `/purchase-orders/${poId}`,
 *   }, {
 *     excludeUserId: creatorId,  // Exclude the creator
 *   });
 */

import { createAdminClient } from "@/lib/supabase/server";

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationPayload {
  title: string;
  message: string;
  brandId?: string;
  distributorId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  actionRequired?: boolean;
  actionUrl?: string;
  expiresAt?: string;
}

export interface DispatchContext {
  /** Exclude specific user from receiving notification (e.g., the creator) */
  excludeUserId?: string;
  /** Override priority from notification type default */
  priorityOverride?: "low" | "medium" | "high" | "urgent";
  /** Override action required from notification type default */
  actionRequiredOverride?: boolean;
  /** Send to a specific user instead of role-based resolution */
  targetUserId?: string;
  /** Send to specific roles only (subset of enabled roles) */
  targetRoles?: string[];
}

export interface NotificationTypeConfig {
  id: string;
  key: string;
  name: string;
  category: string;
  defaultPriority: "low" | "medium" | "high" | "urgent";
  defaultActionRequired: boolean;
}

export interface RoleSetting {
  role: string;
  isEnabled: boolean;
  frequency: "instant" | "hourly_digest" | "daily_digest" | "weekly_digest";
  channels: string[];
}

export interface ResolvedRecipient {
  userId: string;
  role: string;
  frequency: "instant" | "hourly_digest" | "daily_digest" | "weekly_digest";
  channels: string[];
}

// ============================================================================
// SIMPLE IN-MEMORY CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache for notification settings

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ============================================================================
// NOTIFICATION DISPATCHER CLASS
// ============================================================================

export class NotificationDispatcher {
  /**
   * Main dispatch method - sends notifications based on type configuration
   */
  static async dispatch(
    typeKey: string,
    payload: NotificationPayload,
    context: DispatchContext = {}
  ): Promise<{ success: boolean; notificationsSent: number; error?: string }> {
    try {
      const supabase = createAdminClient();

      // 1. Get notification type configuration
      const typeConfig = await this.getNotificationTypeConfig(supabase, typeKey);
      if (!typeConfig) {
        console.warn(`[NotificationDispatcher] Unknown notification type: ${typeKey}`);
        return { success: false, notificationsSent: 0, error: `Unknown notification type: ${typeKey}` };
      }

      // 2. Handle direct user targeting (for creator-specific notifications)
      if (context.targetUserId) {
        return await this.sendToUser(
          supabase,
          typeKey,
          typeConfig,
          payload,
          context.targetUserId,
          context
        );
      }

      // 3. Get enabled roles and their settings
      const roleSettings = await this.getEnabledRoleSettings(supabase, typeConfig.id);
      if (roleSettings.length === 0) {
        console.log(`[NotificationDispatcher] No enabled roles for ${typeKey}`);
        return { success: true, notificationsSent: 0 };
      }

      // 4. Filter to target roles if specified
      const effectiveRoles = context.targetRoles
        ? roleSettings.filter(rs => context.targetRoles!.includes(rs.role))
        : roleSettings;

      // 5. Resolve recipients based on brand/distributor context
      const recipients = await this.resolveRecipients(
        supabase,
        effectiveRoles,
        payload.brandId,
        payload.distributorId,
        context.excludeUserId
      );

      if (recipients.length === 0) {
        console.log(`[NotificationDispatcher] No recipients resolved for ${typeKey}`);
        return { success: true, notificationsSent: 0 };
      }

      // 6. Create notifications
      const notificationsSent = await this.createNotifications(
        supabase,
        typeKey,
        typeConfig,
        payload,
        recipients,
        context
      );

      console.log(`[NotificationDispatcher] Sent ${notificationsSent} notifications for ${typeKey}`);
      return { success: true, notificationsSent };

    } catch (error) {
      console.error(`[NotificationDispatcher] Error dispatching ${typeKey}:`, error);
      return { success: false, notificationsSent: 0, error: String(error) };
    }
  }

  /**
   * Send notification to a specific user (e.g., PO creator for status updates)
   */
  private static async sendToUser(
    supabase: ReturnType<typeof createAdminClient>,
    typeKey: string,
    typeConfig: NotificationTypeConfig,
    payload: NotificationPayload,
    userId: string,
    context: DispatchContext
  ): Promise<{ success: boolean; notificationsSent: number; error?: string }> {
    // Check if this user should receive notifications based on their role
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("role_name, user_status")
      .eq("user_id", userId)
      .single();

    if (!userProfile || userProfile.user_status !== "approved") {
      return { success: true, notificationsSent: 0 };
    }

    // Check role settings for this notification type
    const roleSetting = await this.getRoleSettingForUser(supabase, typeConfig.id, userProfile.role_name);
    if (!roleSetting?.isEnabled) {
      console.log(`[NotificationDispatcher] Notification ${typeKey} disabled for role ${userProfile.role_name}`);
      return { success: true, notificationsSent: 0 };
    }

    // Check user's personal preferences
    const shouldSend = await this.checkUserPreference(supabase, userId, typeKey);
    if (!shouldSend) {
      return { success: true, notificationsSent: 0 };
    }

    // Create the notification
    const priority = context.priorityOverride || payload.priority || typeConfig.defaultPriority;
    const actionRequired = context.actionRequiredOverride ?? payload.actionRequired ?? typeConfig.defaultActionRequired;

    if (roleSetting.frequency === "instant") {
      await this.insertNotification(supabase, {
        userId,
        type: typeKey,
        title: payload.title,
        message: payload.message,
        brandId: payload.brandId,
        relatedEntityType: payload.relatedEntityType,
        relatedEntityId: payload.relatedEntityId,
        priority,
        actionRequired,
        actionUrl: payload.actionUrl,
        expiresAt: payload.expiresAt,
      });
    } else {
      await this.insertDigest(supabase, userId, typeConfig.id, roleSetting.frequency, payload);
    }

    return { success: true, notificationsSent: 1 };
  }

  /**
   * Get notification type configuration from database (cached)
   */
  private static async getNotificationTypeConfig(
    supabase: ReturnType<typeof createAdminClient>,
    typeKey: string
  ): Promise<NotificationTypeConfig | null> {
    const cacheKey = `notification_type_${typeKey}`;
    const cached = getCached<NotificationTypeConfig>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from("notification_types")
      .select("id, key, name, category, default_priority, default_action_required")
      .eq("key", typeKey)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return null;
    }

    const config: NotificationTypeConfig = {
      id: data.id,
      key: data.key,
      name: data.name,
      category: data.category,
      defaultPriority: data.default_priority,
      defaultActionRequired: data.default_action_required,
    };

    setCache(cacheKey, config);
    return config;
  }

  /**
   * Get all enabled role settings for a notification type (cached)
   */
  private static async getEnabledRoleSettings(
    supabase: ReturnType<typeof createAdminClient>,
    notificationTypeId: string
  ): Promise<RoleSetting[]> {
    const cacheKey = `role_settings_${notificationTypeId}`;
    const cached = getCached<RoleSetting[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from("notification_role_settings")
      .select("role, is_enabled, frequency, channels")
      .eq("notification_type_id", notificationTypeId)
      .eq("is_enabled", true);

    if (error || !data) {
      return [];
    }

    const settings: RoleSetting[] = data.map(row => ({
      role: row.role,
      isEnabled: row.is_enabled,
      frequency: row.frequency,
      channels: row.channels || ["in_app"],
    }));

    setCache(cacheKey, settings);
    return settings;
  }

  /**
   * Get role setting for a specific user's role
   */
  private static async getRoleSettingForUser(
    supabase: ReturnType<typeof createAdminClient>,
    notificationTypeId: string,
    role: string
  ): Promise<RoleSetting | null> {
    const { data, error } = await supabase
      .from("notification_role_settings")
      .select("role, is_enabled, frequency, channels")
      .eq("notification_type_id", notificationTypeId)
      .eq("role", role)
      .single();

    if (error || !data) {
      // Default to enabled if no setting exists
      return {
        role,
        isEnabled: true,
        frequency: "instant",
        channels: ["in_app"],
      };
    }

    return {
      role: data.role,
      isEnabled: data.is_enabled,
      frequency: data.frequency,
      channels: data.channels || ["in_app"],
    };
  }

  /**
   * Resolve recipients based on role settings and brand/distributor context
   */
  private static async resolveRecipients(
    supabase: ReturnType<typeof createAdminClient>,
    roleSettings: RoleSetting[],
    brandId?: string,
    distributorId?: string,
    excludeUserId?: string
  ): Promise<ResolvedRecipient[]> {
    const recipients: ResolvedRecipient[] = [];

    for (const setting of roleSettings) {
      let users: { user_id: string }[] = [];

      // Determine how to query users based on role type
      if (setting.role === "super_admin") {
        // Super admins are global - no brand/distributor filter
        const { data } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("role_name", "super_admin")
          .eq("user_status", "approved");
        users = data || [];
      } else if (setting.role.startsWith("distributor_")) {
        // Distributor roles - filter by distributor_id
        if (distributorId) {
          const { data } = await supabase
            .from("user_profiles")
            .select("user_id")
            .eq("distributor_id", distributorId)
            .eq("role_name", setting.role)
            .eq("user_status", "approved");
          users = data || [];
        }
      } else {
        // Brand roles - filter by brand_id
        if (brandId) {
          const { data } = await supabase
            .from("user_profiles")
            .select("user_id")
            .eq("brand_id", brandId)
            .eq("role_name", setting.role)
            .eq("user_status", "approved");
          users = data || [];
        }
      }

      // Add users to recipients (excluding specified user)
      for (const user of users) {
        if (excludeUserId && user.user_id === excludeUserId) {
          continue;
        }

        recipients.push({
          userId: user.user_id,
          role: setting.role,
          frequency: setting.frequency,
          channels: setting.channels,
        });
      }
    }

    // Deduplicate (in case user has multiple roles)
    const seen = new Set<string>();
    return recipients.filter(r => {
      if (seen.has(r.userId)) return false;
      seen.add(r.userId);
      return true;
    });
  }

  /**
   * Check user's personal notification preferences
   */
  private static async checkUserPreference(
    supabase: ReturnType<typeof createAdminClient>,
    userId: string,
    notificationType: string
  ): Promise<boolean> {
    const { data: preference, error } = await supabase
      .from("notification_preferences")
      .select("in_app_enabled")
      .eq("user_id", userId)
      .eq("notification_type", notificationType)
      .maybeSingle();

    if (error) {
      console.error("[NotificationDispatcher] Error checking user preference:", error);
      return true; // Default to sending on error
    }

    // If no preference set, default to enabled
    if (!preference) {
      return true;
    }

    return preference.in_app_enabled !== false;
  }

  /**
   * Create notifications for all recipients
   */
  private static async createNotifications(
    supabase: ReturnType<typeof createAdminClient>,
    typeKey: string,
    typeConfig: NotificationTypeConfig,
    payload: NotificationPayload,
    recipients: ResolvedRecipient[],
    context: DispatchContext
  ): Promise<number> {
    const priority = context.priorityOverride || payload.priority || typeConfig.defaultPriority;
    const actionRequired = context.actionRequiredOverride ?? payload.actionRequired ?? typeConfig.defaultActionRequired;

    const instantNotifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      brand_id: string | null;
      related_entity_type: string | null;
      related_entity_id: string | null;
      priority: string;
      action_required: boolean;
      action_url: string | null;
      expires_at: string | null;
      is_read: boolean;
    }> = [];

    const digestItems: Array<{
      userId: string;
      notificationTypeId: string;
      frequency: string;
      data: NotificationPayload;
    }> = [];

    // Check user preferences and split into instant vs digest
    for (const recipient of recipients) {
      const shouldSend = await this.checkUserPreference(supabase, recipient.userId, typeKey);
      if (!shouldSend) continue;

      if (recipient.frequency === "instant") {
        instantNotifications.push({
          user_id: recipient.userId,
          type: typeKey,
          title: payload.title,
          message: payload.message,
          brand_id: payload.brandId || null,
          related_entity_type: payload.relatedEntityType || null,
          related_entity_id: payload.relatedEntityId || null,
          priority,
          action_required: actionRequired,
          action_url: payload.actionUrl || null,
          expires_at: payload.expiresAt || null,
          is_read: false,
        });
      } else {
        digestItems.push({
          userId: recipient.userId,
          notificationTypeId: typeConfig.id,
          frequency: recipient.frequency,
          data: payload,
        });
      }
    }

    // Batch insert instant notifications
    if (instantNotifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(instantNotifications);
      if (error) {
        console.error("[NotificationDispatcher] Error inserting notifications:", error);
      }
    }

    // Batch insert digest items
    if (digestItems.length > 0) {
      const digestRecords = digestItems.map(item => ({
        user_id: item.userId,
        notification_type_id: item.notificationTypeId,
        frequency: item.frequency,
        data: item.data,
        status: "pending",
      }));

      const { error } = await supabase.from("notification_digests").insert(digestRecords);
      if (error) {
        console.error("[NotificationDispatcher] Error inserting digest items:", error);
      }
    }

    return instantNotifications.length + digestItems.length;
  }

  /**
   * Insert a single notification
   */
  private static async insertNotification(
    supabase: ReturnType<typeof createAdminClient>,
    notification: {
      userId: string;
      type: string;
      title: string;
      message: string;
      brandId?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
      priority: string;
      actionRequired: boolean;
      actionUrl?: string;
      expiresAt?: string;
    }
  ): Promise<void> {
    const { error } = await supabase.from("notifications").insert({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      brand_id: notification.brandId || null,
      related_entity_type: notification.relatedEntityType || null,
      related_entity_id: notification.relatedEntityId || null,
      priority: notification.priority,
      action_required: notification.actionRequired,
      action_url: notification.actionUrl || null,
      expires_at: notification.expiresAt || null,
      is_read: false,
    });

    if (error) {
      console.error("[NotificationDispatcher] Error inserting notification:", error);
    }
  }

  /**
   * Insert a digest item for later aggregation
   */
  private static async insertDigest(
    supabase: ReturnType<typeof createAdminClient>,
    userId: string,
    notificationTypeId: string,
    frequency: string,
    payload: NotificationPayload
  ): Promise<void> {
    const { error } = await supabase.from("notification_digests").insert({
      user_id: userId,
      notification_type_id: notificationTypeId,
      frequency,
      data: payload,
      status: "pending",
    });

    if (error) {
      console.error("[NotificationDispatcher] Error inserting digest:", error);
    }
  }

  /**
   * Clear the settings cache (call this when settings are updated)
   */
  static clearCache(): void {
    cache.clear();
    console.log("[NotificationDispatcher] Cache cleared");
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS (for backwards compatibility)
// ============================================================================

/**
 * Send a notification using the new dispatcher
 * This is a drop-in replacement for createNotificationsForBrand
 */
export async function dispatchNotification(
  typeKey: string,
  payload: NotificationPayload,
  context?: DispatchContext
): Promise<{ success: boolean; notificationsSent: number; error?: string }> {
  return NotificationDispatcher.dispatch(typeKey, payload, context);
}

/**
 * Send a notification to a specific user
 * This is a drop-in replacement for createNotification
 */
export async function dispatchToUser(
  typeKey: string,
  userId: string,
  payload: Omit<NotificationPayload, "brandId" | "distributorId">,
  context?: Omit<DispatchContext, "targetUserId">
): Promise<{ success: boolean; notificationsSent: number; error?: string }> {
  return NotificationDispatcher.dispatch(typeKey, payload, { ...context, targetUserId: userId });
}
