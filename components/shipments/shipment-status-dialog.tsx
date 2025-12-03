"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package, Truck, CheckCircle, XCircle } from "lucide-react";
import type { ShipmentStatus } from "@/types/shipments";

interface ShipmentStatusDialogProps {
  open: boolean;
  onClose: () => void;
  currentStatus: ShipmentStatus;
  shipmentNumber: string;
  onConfirm: (newStatus: ShipmentStatus, notes?: string) => Promise<void>;
}

const STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ["processing", "in_transit", "cancelled"],
  processing: ["in_transit", "shipped", "cancelled"],
  in_transit: ["out_for_delivery", "delivered", "failed"],
  out_for_delivery: ["delivered", "failed"],
  shipped: ["delivered", "failed"],
  delivered: [],
  failed: ["pending"],
  returned: [],
  cancelled: [],
};

const STATUS_INFO: Record<
  ShipmentStatus,
  { label: string; icon: React.ReactNode; description: string; color: string }
> = {
  pending: {
    label: "Pending",
    icon: <Package className="h-4 w-4" />,
    description: "Shipment is awaiting processing",
    color: "bg-gray-100 text-gray-800",
  },
  processing: {
    label: "Processing",
    icon: <Package className="h-4 w-4" />,
    description: "Shipment is being prepared",
    color: "bg-blue-100 text-blue-800",
  },
  in_transit: {
    label: "In Transit",
    icon: <Truck className="h-4 w-4" />,
    description: "Shipment is on the way",
    color: "bg-indigo-100 text-indigo-800",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    icon: <Truck className="h-4 w-4" />,
    description: "Shipment is out for delivery today",
    color: "bg-purple-100 text-purple-800",
  },
  shipped: {
    label: "Shipped",
    icon: <Truck className="h-4 w-4" />,
    description: "Shipment has been shipped",
    color: "bg-purple-100 text-purple-800",
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircle className="h-4 w-4" />,
    description: "Shipment has been delivered",
    color: "bg-green-100 text-green-800",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="h-4 w-4" />,
    description: "Delivery attempt failed",
    color: "bg-red-100 text-red-800",
  },
  returned: {
    label: "Returned",
    icon: <XCircle className="h-4 w-4" />,
    description: "Shipment was returned",
    color: "bg-orange-100 text-orange-800",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="h-4 w-4" />,
    description: "Shipment has been cancelled",
    color: "bg-red-100 text-red-800",
  },
};

export function ShipmentStatusDialog({
  open,
  onClose,
  currentStatus,
  shipmentNumber,
  onConfirm,
}: ShipmentStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | null>(
    null
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const availableTransitions = STATUS_TRANSITIONS[currentStatus];

  const handleConfirm = async () => {
    if (!selectedStatus) return;

    setLoading(true);
    try {
      await onConfirm(selectedStatus, notes || undefined);
      setSelectedStatus(null);
      setNotes("");
      onClose();
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Shipment Status</DialogTitle>
          <DialogDescription>
            Update the status for shipment {shipmentNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Current Status:</span>
            <Badge className={STATUS_INFO[currentStatus].color}>
              {STATUS_INFO[currentStatus].icon}
              <span className="ml-1">{STATUS_INFO[currentStatus].label}</span>
            </Badge>
          </div>

          {/* Available Transitions */}
          {availableTransitions.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p>This shipment cannot be updated further.</p>
              <p className="text-sm mt-1">
                Status &quot;{currentStatus}&quot; is a terminal state.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Label>Select New Status</Label>
              <RadioGroup
                value={selectedStatus || ""}
                onValueChange={(value) =>
                  setSelectedStatus(value as ShipmentStatus)
                }
              >
                {availableTransitions.map((status) => (
                  <div
                    key={status}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStatus === status
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedStatus(status)}
                  >
                    <RadioGroupItem value={status} id={status} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_INFO[status].color}>
                          {STATUS_INFO[status].icon}
                          <span className="ml-1">
                            {STATUS_INFO[status].label}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {STATUS_INFO[status].description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              {/* Transition Preview */}
              {selectedStatus && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm">
                  <Badge className={STATUS_INFO[currentStatus].color}>
                    {STATUS_INFO[currentStatus].label}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge className={STATUS_INFO[selectedStatus].color}>
                    {STATUS_INFO[selectedStatus].label}
                  </Badge>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this status change..."
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {availableTransitions.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={!selectedStatus || loading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

