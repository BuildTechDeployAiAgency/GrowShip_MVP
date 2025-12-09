import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
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
  is_read: boolean;
  created_at: string;
}

interface UseNotificationsOptions {
  isRead?: boolean;
  type?: string;
  priority?: string;
  actionRequired?: boolean;
  limit?: number;
  enableRealtime?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const { enableRealtime = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.isRead !== undefined) params.append("is_read", String(options.isRead));
      if (options.type) params.append("type", options.type);
      if (options.priority) params.append("priority", options.priority);
      if (options.actionRequired) params.append("action_required", "true");
      params.append("limit", String(options.limit || 50));

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - notifications update moderately 
    refetchOnWindowFocus: false,
  });

  // Update unreadCount from query data when fetching unread notifications
  useEffect(() => {
    if (options.isRead === false && data?.total !== undefined) {
      setUnreadCount(data.total);
    }
  }, [data?.total, options.isRead]);

  // Fetch unread count (for cases where we're not querying unread notifications)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?is_read=false&limit=1");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // Setup Realtime subscription and fallback polling
  useEffect(() => {
    let channel: any = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const setupRealtime = async () => {
      if (!enableRealtime) return;

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Subscribe to new notifications
        channel = supabase
          .channel("notifications-changes")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("New notification received:", payload);
              // Invalidate queries to refetch
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              // Only fetch unread count if we're not already querying unread notifications
              if (options.isRead !== false) {
                fetchUnreadCount();
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("Notification updated:", payload);
              // Invalidate queries to refetch
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              // Only fetch unread count if we're not already querying unread notifications
              if (options.isRead !== false) {
                fetchUnreadCount();
              }
            }
          )
          .subscribe((status) => {
            console.log("Notification subscription status:", status);
          });
      } catch (error) {
        console.error("Error setting up Realtime subscription:", error);
      }
    };

    setupRealtime();
    
    // Only fetch unread count separately if we're not already querying unread notifications
    if (options.isRead !== false) {
      fetchUnreadCount();
      // Fallback polling (less aggressive - every 5 minutes)
      pollInterval = setInterval(fetchUnreadCount, 300000);
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [enableRealtime, queryClient, fetchUnreadCount, options.isRead]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId, is_read: true }),
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const notifications = data?.notifications || [];
      await Promise.all(
        notifications
          .filter((n: Notification) => !n.is_read)
          .map((n: Notification) =>
            fetch("/api/notifications", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ notification_id: n.id, is_read: true }),
            })
          )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setUnreadCount(0);
    },
  });

  return {
    notifications: data?.notifications || [],
    total: data?.total || 0,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    unreadCount,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
  };
}


