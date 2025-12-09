"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Bell, AlertCircle, AlertTriangle } from "lucide-react";

/**
 * Global notification listener that shows toast messages
 * for high-priority notifications in real-time
 */
export function NotificationListener() {
  const showNotificationToast = useCallback((notification: any) => {
    const { title, message, priority, action_url } = notification;

    // Only show toasts for high and urgent priority
    if (priority !== "high" && priority !== "urgent") {
      return;
    }

    const icon = priority === "urgent" ? AlertCircle : 
                 priority === "high" ? AlertTriangle : Bell;

    const toastOptions = {
      duration: priority === "urgent" ? 10000 : 5000,
      action: action_url ? {
        label: "View",
        onClick: () => {
          window.location.href = action_url;
        },
      } : undefined,
    };

    if (priority === "urgent") {
      toast.error(title, {
        description: message,
        icon: icon({ className: "h-5 w-5" }),
        ...toastOptions,
      });
    } else {
      toast.warning(title, {
        description: message,
        icon: icon({ className: "h-5 w-5" }),
        ...toastOptions,
      });
    }
  }, []);

  useEffect(() => {
    let channel: any = null;

    const setupListener = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Subscribe to new notifications for this user
        channel = supabase
          .channel("notification-toast-listener")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("New notification for toast:", payload);
              if (payload.new) {
                showNotificationToast(payload.new);
              }
            }
          )
          .subscribe((status, err) => {
            if (status === "SUBSCRIBED") {
              console.log("Notification listener active");
            } else if (status === "CLOSED") {
              console.log("Notification listener closed");
            } else if (status === "CHANNEL_ERROR") {
              console.error("Notification listener error:", err);
            }
          });
      } catch (error) {
        console.error("Error setting up notification listener:", error);
      }
    };

    setupListener();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [showNotificationToast]);

  // This component doesn't render anything visible
  return null;
}

