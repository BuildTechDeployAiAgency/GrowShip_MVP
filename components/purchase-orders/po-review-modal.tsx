"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import type { PurchaseOrder, StockValidationResult } from "@/types/purchase-orders";
import { POReviewHeader } from "./po-review-header";
import { POReviewLineItemsTable } from "./po-review-line-items-table";
import { POApprovalSummary } from "./po-approval-summary";

interface POReviewModalProps {
  open: boolean;
  onClose: () => void;
  poId: string | null;
  onSuccess?: () => void;
}

export function POReviewModal({
  open,
  onClose,
  poId,
  onSuccess,
}: POReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [po, setPO] = useState<any | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [stockValidation, setStockValidation] = useState<StockValidationResult[]>([]);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (open && poId) {
      fetchPODetails();
      validateStock();
    }
  }, [open, poId]);

  const fetchPODetails = async () => {
    if (!poId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/details`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch PO details");
      }

      setPO(data.po);
      setLines(data.lines || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  };

  const validateStock = async () => {
    if (!poId) return;

    try {
      const response = await fetch(`/api/purchase-orders/${poId}/validate-stock`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setStockValidation(data.validations || []);
      }
    } catch (error) {
      console.error("Error validating stock:", error);
    }
  };

  const handleLineUpdate = (updatedLine: any) => {
    setLines((prevLines) =>
      prevLines.map((line) =>
        line.id === updatedLine.id ? updatedLine : line
      )
    );
  };

  const handleBulkApproveEligible = async () => {
    if (!poId) return;

    try {
      // Get all lines that can be auto-approved (sufficient stock)
      const eligibleLines = lines.filter((line) => {
        const validation = stockValidation.find((v) => v.line_id === line.id);
        return validation && validation.can_approve;
      });

      if (eligibleLines.length === 0) {
        toast.info("No eligible lines to auto-approve");
        return;
      }

      const decisions = eligibleLines.map((line) => ({
        line_id: line.id,
        approved_qty: line.requested_qty,
        backorder_qty: 0,
        rejected_qty: 0,
        override_applied: false,
        notes: "Auto-approved (sufficient stock)",
      }));

      const response = await fetch(
        `/api/purchase-orders/${poId}/lines/bulk-approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            line_decisions: decisions,
            comments: `Bulk approval: ${eligibleLines.length} lines`,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to bulk approve");
      }

      toast.success(`${result.processed} line items approved`);
      await fetchPODetails();
      await validateStock();
    } catch (error: any) {
      toast.error(error.message || "Failed to bulk approve lines");
    }
  };

  const handleFinalizeApproval = async () => {
    if (!poId) return;

    // Check if all lines reviewed
    const hasUnreviewed = lines.some((line) => line.line_status === "pending");
    if (hasUnreviewed) {
      toast.error("Please review all line items before finalizing");
      return;
    }

    setFinalizing(true);
    try {
      const response = await fetch(
        `/api/purchase-orders/${poId}/approve-complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            create_orders: true,
            comments: "PO approval finalized",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to finalize approval");
      }

      toast.success(
        `PO approved! ${result.orders_created} order(s) created, ${result.backorders_created} backorder(s) recorded`
      );

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to finalize approval");
    } finally {
      setFinalizing(false);
    }
  };

  if (!open || !poId) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Purchase Order Review</DialogTitle>
              <DialogDescription>
                Review and approve line items for this purchase order
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="space-y-6">
              {/* Header Section */}
              {po && <POReviewHeader po={po} />}

              {/* Line Items Table */}
              <POReviewLineItemsTable
                poId={poId}
                lines={lines}
                stockValidation={stockValidation}
                onLineUpdate={handleLineUpdate}
                onRefresh={fetchPODetails}
              />

              {/* Summary Panel */}
              <POApprovalSummary lines={lines} stockValidation={stockValidation} />
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBulkApproveEligible}
              disabled={loading || finalizing}
            >
              Approve All Eligible
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={finalizing}>
              Cancel
            </Button>
            <Button
              onClick={handleFinalizeApproval}
              disabled={loading || finalizing}
            >
              {finalizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                "Finalize Approval"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

