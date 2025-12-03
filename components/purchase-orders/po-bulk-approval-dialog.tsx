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
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface POBulkApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  selectedPOs: PurchaseOrder[];
  onSuccess?: () => void;
}

export function POBulkApprovalDialog({
  open,
  onClose,
  selectedPOs,
  onSuccess,
}: POBulkApprovalDialogProps) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPOs.length === 0) return;

    setLoading(true);

    try {
      const response = await fetch("/api/purchase-orders/bulk-approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poIds: selectedPOs.map((po) => po.id),
          comments: comments.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to bulk approve purchase orders");
      }

      if (result.results.failed.length > 0) {
        toast.warning(
          `Approved ${result.results.success.length} orders. ${result.results.failed.length} failed.`
        );
      } else {
        toast.success(`Successfully approved ${result.results.success.length} purchase orders`);
      }

      setComments("");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to bulk approve purchase orders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Approve Purchase Orders</DialogTitle>
          <DialogDescription>
            You are about to approve {selectedPOs.length} purchase orders.
            {selectedPOs.some((po) => po.po_status !== "submitted") && (
              <span className="block text-amber-600 mt-2">
                Warning: Some selected orders may not be in "submitted" status and will be skipped or fail.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 bg-gray-50">
              <ul className="space-y-1 text-sm">
                {selectedPOs.map((po) => (
                  <li key={po.id} className="flex justify-between">
                    <span>{po.po_number}</span>
                    <span className="text-gray-500">{po.supplier_name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments for these approvals..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedPOs.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve {selectedPOs.length} Orders
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

