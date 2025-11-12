"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, User, FileText } from "lucide-react";
import { Loader2 } from "lucide-react";

interface OrderHistoryEntry {
  id: string;
  order_id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_by: string;
  change_reason?: string;
  created_at: string;
  changed_by_user?: {
    user_id: string;
    contact_name?: string;
    company_name?: string;
    email?: string;
  };
}

interface OrderHistoryProps {
  orderId: string;
}

const fieldLabels: Record<string, string> = {
  order_status: "Order Status",
  payment_status: "Payment Status",
  estimated_delivery_date: "Estimated Delivery Date",
  actual_delivery_date: "Actual Delivery Date",
  tracking_number: "Tracking Number",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
};

export function OrderHistory({ orderId }: OrderHistoryProps) {
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/history`);
        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }
        const result = await response.json();
        setHistory(result.history || []);
      } catch (err: any) {
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchHistory();
    }
  }, [orderId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">No history available for this order.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-6">
            {history.map((entry, index) => (
              <div key={entry.id} className="relative flex items-start gap-4">
                {/* Icon */}
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-teal-100 text-teal-800 border-teal-200">
                  <Clock className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {fieldLabels[entry.field_name] || entry.field_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(entry.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {/* Value change */}
                  <div className="flex items-center gap-2 mb-2">
                    {entry.old_value && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {entry.old_value}
                        </Badge>
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    {entry.new_value && (
                      <Badge
                        className={
                          statusColors[entry.new_value] ||
                          "bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {entry.new_value}
                      </Badge>
                    )}
                  </div>

                  {/* Actor */}
                  {entry.changed_by_user && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>
                        {entry.changed_by_user.contact_name ||
                          entry.changed_by_user.company_name ||
                          entry.changed_by_user.email ||
                          "Unknown User"}
                      </span>
                    </div>
                  )}

                  {/* Change reason */}
                  {entry.change_reason && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                        <p className="text-sm text-gray-700">{entry.change_reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

