"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Calendar,
  FileText,
  Edit,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useShipment } from "@/hooks/use-shipments";
import { ShipmentStatusDialog } from "./shipment-status-dialog";
import type { ShipmentStatus } from "@/types/shipments";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

const statusColors: Record<ShipmentStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusIcons: Record<ShipmentStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  processing: <Package className="h-4 w-4" />,
  in_transit: <Truck className="h-4 w-4" />,
  out_for_delivery: <Truck className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  delivered: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  returned: <XCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

interface ShipmentDetailsProps {
  shipmentId: string;
}

export function ShipmentDetails({ shipmentId }: ShipmentDetailsProps) {
  const router = useRouter();
  const { shipment, loading, error, refetch } = useShipment(shipmentId);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const { profile } = useEnhancedAuth();
  const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");

  const handleStatusConfirm = async (
    newStatus: ShipmentStatus,
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(`Shipment status updated to ${newStatus}`);
      refetch();
      setShowStatusDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update shipment status");
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error || "Shipment not found"}</p>
          <Button
            onClick={() => router.push("/shipments")}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipments
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canUpdateStatus =
    !isDistributorAdmin &&
    shipment.shipment_status !== "delivered" && 
    shipment.shipment_status !== "cancelled" &&
    shipment.shipment_status !== "returned";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/shipments")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {shipment.shipment_number}
            </h1>
            <p className="text-sm text-gray-500">
              Created on{" "}
              {format(new Date(shipment.created_at), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {shipment.order_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/orders/${shipment.order_id}`)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Order
            </Button>
          )}
          {canUpdateStatus && (
            <Button
              size="sm"
              onClick={() => setShowStatusDialog(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Edit className="mr-2 h-4 w-4" />
              Update Status
            </Button>
          )}
        </div>
      </div>

      {/* Status Update Dialog */}
      {!isDistributorAdmin && (
        <ShipmentStatusDialog
          open={showStatusDialog}
          onClose={() => setShowStatusDialog(false)}
          currentStatus={shipment.shipment_status}
          shipmentNumber={shipment.shipment_number}
          onConfirm={handleStatusConfirm}
        />
      )}

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Shipment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {(["pending", "processing", "in_transit", "delivered"] as const).map(
              (status, index) => {
                const currentStatus = shipment.shipment_status;
                const statusOrder = ["pending", "processing", "in_transit", "out_for_delivery", "shipped", "delivered"];
                const isActive =
                  status === currentStatus ||
                  (currentStatus === "shipped" && status === "in_transit") ||
                  (currentStatus === "out_for_delivery" && status === "in_transit") ||
                  (currentStatus === "cancelled" && status === "pending");
                const isPast =
                  statusOrder.indexOf(currentStatus) > statusOrder.indexOf(status);
                const isCancelled = currentStatus === "cancelled" || currentStatus === "failed" || currentStatus === "returned";

                return (
                  <div key={status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCancelled
                            ? "bg-red-100 text-red-600"
                            : isActive
                            ? "bg-teal-600 text-white"
                            : isPast
                            ? "bg-teal-100 text-teal-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {statusIcons[status]}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium capitalize ${
                          isActive || isPast
                            ? "text-gray-900"
                            : "text-gray-400"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    {index < 3 && (
                      <div
                        className={`flex-1 h-1 mx-2 ${
                          isPast ? "bg-teal-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
          {(shipment.shipment_status === "cancelled" || shipment.shipment_status === "failed" || shipment.shipment_status === "returned") && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-center">
              <Badge className={shipment.shipment_status === "returned" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}>
                <XCircle className="h-3 w-3 mr-1" />
                {shipment.shipment_status.charAt(0).toUpperCase() + shipment.shipment_status.slice(1)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Shipment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shipment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge
                    className={`mt-1 ${statusColors[shipment.shipment_status]} flex items-center gap-1 w-fit`}
                  >
                    {statusIcons[shipment.shipment_status]}
                    {shipment.shipment_status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Items</p>
                  <p className="font-medium">
                    {shipment.total_items_shipped || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="font-medium text-teal-600">
                    ${(shipment.total_value || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Carrier</p>
                  <p className="font-medium capitalize">
                    {shipment.carrier || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tracking Number</p>
                  <p className="font-medium">
                    {shipment.tracking_number || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Shipping Method</p>
                  <p className="font-medium capitalize">
                    {shipment.shipping_method?.replace("_", " ") || "-"}
                  </p>
                </div>
              </div>

              {shipment.tracking_number && shipment.carrier && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/search?q=${shipment.carrier}+tracking+${shipment.tracking_number}`,
                      "_blank"
                    )
                  }
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Track Package
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Shipment Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items Shipped</CardTitle>
            </CardHeader>
            <CardContent>
              {shipment.shipment_items && shipment.shipment_items.length > 0 ? (
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
                          Qty Shipped
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Unit Price
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {shipment.shipment_items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {item.sku}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.product_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {item.quantity_shipped}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            ${(item.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-right">
                            ${(item.total_value || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No items in this shipment
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {shipment.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {shipment.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Dates & Address */}
        <div className="space-y-6">
          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">
                  {format(new Date(shipment.created_at), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
              {shipment.shipped_date && (
                <div>
                  <p className="text-sm text-gray-500">Shipped</p>
                  <p className="font-medium">
                    {format(
                      new Date(shipment.shipped_date),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </p>
                </div>
              )}
              {shipment.estimated_delivery_date && (
                <div>
                  <p className="text-sm text-gray-500">Est. Delivery</p>
                  <p className="font-medium">
                    {format(
                      new Date(shipment.estimated_delivery_date),
                      "MMM dd, yyyy"
                    )}
                  </p>
                </div>
              )}
              {shipment.actual_delivery_date && (
                <div>
                  <p className="text-sm text-gray-500">Delivered</p>
                  <p className="font-medium text-green-600">
                    {format(
                      new Date(shipment.actual_delivery_date),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {shipment.shipping_address_line1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-sm space-y-1">
                  <p>{shipment.shipping_address_line1}</p>
                  {shipment.shipping_address_line2 && (
                    <p>{shipment.shipping_address_line2}</p>
                  )}
                  <p>
                    {[shipment.shipping_city, shipment.shipping_state]
                      .filter(Boolean)
                      .join(", ")}
                    {shipment.shipping_zip_code &&
                      ` ${shipment.shipping_zip_code}`}
                  </p>
                  {shipment.shipping_country && (
                    <p>{shipment.shipping_country}</p>
                  )}
                </address>
              </CardContent>
            </Card>
          )}

          {/* Related Order */}
          {(shipment as any).orders && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Related Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto font-medium text-teal-600"
                    onClick={() => router.push(`/orders/${shipment.order_id}`)}
                  >
                    {(shipment as any).orders.order_number}
                  </Button>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">
                    {(shipment as any).orders.customer_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Status</p>
                  <Badge variant="outline" className="mt-1">
                    {(shipment as any).orders.order_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Distributor */}
          {(shipment as any).distributors && (
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
                  <p className="font-medium">
                    {(shipment as any).distributors.name}
                  </p>
                </div>
                {(shipment as any).distributors.code && (
                  <div>
                    <p className="text-sm text-gray-500">Code</p>
                    <p className="font-medium">
                      {(shipment as any).distributors.code}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
