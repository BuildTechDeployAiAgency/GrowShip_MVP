"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  XCircle,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/main-layout";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

type NotificationType = "info" | "success" | "warning" | "error";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "New Order Received",
    message: "Order ORD-2024-001 has been placed",
    type: "success",
    timestamp: "2024-01-20T10:30:00",
    read: false,
  },
  {
    id: "2",
    title: "Inventory Alert",
    message: "Low stock alert for Product XYZ",
    type: "warning",
    timestamp: "2024-01-20T09:15:00",
    read: false,
  },
  {
    id: "3",
    title: "System Update",
    message: "Scheduled maintenance on Jan 25",
    type: "info",
    timestamp: "2024-01-19T14:20:00",
    read: true,
  },
];

const typeConfig: Record<NotificationType, { label: string; color: string; icon: any }> = {
  info: { label: "Info", color: "bg-blue-100 text-blue-800", icon: Info },
  success: { label: "Success", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  warning: { label: "Warning", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  error: { label: "Error", color: "bg-red-100 text-red-800", icon: XCircle },
};

export function NotificationsManagement() {
  const { profile } = useEnhancedAuth();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => !n.read);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <MainLayout
      pageTitle="Notifications"
      pageSubtitle="Manage your notifications"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
              >
                Unread ({notifications.filter((n) => !n.read).length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No notifications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => {
                  const Icon = typeConfig[notification.type].icon;
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 border rounded-lg ${
                        !notification.read ? "bg-blue-50 border-blue-200" : "bg-white"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${typeConfig[notification.type].color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{notification.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <Badge variant="default" className="ml-2">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}