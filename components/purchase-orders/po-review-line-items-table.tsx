"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Edit2,
  Save,
  X as XIcon,
} from "lucide-react";
import { toast } from "react-toastify";
import type { StockValidationResult } from "@/types/purchase-orders";
import { StockOverrideDialog } from "./stock-override-dialog";

interface POReviewLineItemsTableProps {
  poId: string;
  lines: any[];
  stockValidation: StockValidationResult[];
  onLineUpdate: (line: any) => void;
  onRefresh: () => void;
}

const lineStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  approved: "bg-green-100 text-green-800",
  partially_approved: "bg-yellow-100 text-yellow-800",
  backordered: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const stockStatusIcons = {
  sufficient: <CheckCircle className="h-4 w-4 text-green-600" />,
  partial: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  insufficient: <XCircle className="h-4 w-4 text-red-600" />,
};

export function POReviewLineItemsTable({
  poId,
  lines,
  stockValidation,
  onLineUpdate,
  onRefresh,
}: POReviewLineItemsTableProps) {
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    approved_qty: number;
    backorder_qty: number;
    notes: string;
  }>({
    approved_qty: 0,
    backorder_qty: 0,
    notes: "",
  });
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any | null>(null);

  const getStockValidation = (lineId: string) => {
    return stockValidation.find((v) => v.line_id === lineId);
  };

  const handleEditLine = (line: any) => {
    setEditingLine(line.id);
    setEditValues({
      approved_qty: line.approved_qty || 0,
      backorder_qty: line.backorder_qty || 0,
      notes: line.line_notes || "",
    });
  };

  const handleSaveLine = async (line: any) => {
    try {
      const validation = getStockValidation(line.id);
      const requestedQty = line.requested_qty;

      // Calculate rejected qty
      const rejectedQty = requestedQty - editValues.approved_qty - editValues.backorder_qty;

      if (rejectedQty < 0) {
        toast.error("Total quantities cannot exceed requested quantity");
        return;
      }

      const response = await fetch(
        `/api/purchase-orders/${poId}/lines/${line.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approved_qty: editValues.approved_qty,
            backorder_qty: editValues.backorder_qty,
            rejected_qty: rejectedQty,
            override_applied: false,
            notes: editValues.notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to approve line");
      }

      toast.success("Line item updated");
      onLineUpdate(result.line);
      setEditingLine(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update line item");
    }
  };

  const handleAutoSplit = (line: any) => {
    const validation = getStockValidation(line.id);
    if (validation?.suggestion?.type === "split") {
      setEditValues({
        approved_qty: validation.suggestion.approved_qty || 0,
        backorder_qty: validation.suggestion.backorder_qty || 0,
        notes: "Auto-split based on available stock",
      });
    }
  };

  const handleOverride = (line: any) => {
    setSelectedLine(line);
    setOverrideDialogOpen(true);
  };

  const handleOverrideSuccess = () => {
    setOverrideDialogOpen(false);
    setSelectedLine(null);
    onRefresh();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Line Items Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Requested
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Approved
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Backorder
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line) => {
                  const validation = getStockValidation(line.id);
                  const isEditing = editingLine === line.id;

                  return (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{line.sku}</td>
                      <td className="px-4 py-3 text-sm">{line.product_name}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        ${line.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {line.requested_qty}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {validation && stockStatusIcons[validation.stock_status]}
                          <span className="text-sm">{validation?.available_stock ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.approved_qty}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                approved_qty: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 text-right"
                            min="0"
                            max={line.requested_qty}
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {line.approved_qty || 0}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.backorder_qty}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                backorder_qty: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 text-right"
                            min="0"
                            max={line.requested_qty}
                          />
                        ) : (
                          <span className="text-sm">{line.backorder_qty || 0}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={lineStatusColors[line.line_status]}>
                          {line.line_status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveLine(line)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingLine(null)}
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                              {validation?.suggestion?.type === "split" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAutoSplit(line)}
                                  title="Auto-split"
                                >
                                  Split
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              {line.line_status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditLine(line)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  {validation && !validation.can_approve && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOverride(line)}
                                      className="text-orange-600"
                                    >
                                      Override
                                    </Button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {lines.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No line items found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <StockOverrideDialog
        open={overrideDialogOpen}
        onClose={() => setOverrideDialogOpen(false)}
        poId={poId}
        line={selectedLine}
        onSuccess={handleOverrideSuccess}
      />
    </>
  );
}

