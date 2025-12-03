"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Truck,
  MapPin,
  Package,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useShipments, ShipmentStatus } from "@/hooks/use-shipments";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { format } from "date-fns";
import { ShipmentStatusDialog } from "./shipment-status-dialog";
import { toast } from "react-toastify";

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
  pending: <Clock className="h-3 w-3" />,
  processing: <Package className="h-3 w-3" />,
  in_transit: <Truck className="h-3 w-3" />,
  out_for_delivery: <Truck className="h-3 w-3" />,
  shipped: <Truck className="h-3 w-3" />,
  delivered: <CheckCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  returned: <XCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

interface ShipmentsListProps {
  orderId?: string; // Optional filter by order
}

export function ShipmentsList({ orderId }: ShipmentsListProps) {
  const router = useRouter();
  const { profile } = useEnhancedAuth();
  const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    dateRange: "all",
  });
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<{
    id: string;
    status: ShipmentStatus;
    shipment_number: string;
  } | null>(null);

  const {
    shipments,
    loading,
    error,
    totalCount,
    deleteShipment,
    updateShipmentStatus,
    refetch,
  } = useShipments({
    searchTerm,
    filters,
    brandId: profile?.brand_id,
    distributorId: isDistributorAdmin ? profile?.distributor_id : undefined,
    orderId,
  });

  const handleStatusUpdate = (shipment: {
    id: string;
    shipment_status: ShipmentStatus;
    shipment_number: string;
  }) => {
    if (isDistributorAdmin) {
      toast.info("Distributor users cannot update shipments.");
      return;
    }
    setSelectedShipment({
      id: shipment.id,
      status: shipment.shipment_status,
      shipment_number: shipment.shipment_number,
    });
    setStatusDialogOpen(true);
  };

  const handleStatusConfirm = async (
    newStatus: ShipmentStatus,
    notes?: string
  ) => {
    if (!selectedShipment) return;

    try {
      await updateShipmentStatus(selectedShipment.id, newStatus, notes);
      setStatusDialogOpen(false);
      setSelectedShipment(null);
      refetch();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDelete = async (shipmentId: string) => {
    if (isDistributorAdmin) {
      toast.info("Distributor users cannot delete shipments.");
      return;
    }
    if (confirm("Are you sure you want to delete this shipment?")) {
      await deleteShipment(shipmentId);
    }
  };

  const handleViewDetails = (shipmentId: string, orderId?: string) => {
    if (orderId) {
      router.push(`/orders/${orderId}?shipment=${shipmentId}`);
    } else {
      router.push(`/shipments/${shipmentId}`);
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
          <p className="text-red-600">Error loading shipments: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters - Hide if viewing shipments for a specific order */}
      {!orderId && (
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search shipments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters({ ...filters, status: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.dateRange}
            onValueChange={(value) =>
              setFilters({ ...filters, dateRange: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shipment #
                  </th>
                  {!orderId && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
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
                {shipments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={orderId ? 7 : 8}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No shipments found.</p>
                      {!orderId && (
                        <p className="text-sm mt-1">
                          Create shipments from the order details page.
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  shipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {shipment.shipment_number}
                        </div>
                      </td>
                      {!orderId && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {shipment.order?.order_number || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {shipment.order?.customer_name}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {shipment.tracking_number || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipment.carrier || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {shipment.total_items_shipped || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipment.shipped_date
                          ? format(
                              new Date(shipment.shipped_date),
                              "MMM dd, yyyy"
                            )
                          : shipment.created_at
                          ? format(
                              new Date(shipment.created_at),
                              "MMM dd, yyyy"
                            )
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={`${
                            statusColors[shipment.shipment_status]
                          } flex items-center gap-1 w-fit`}
                        >
                          {statusIcons[shipment.shipment_status]}
                          {shipment.shipment_status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleViewDetails(
                                  shipment.id,
                                  shipment.order_id
                                )
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {shipment.shipment_status !== "delivered" &&
                              shipment.shipment_status !== "cancelled" &&
                              shipment.shipment_status !== "returned" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate({
                                      id: shipment.id,
                                      shipment_status: shipment.shipment_status,
                                      shipment_number: shipment.shipment_number,
                                    })
                                  }
                                  disabled={isDistributorAdmin}
                                >
                              <Edit className="mr-2 h-4 w-4" />
                                  Update Status
                            </DropdownMenuItem>
                              )}
                            {shipment.tracking_number && (
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    `https://www.google.com/search?q=${shipment.carrier}+tracking+${shipment.tracking_number}`,
                                    "_blank"
                                  )
                                }
                              >
                              <MapPin className="mr-2 h-4 w-4" />
                                Track Package
                            </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(shipment.id)}
                              className="text-red-600"
                              disabled={isDistributorAdmin}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalCount > 0 && (
        <div className="text-sm text-gray-600">
          Showing {shipments.length} of {totalCount} shipments
        </div>
      )}

      {/* Status Update Dialog */}
      {!isDistributorAdmin && selectedShipment && (
        <ShipmentStatusDialog
          open={statusDialogOpen}
          onClose={() => {
            setStatusDialogOpen(false);
            setSelectedShipment(null);
          }}
          currentStatus={selectedShipment.status}
          shipmentNumber={selectedShipment.shipment_number}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
}
