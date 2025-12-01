"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Clock, User, FileText, ChevronLeft, ChevronRight, Plus, History } from "lucide-react";
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
  // For synthetic "Order Created" entry
  isSynthetic?: boolean;
}

interface OrderHistoryApiResponse {
  history: OrderHistoryEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  orderCreatedAt?: string;
  orderCreatedBy?: string;
  orderCreatedByUser?: {
    user_id: string;
    contact_name?: string;
    company_name?: string;
    email?: string;
  };
}

interface OrderHistoryProps {
  orderId: string;
}

const PAGE_SIZE = 10;

const fieldLabels: Record<string, string> = {
  order_status: "Order Status",
  payment_status: "Payment Status",
  estimated_delivery_date: "Estimated Delivery Date",
  actual_delivery_date: "Actual Delivery Date",
  tracking_number: "Tracking Number",
  order_created: "Order Created",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
};

export function OrderHistory({ orderId }: OrderHistoryProps) {
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [orderCreatedAt, setOrderCreatedAt] = useState<string | null>(null);
  const [orderCreatedByUser, setOrderCreatedByUser] = useState<OrderHistoryEntry["changed_by_user"] | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchHistory = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/orders/${orderId}/history?page=${pageNum}&pageSize=${PAGE_SIZE}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch history");
      }
      const result: OrderHistoryApiResponse = await response.json();
      setHistory(result.history || []);
      setTotalCount(result.totalCount || 0);
      setHasMore(result.hasMore || false);
      setOrderCreatedAt(result.orderCreatedAt || null);
      setOrderCreatedByUser(result.orderCreatedByUser || null);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchHistory(page);
    }
  }, [orderId, page, fetchHistory]);

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  // Determine if we should show the "Order Created" entry on this page
  // It should appear as the last entry (chronologically oldest)
  const isLastPage = page === totalPages;
  const showOrderCreatedEntry = isLastPage && orderCreatedAt;

  // Build display entries: history entries + optional "Order Created" synthetic entry
  const displayEntries: OrderHistoryEntry[] = [...history];
  
  if (showOrderCreatedEntry) {
    displayEntries.push({
      id: "order-created-synthetic",
      order_id: orderId,
      field_name: "order_created",
      old_value: undefined,
      new_value: "Order Created",
      changed_by: "",
      created_at: orderCreatedAt!,
      changed_by_user: orderCreatedByUser || undefined,
      isSynthetic: true,
    });
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => fetchHistory(page)}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state - but we should always have at least the "Order Created" entry
  if (displayEntries.length === 0 && !orderCreatedAt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">No history available for this order.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Order History
        </CardTitle>
        {totalCount > 0 && (
          <span className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? "entry" : "entries"}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-6">
            {displayEntries.map((entry) => (
              <div key={entry.id} className="relative flex items-start gap-4">
                {/* Icon */}
                <div 
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    entry.isSynthetic 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : "bg-teal-100 text-teal-800 border-teal-200"
                  }`}
                >
                  {entry.isSynthetic ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${entry.isSynthetic ? "text-green-800" : "text-gray-900"}`}>
                      {fieldLabels[entry.field_name] || entry.field_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(entry.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {/* Value change - for regular entries */}
                  {!entry.isSynthetic && (
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
                  )}

                  {/* Special display for "Order Created" */}
                  {entry.isSynthetic && (
                    <div className="mb-2">
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        New Order
                      </Badge>
                    </div>
                  )}

                  {/* Actor */}
                  {entry.changed_by_user && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>
                        {entry.isSynthetic ? "Created by: " : "Changed by: "}
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
