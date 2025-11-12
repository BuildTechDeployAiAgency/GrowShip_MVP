import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

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
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Get unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const response = await fetch("/api/notifications?is_read=false&limit=1");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.total || 0);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

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


