"use client";

import { useState, useMemo } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { Notification } from "@/hooks/use-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Filter, AlertCircle, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, isAfter } from "date-fns";
import Link from "next/link";

export function NotificationList() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications({
    isRead: filter === "all" ? undefined : filter === "read",
    type: typeFilter !== "all" ? typeFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    limit: 100,
  });

  // Client-side filtering for entity type and date
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Filter by entity type
    if (entityFilter !== "all") {
      filtered = filtered.filter(
        (n: Notification) => n.related_entity_type === entityFilter
      );
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDateMap: Record<string, Date> = {
        today: subDays(now, 0),
        week: subDays(now, 7),
        month: subDays(now, 30),
      };
      const filterDate = filterDateMap[dateFilter];

      if (filterDate) {
        filtered = filtered.filter((n: Notification) =>
          isAfter(new Date(n.created_at), filterDate)
        );
      }
    }

    return filtered;
  }, [notifications, entityFilter, dateFilter]);

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
    warning: AlertCircle,
    info: Bell,
    success: Check,
    error: AlertCircle,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {notifications.filter((n: Notification) => !n.is_read).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="shipment">Shipment</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="po">Purchase Order</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="shipment">Shipment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 ml-auto">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No notifications found</p>
            {notifications.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your filters
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification: Notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              return (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.is_read
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`p-2 rounded-lg ${
                          notification.is_read
                            ? "bg-gray-200"
                            : priorityColors[notification.priority || "medium"] || "bg-blue-100"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          {notification.priority && (
                            <Badge
                              className={
                                priorityColors[notification.priority] || "bg-gray-100"
                              }
                            >
                              {notification.priority}
                            </Badge>
                          )}
                          {notification.action_required && (
                            <Badge variant="outline" className="border-orange-300 text-orange-700">
                              Action Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {format(new Date(notification.created_at), "MMM dd, yyyy HH:mm")}
                          </span>
                          {notification.action_url && (
                            <Link
                              href={notification.action_url}
                              className="text-teal-600 hover:text-teal-700 font-medium"
                            >
                              View Details →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="ml-2"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


