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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { PurchaseOrder } from "@/types/purchase-orders";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface POApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  action: "approve" | "reject";
  onSuccess?: () => void;
}

export function POApprovalDialog({
  open,
  onClose,
  po,
  action,
  onSuccess,
}: POApprovalDialogProps) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!po) return;

    if (action === "reject" && !comments.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setLoading(true);

    try {
      const endpoint = action === "approve"
        ? `/api/purchase-orders/${po.id}/approve`
        : `/api/purchase-orders/${po.id}/reject`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comments: comments.trim() || undefined,
          reason: action === "reject" ? comments.trim() : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} purchase order`);
      }

      toast.success(`Purchase order ${action === "approve" ? "approved" : "rejected"} successfully`);
      setComments("");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} purchase order`);
    } finally {
      setLoading(false);
    }
  };

  if (!po) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {action === "approve" ? "Approve" : "Reject"} Purchase Order
          </DialogTitle>
          <DialogDescription>
            {action === "approve"
              ? "Review the purchase order details and approve if everything looks correct."
              : "Please provide a reason for rejecting this purchase order."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* PO Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">PO Number:</span>
                    <span className="font-medium">{po.po_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supplier:</span>
                    <span className="font-medium">{po.supplier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">
                      {po.currency || "USD"} {po.total_amount?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PO Date:</span>
                    <span className="font-medium">
                      {format(new Date(po.po_date), "MMM dd, yyyy")}
                    </span>
                  </div>
                  {po.expected_delivery_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Delivery:</span>
                      <span className="font-medium">
                        {format(new Date(po.expected_delivery_date), "MMM dd, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments/Reason */}
            <div>
              <Label htmlFor="comments">
                {action === "approve" ? "Comments (Optional)" : "Rejection Reason *"}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  action === "approve"
                    ? "Add any comments or notes..."
                    : "Please explain why this purchase order is being rejected..."
                }
                rows={4}
                className="mt-1"
                required={action === "reject"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant={action === "reject" ? "destructive" : "default"}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {action === "approve" ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

