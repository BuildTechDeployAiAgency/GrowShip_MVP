"use client";

import { useState } from "react";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, CheckCheck, AlertCircle, AlertTriangle, X } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDrawer({ open, onOpenChange }: NotificationDrawerProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications({
    isRead: filter === "all" ? undefined : false,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit: 20,
  });

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const typeIcons: Record<string, any> = {
    order: Bell,
    payment: AlertCircle,
    shipment: Bell,
    warning: AlertTriangle,
    info: Bell,
    success: Check,
    error: AlertCircle,
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Stay updated with your latest alerts and notifications
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Filters and Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="shipment">Shipment</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {notifications.filter((n: Notification) => !n.is_read).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="shrink-0"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark All
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-sm">No notifications found</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {notifications.map((notification: Notification) => {
                  const Icon = typeIcons[notification.type] || Bell;
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        notification.is_read
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white border-teal-200 shadow-sm"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            notification.is_read
                              ? "bg-gray-200"
                              : priorityColors[notification.priority || "medium"] || "bg-blue-100"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="h-6 w-6 p-0 shrink-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {notification.priority && (
                            <Badge
                              className={`${priorityColors[notification.priority]} text-xs mb-1`}
                            >
                              {notification.priority}
                            </Badge>
                          )}
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {format(new Date(notification.created_at), "MMM dd, HH:mm")}
                            </span>
                            {notification.action_url && (
                              <Link
                                href={notification.action_url}
                                onClick={() => onOpenChange(false)}
                                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                              >
                                View →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer Link */}
          <div className="pt-4 border-t">
            <Link
              href="/notifications"
              onClick={() => onOpenChange(false)}
              className="block text-center text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

