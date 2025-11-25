"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { StockValidationResult } from "@/types/purchase-orders";

interface POApprovalSummaryProps {
  lines: any[];
  stockValidation: StockValidationResult[];
}

export function POApprovalSummary({
  lines,
  stockValidation,
}: POApprovalSummaryProps) {
  // Calculate totals
  const totalLines = lines.length;
  const totalRequested = lines.reduce((sum, line) => sum + (line.requested_qty || 0), 0);
  const totalApproved = lines.reduce((sum, line) => sum + (line.approved_qty || 0), 0);
  const totalBackordered = lines.reduce((sum, line) => sum + (line.backorder_qty || 0), 0);

  // Calculate value totals
  const totalRequestedValue = lines.reduce(
    (sum, line) => sum + (line.requested_qty || 0) * line.unit_price,
    0
  );
  const totalApprovedValue = lines.reduce(
    (sum, line) => sum + (line.approved_qty || 0) * line.unit_price,
    0
  );
  const totalBackorderedValue = lines.reduce(
    (sum, line) => sum + (line.backorder_qty || 0) * line.unit_price,
    0
  );

  // Calculate fulfillment percentage
  const fulfillmentPct =
    totalRequested > 0 ? Math.round((totalApproved / totalRequested) * 100) : 0;

  // Count line statuses
  const pendingCount = lines.filter((l) => l.line_status === "pending").length;
  const approvedCount = lines.filter(
    (l) => l.line_status === "approved" || l.line_status === "partially_approved"
  ).length;
  const backorderedCount = lines.filter((l) => l.line_status === "backordered").length;
  const rejectedCount = lines.filter((l) => l.line_status === "rejected").length;

  // Count stock warnings
  const stockWarnings = stockValidation.filter(
    (v) => v.stock_status === "partial" || v.stock_status === "insufficient"
  ).length;

  // Count overrides
  const overrideCount = lines.filter((l) => l.override_applied).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Approval Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Fulfillment Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Fulfillment Progress</span>
              <span className="text-sm font-bold text-teal-600">
                {fulfillmentPct}%
              </span>
            </div>
            <Progress value={fulfillmentPct} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {totalApproved} of {totalRequested} units approved
            </p>
          </div>

          {/* Quantity Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Requested</p>
              <p className="text-2xl font-bold text-blue-600">{totalRequested}</p>
              <p className="text-xs text-gray-500">
                ${totalRequestedValue.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{totalApproved}</p>
              <p className="text-xs text-gray-500">
                ${totalApprovedValue.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Backordered</p>
              <p className="text-2xl font-bold text-orange-600">
                {totalBackordered}
              </p>
              <p className="text-xs text-gray-500">
                ${totalBackorderedValue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Line Status Summary */}
          <div>
            <h4 className="text-sm font-medium mb-3">Line Item Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Pending:</span>
                <span className="font-medium">{pendingCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">Approved:</span>
                <span className="font-medium">{approvedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Backordered:</span>
                <span className="font-medium">{backorderedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm">Rejected:</span>
                <span className="font-medium">{rejectedCount}</span>
              </div>
            </div>
          </div>

          {/* Warnings & Overrides */}
          {(stockWarnings > 0 || overrideCount > 0) && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Alerts</h4>
              <div className="space-y-2">
                {stockWarnings > 0 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    <span>{stockWarnings} line(s) with stock warnings</span>
                  </div>
                )}
                {overrideCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    <span>{overrideCount} override(s) applied</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

