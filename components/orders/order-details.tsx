"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  Calendar,
  DollarSign,
  FileText,
  Truck,
  Edit,
  Printer,
  Download,
  Plus,
  Megaphone,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus, PaymentStatus, FulfilmentStatus } from "@/types/orders";
import { Distributor } from "@/hooks/use-distributors";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { OrderFormDialog } from "./order-form-dialog";
import { OrderHistory } from "./order-history";
import { OrderStatusTimeline } from "./order-status-timeline";
import { StatusUpdateDialog } from "./status-update-dialog";
import { CreateShipmentDialog } from "@/components/shipments/create-shipment-dialog";
import { ShipmentsList } from "@/components/shipments/shipments-list";
import { formatCurrency } from "@/lib/formatters";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentColors: Record<PaymentStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
};

const fulfilmentColors: Record<FulfilmentStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  partial: "bg-yellow-100 text-yellow-800",
  fulfilled: "bg-green-100 text-green-800",
};

interface OrderDetailsProps {
  orderId: string;
}

export function OrderDetails({ orderId }: OrderDetailsProps) {
  const router = useRouter();
  const { profile } = useEnhancedAuth();
  const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");
  const canManageOrders = !isDistributorAdmin;
  const [order, setOrder] = useState<Order | null>(null);
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [sourcePO, setSourcePO] = useState<{ po_number: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showShipmentDialog, setShowShipmentDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [shipmentsKey, setShipmentsKey] = useState(0); // Key to force refresh shipments list
  const [hasActiveShipment, setHasActiveShipment] = useState(false);
  const autoPromptedRef = useRef(false);
  const autoPromptTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch order details from the database.
   * @param showLoading - If true (default), shows loading skeleton. If false, refreshes data in background.
   */
  const fetchOrderDetails = async (showLoading: boolean = true) => {
    try {
      // Only show loading skeleton if explicitly requested (initial load)
      if (showLoading) {
        setLoading(true);
      }
      const supabase = createClient();

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch distributor if order has distributor_id
      if (orderData.distributor_id) {
        const { data: distributorData, error: distributorError } = await supabase
          .from("distributors")
          .select("*")
          .eq("id", orderData.distributor_id)
          .single();

        if (distributorError) {
          console.error("Error fetching distributor:", distributorError);
        } else {
          setDistributor(distributorData);
        }
      }

      // Fetch source PO if exists
      if (orderData.purchase_order_id) {
        const { data: poData } = await supabase
          .from("purchase_orders")
          .select("po_number")
          .eq("id", orderData.purchase_order_id)
          .single();
          
        if (poData) {
          setSourcePO(poData);
        }
      }
    } catch (err: any) {
      console.error("Error fetching order details:", err);
      // Only set error state on initial load to avoid disrupting user experience
      if (showLoading) {
        setError(err.message || "Failed to load order details");
        toast.error("Failed to load order details");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    // Refresh order data in background (no loading skeleton)
    fetchOrderDetails(false);
    toast.success("Order updated successfully!");
  };

  // Reusable function to update order status via API
  const updateOrderStatus = async (
    newStatus: OrderStatus,
    comment?: string
  ): Promise<boolean> => {
    console.log("[Frontend] updateOrderStatus called:", { orderId: order?.id, newStatus, comment });
    if (!order) {
      console.log("[Frontend] No order available, returning false");
      return false;
    }

    try {
      console.log(`[Frontend] Making PATCH request to /api/orders/${order.id}`);
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_status: newStatus,
          change_reason: comment || undefined,
        }),
      });

      console.log(`[Frontend] PATCH response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("[Frontend] PATCH error data:", errorData);
        throw new Error(errorData.error || "Failed to update order status");
      }

      const responseData = await response.json();
      console.log("[Frontend] PATCH success, response:", responseData);
      return true;
    } catch (err: any) {
      console.error("[Frontend] Error updating order status:", err);
      toast.error(err.message || "Failed to update order status");
      return false;
    }
  };

  const handleShipmentSuccess = async () => {
    handleCloseShipmentDialog();

    // After successful shipment creation, update order status to "shipped"
    // if the order is still in "processing" status
    if (order && order.order_status === "processing") {
      setIsUpdatingStatus(true);
      const success = await updateOrderStatus(
        "shipped",
        "Shipment created - order marked as shipped"
      );
      if (success) {
        toast.success("Shipment created and order marked as shipped!");
      }
      setIsUpdatingStatus(false);
    } else {
      toast.success("Shipment created successfully!");
    }

    // Refresh order data in background (no loading skeleton) to get updated fulfilment_status
    fetchOrderDetails(false);
    setShipmentsKey((prev) => prev + 1); // Force refresh shipments list
    setHasActiveShipment(true);
  };

  // Check if order can have shipments created
  const canCreateShipment = 
    canManageOrders &&
    order && 
    order.order_status !== "cancelled" && 
    order.fulfilment_status !== "fulfilled";

  // Fetch active shipments (non-terminal statuses) so we don't prompt when one exists
  useEffect(() => {
    let isMounted = true;

    const loadActiveShipments = async () => {
      if (!order?.id) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_status")
        .eq("order_id", order.id)
        .not("shipment_status", "in", "(delivered,cancelled,returned)");

      if (!isMounted) return;

      if (error) {
        // Log detailed error info for debugging
        console.error("Error checking active shipments:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        });
        setHasActiveShipment(false);
      } else {
        setHasActiveShipment((data || []).length > 0);
      }
    };

    loadActiveShipments();

    return () => {
      isMounted = false;
    };
  }, [order?.id, shipmentsKey]);

  // Auto-open shipment dialog after 10 seconds if eligible and no active shipment exists
  useEffect(() => {
    if (!order || !canCreateShipment || hasActiveShipment) {
      if (autoPromptTimerRef.current) {
        clearTimeout(autoPromptTimerRef.current);
      }
      return;
    }

    if (autoPromptTimerRef.current) {
      clearTimeout(autoPromptTimerRef.current);
    }

    autoPromptTimerRef.current = setTimeout(() => {
      if (
        !autoPromptedRef.current &&
        canCreateShipment &&
        !hasActiveShipment &&
        order.order_status === "processing"
      ) {
        autoPromptedRef.current = true;
        setShowShipmentDialog(true);
      }
    }, 10000);

    return () => {
      if (autoPromptTimerRef.current) {
        clearTimeout(autoPromptTimerRef.current);
      }
    };
  }, [order?.id, order?.order_status, canCreateShipment, hasActiveShipment]);

  const handleCloseShipmentDialog = () => {
    autoPromptedRef.current = true; // User dismissed; don't auto-open again this session
    setShowShipmentDialog(false);
  };

  const handleStatusClick = (newStatus: OrderStatus) => {
    if (isDistributorAdmin) {
      toast.info("Distributor users cannot update order status.");
      return;
    }

    // Intercept "shipped" status: require creating a shipment instead of direct status update
    if (newStatus === "shipped") {
      // Only allow creating shipment if order can have shipments
      if (canCreateShipment) {
        setShowShipmentDialog(true);
      } else {
        toast.error("Cannot create shipment: order is cancelled or fully fulfilled");
      }
      return;
    }

    // For all other statuses, proceed with the normal status update dialog
    setPendingStatus(newStatus);
    setShowStatusDialog(true);
  };

  const handleStatusConfirm = async (comment: string) => {
    console.log("[Frontend] handleStatusConfirm called:", { pendingStatus, orderId: order?.id, comment });
    if (!pendingStatus || !order) {
      console.log("[Frontend] Missing pendingStatus or order, returning early");
      return;
    }
    
    setIsUpdatingStatus(true);
    try {
      console.log("[Frontend] Calling updateOrderStatus...");
      const success = await updateOrderStatus(pendingStatus, comment);
      if (!success) {
        throw new Error("Failed to update order status");
      }

      toast.success(`Order status updated to ${pendingStatus}`);
      // Refresh order data in background (no loading skeleton)
      fetchOrderDetails(false);
    } catch (err: any) {
      console.error("Error updating order status:", err);
      throw err; // Re-throw so dialog knows update failed
    } finally {
      setIsUpdatingStatus(false);
      setPendingStatus(null);
    }
  };

  const handleGenerateInvoice = async (order: Order) => {
    if (isDistributorAdmin) {
      toast.info("Distributor users cannot generate invoices.");
      return;
    }

    try {
      const response = await fetch(`/api/orders/${order.id}/generate-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate invoice");
      }

      const invoice = await response.json();
      toast.success(`Invoice ${invoice.invoice_number} generated successfully!`);
      
      // Optional: Navigate to invoice details or show a success dialog
      // router.push(`/invoices/${invoice.id}`);
    } catch (err: any) {
      console.error("Error generating invoice:", err);
      toast.error(err.message || "Failed to generate invoice");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-20 bg-gray-200 animate-pulse rounded" />
            <div>
              <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">
            {error || "Order not found"}
          </p>
          <Button 
            onClick={() => router.push("/orders")} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/orders")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {order.order_number}
            </h1>
            <p className="text-sm text-gray-500">
              Order placed on {format(new Date(order.order_date), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          {canManageOrders && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateInvoice(order)}
                disabled={isDistributorAdmin}
                title={
                  isDistributorAdmin
                    ? "Distributor users cannot generate invoices"
                    : "Generate invoice from this order"
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Invoice
              </Button>
              <Button size="sm" onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Order
              </Button>
              {canCreateShipment && (
                <Button
                  size="sm"
                  onClick={() => setShowShipmentDialog(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shipment
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Order Dialog */}
      {canManageOrders && (
        <OrderFormDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          order={order}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Create Shipment Dialog */}
      {order && canManageOrders && (
        <CreateShipmentDialog
          open={showShipmentDialog}
          onClose={handleCloseShipmentDialog}
          order={order}
          onSuccess={handleShipmentSuccess}
        />
      )}

      {/* Status Update Dialog */}
      {pendingStatus && (
        <StatusUpdateDialog
          open={showStatusDialog}
          onClose={() => {
            setShowStatusDialog(false);
            setPendingStatus(null);
          }}
          currentStatus={order.order_status}
          newStatus={pendingStatus}
          onConfirm={handleStatusConfirm}
        />
      )}

      {/* Order Status Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Order Progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-6">
          <OrderStatusTimeline
            currentStatus={order.order_status}
            onStatusClick={handleStatusClick}
          disabled={isDistributorAdmin || isUpdatingStatus}
        />
      </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={`mt-1 ${statusColors[order.order_status]}`}>
                    {order.order_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <Badge className={`mt-1 ${paymentColors[order.payment_status]}`}>
                    {order.payment_status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fulfilment</p>
                  <Badge className={`mt-1 ${fulfilmentColors[order.fulfilment_status || "pending"]}`}>
                    {order.fulfilment_status || "pending"}
                  </Badge>
                </div>
                {sourcePO && (
                  <div>
                    <p className="text-sm text-gray-500">Source Purchase Order</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium text-teal-600 mt-1"
                      onClick={() => router.push(`/purchase-orders/${order.purchase_order_id}`)}
                    >
                      {sourcePO.po_number}
                    </Button>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">
                    {format(new Date(order.order_date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(order.total_amount, order.currency)}
                  </p>
                </div>
                {/* Sales Channel */}
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Sales Channel
                  </p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {order.sales_channel || "Portal"}
                  </Badge>
                </div>
                {/* Campaign */}
                {order.campaign_id && (
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Megaphone className="h-3 w-3" /> Campaign
                    </p>
                    <Badge 
                      variant="outline" 
                      className="mt-1 bg-pink-50 text-pink-700 border-pink-200"
                    >
                      {order.campaign_id}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            SKU
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Qty
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Unit Price
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Discount
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.items.map((item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.sku}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {item.product_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {formatCurrency(item.unit_price, order.currency)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">
                              {item.discount > 0 ? `-${item.discount}%` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-right">
                              {formatCurrency(item.total, order.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Separator />

                  {/* Order Totals */}
                  <div className="space-y-2 max-w-xs ml-auto">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(order.subtotal, order.currency)}</span>
                    </div>
                    {order.discount_total && order.discount_total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(order.discount_total, order.currency)}
                        </span>
                      </div>
                    )}
                    {order.tax_total && order.tax_total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">{formatCurrency(order.tax_total, order.currency)}</span>
                      </div>
                    )}
                    {order.shipping_cost && order.shipping_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">{formatCurrency(order.shipping_cost, order.currency)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total:</span>
                      <span className="text-teal-600">
                        {formatCurrency(order.total_amount, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No items in this order</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Customer & Shipping */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              {order.customer_email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-sm">{order.customer_email}</p>
                </div>
              )}
              {order.customer_phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{order.customer_phone}</p>
                </div>
              )}
              {order.customer_type && (
                <div>
                  <p className="text-sm text-gray-500">Customer Type</p>
                  <Badge variant="outline" className="mt-1">
                    {order.customer_type}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distributor Information */}
          {distributor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Distributor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{distributor.name}</p>
                </div>
                {distributor.code && (
                  <div>
                    <p className="text-sm text-gray-500">Code</p>
                    <p className="font-medium">{distributor.code}</p>
                  </div>
                )}
                {distributor.contact_email && (
                  <div>
                    <p className="text-sm text-gray-500">Contact Email</p>
                    <p className="font-medium text-sm">{distributor.contact_email}</p>
                  </div>
                )}
                {distributor.contact_phone && (
                  <div>
                    <p className="text-sm text-gray-500">Contact Phone</p>
                    <p className="font-medium">{distributor.contact_phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipping Address */}
          {(order.shipping_address_line1 || distributor) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-sm space-y-1">
                  {order.shipping_address_line1 && (
                    <>
                      <p>{order.shipping_address_line1}</p>
                      {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                      <p>
                        {[order.shipping_city, order.shipping_state]
                          .filter(Boolean)
                          .join(", ")}
                        {order.shipping_zip_code && ` ${order.shipping_zip_code}`}
                      </p>
                      {order.shipping_country && <p>{order.shipping_country}</p>}
                    </>
                  )}
                  {!order.shipping_address_line1 && distributor && (
                    <>
                      {distributor.address_line1 && <p>{distributor.address_line1}</p>}
                      {distributor.address_line2 && <p>{distributor.address_line2}</p>}
                      <p>
                        {[distributor.city, distributor.state]
                          .filter(Boolean)
                          .join(", ")}
                        {distributor.postal_code && ` ${distributor.postal_code}`}
                      </p>
                      {distributor.country && <p>{distributor.country}</p>}
                    </>
                  )}
                </address>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {order.tags && order.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {order.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Shipments Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipments
          </CardTitle>
          {canCreateShipment && (
            <Button 
              size="sm" 
              onClick={() => setShowShipmentDialog(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Shipment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ShipmentsList key={shipmentsKey} orderId={order.id} />
        </CardContent>
      </Card>

      {/* Order History */}
      <OrderHistory orderId={order.id} />
    </div>
  );
}
