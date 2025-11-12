"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit, Trash2, CheckCircle, XCircle, Package, Truck, FileText, X } from "lucide-react";
import { PurchaseOrder, POStatus } from "@/hooks/use-purchase-orders";
import { POApprovalDialog } from "./po-approval-dialog";
import { POHistoryTimeline } from "./po-history-timeline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAvailableActions } from "@/lib/po/workflow-engine";

interface POActionsMenuProps {
  po: PurchaseOrder;
  onStatusChange?: () => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function POActionsMenu({
  po,
  onStatusChange,
  onDelete,
  onViewDetails,
  onEdit,
}: POActionsMenuProps) {
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const availableActions = getAvailableActions(po.po_status);

  const handleApprove = () => {
    setApprovalAction("approve");
    setApprovalDialogOpen(true);
  };

  const handleReject = () => {
    setApprovalAction("reject");
    setApprovalDialogOpen(true);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    try {
      const response = await fetch(`/api/purchase-orders/${po.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to cancel purchase order");
      }

      toast.success("Purchase order cancelled successfully");
      setCancelReason("");
      setCancelDialogOpen(false);
      onStatusChange?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel purchase order");
    }
  };

  const handleStatusChange = async (newStatus: POStatus) => {
    try {
      const endpoint = `/api/purchase-orders/${po.id}`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ po_status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }

      toast.success("Status updated successfully");
      onStatusChange?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {onViewDetails && (
            <DropdownMenuItem onClick={() => onViewDetails(po.id)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}

          {onEdit && po.po_status === "draft" && (
            <DropdownMenuItem onClick={() => onEdit(po.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}

          {availableActions.includes("submit") && po.po_status === "draft" && (
            <DropdownMenuItem onClick={() => handleStatusChange("submitted")}>
              <FileText className="mr-2 h-4 w-4" />
              Submit for Approval
            </DropdownMenuItem>
          )}

          {availableActions.includes("approve") && po.po_status === "submitted" && (
            <DropdownMenuItem onClick={handleApprove}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>
          )}

          {availableActions.includes("reject") && po.po_status === "submitted" && (
            <DropdownMenuItem onClick={handleReject}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </DropdownMenuItem>
          )}

          {availableActions.includes("order") && po.po_status === "approved" && (
            <DropdownMenuItem onClick={() => handleStatusChange("ordered")}>
              <Package className="mr-2 h-4 w-4" />
              Mark as Ordered
            </DropdownMenuItem>
          )}

          {availableActions.includes("receive") && po.po_status === "ordered" && (
            <DropdownMenuItem onClick={() => handleStatusChange("received")}>
              <Truck className="mr-2 h-4 w-4" />
              Mark as Received
            </DropdownMenuItem>
          )}

          {availableActions.includes("cancel") && po.po_status !== "cancelled" && po.po_status !== "received" && (
            <DropdownMenuItem onClick={() => setCancelDialogOpen(true)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setHistoryDialogOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            View History
          </DropdownMenuItem>

          {onDelete && po.po_status === "draft" && (
            <DropdownMenuItem
              onClick={() => onDelete(po.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approval Dialog */}
      <POApprovalDialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        po={po}
        action={approvalAction}
        onSuccess={onStatusChange}
      />

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Purchase Order History</DialogTitle>
            <DialogDescription>
              View the complete approval and status change history
            </DialogDescription>
          </DialogHeader>
          <POHistoryTimeline poId={po.id} />
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this purchase order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Cancellation Reason *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                rows={4}
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCancel} variant="destructive">
              Cancel PO
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

