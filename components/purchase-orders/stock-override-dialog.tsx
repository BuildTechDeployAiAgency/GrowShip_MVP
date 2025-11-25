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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

interface StockOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  poId: string | null;
  line: any | null;
  onSuccess?: () => void;
}

export function StockOverrideDialog({
  open,
  onClose,
  poId,
  line,
  onSuccess,
}: StockOverrideDialogProps) {
  const [approvedQty, setApprovedQty] = useState(0);
  const [overrideReason, setOverrideReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmed) {
      toast.error("Please confirm that you understand the override");
      return;
    }

    if (!overrideReason.trim()) {
      toast.error("Override reason is required");
      return;
    }

    if (!poId || !line) return;

    setLoading(true);
    try {
      const requestedQty = line.requested_qty;
      const backorderQty = requestedQty - approvedQty;

      const response = await fetch(
        `/api/purchase-orders/${poId}/lines/${line.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approved_qty: approvedQty,
            backorder_qty: Math.max(0, backorderQty),
            rejected_qty: 0,
            override_applied: true,
            override_reason: overrideReason,
            notes: `Override applied: ${overrideReason}`,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to apply override");
      }

      toast.success("Stock override applied successfully");
      setOverrideReason("");
      setApprovedQty(0);
      setConfirmed(false);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to apply override");
    } finally {
      setLoading(false);
    }
  };

  if (!line) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Stock Override Required
          </DialogTitle>
          <DialogDescription>
            This line item has insufficient stock. You can override the stock
            restriction to approve anyway.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Line Details */}
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">SKU:</span>
                <span className="font-medium">{line.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Product:</span>
                <span className="font-medium">{line.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Requested:</span>
                <span className="font-medium">{line.requested_qty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Available Stock:</span>
                <span className="font-medium text-red-600">
                  {line.available_stock ?? 0}
                </span>
              </div>
            </div>

            {/* Approved Quantity */}
            <div>
              <Label htmlFor="approved_qty">
                Approved Quantity *
              </Label>
              <Input
                id="approved_qty"
                type="number"
                value={approvedQty}
                onChange={(e) =>
                  setApprovedQty(parseFloat(e.target.value) || 0)
                }
                min="0"
                max={line.requested_qty}
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {line.requested_qty}
              </p>
            </div>

            {/* Override Reason */}
            <div>
              <Label htmlFor="override_reason">
                Override Reason *
              </Label>
              <Textarea
                id="override_reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why you are overriding the stock restriction..."
                rows={3}
                required
                className="mt-1"
              />
            </div>

            {/* Warning Message */}
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Warning:</strong> Approving more than available stock
                may result in fulfillment delays. This action will be logged
                and tracked.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) =>
                  setConfirmed(checked as boolean)
                }
              />
              <label
                htmlFor="confirm"
                className="text-sm cursor-pointer leading-tight"
              >
                I understand that I am overriding stock restrictions and take
                responsibility for potential fulfillment issues.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !confirmed}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying Override...
                </>
              ) : (
                "Apply Override"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

