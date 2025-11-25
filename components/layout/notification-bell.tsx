"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationDrawer } from "@/components/notifications/notification-drawer";

export function NotificationBell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { unreadCount } = useNotifications({ isRead: false, limit: 1 });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative"
        onClick={() => setDrawerOpen(true)}
      >
        <Bell className="w-4 h-4 sm:mr-2" />
        <span className="hidden lg:inline">Notifications</span>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>
      <NotificationDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}


