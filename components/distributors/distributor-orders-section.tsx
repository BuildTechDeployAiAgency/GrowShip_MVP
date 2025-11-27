"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreHorizontal, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrders } from "@/hooks/use-orders";
import type { Order, OrderStatus } from "@/types/orders";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { format } from "date-fns";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

const statusColors: Record<OrderStatus | "confirmed" | "cancelled", string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

interface DistributorOrdersSectionProps {
  distributorId: string;
  distributorName: string;
}

export function DistributorOrdersSection({
  distributorId,
  distributorName,
}: DistributorOrdersSectionProps) {
  const router = useRouter();
  const { profile, canPerformAction } = useEnhancedAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    dateRange: "all",
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  const isSuperAdmin = canPerformAction("view_all_users");

  // Refetch orders when distributorId changes or when component mounts
  useEffect(() => {
    // Invalidate orders query to ensure fresh data
    queryClient.invalidateQueries({ 
      queryKey: ["orders"],
      exact: false 
    });
  }, [distributorId, queryClient]);

  const {
    orders,
    loading,
    error,
    totalCount,
    refetch,
  } = useOrders({
    searchTerm: searchTerm,
    filters: {
      ...filters,
      paymentStatus: "all",
      customerType: "all",
      distributorId: distributorId,
    },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    pageSize: 50, // Show last 50 orders
  });

  // Debug logging
  useEffect(() => {
    console.log("[DistributorOrdersSection] Orders fetched", {
      distributorId,
      ordersCount: orders.length,
      loading,
      error,
      filters,
      brandId: isSuperAdmin ? undefined : profile?.brand_id,
    });
  }, [orders, loading, error, distributorId, filters, isSuperAdmin, profile?.brand_id]);

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
    setShowSummaryDialog(true);
  };

  const handleViewOrderDetails = () => {
    if (selectedOrder) {
      setShowSummaryDialog(false);
      router.push(`/orders/${selectedOrder.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading orders: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Orders History</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing last {Math.min(50, orders.length)} orders
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters({ ...filters, status: value })
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <p className="text-sm font-medium mb-2">No orders found</p>
                        <p className="text-xs text-gray-400">
                          This customer hasn't placed any orders yet.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(order)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-teal-600">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(order.order_date), "MMM dd, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Array.isArray(order.items) ? order.items.length : 0} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.currency || "USD"} {order.total_amount?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={statusColors[order.order_status]}>
                          {order.order_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(order);
                          }}
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Order Summary</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-4 py-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-500">Order #</span>
                <span className="font-bold">{selectedOrder.order_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-500">Date</span>
                <span>{format(new Date(selectedOrder.order_date), "PPP")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-500">Status</span>
                <Badge className={statusColors[selectedOrder.order_status]}>
                  {selectedOrder.order_status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-500">Total Amount</span>
                <span className="font-bold text-lg">
                  {selectedOrder.currency || "USD"} {selectedOrder.total_amount?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-500">Items Count</span>
                <span>{Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0}</span>
              </div>
              
              {/* Simple items preview if available */}
              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <span className="text-sm font-medium text-gray-500 block mb-2">Items Preview</span>
                  <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                    {selectedOrder.items.slice(0, 3).map((item: any, idx: number) => (
                      <li key={idx} className="flex justify-between">
                        <span className="truncate max-w-[200px]">{item.product_name || item.name || "Item"}</span>
                        <span>x{item.quantity}</span>
                      </li>
                    ))}
                    {selectedOrder.items.length > 3 && (
                      <li className="text-xs text-gray-400 italic">
                        +{selectedOrder.items.length - 3} more items...
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>
              Close
            </Button>
            <Button onClick={handleViewOrderDetails}>
              View Full Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
